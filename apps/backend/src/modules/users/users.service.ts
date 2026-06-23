import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, UserStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { AuthenticatedUser } from "../auth/auth.guard";
import { PrismaService } from "../database/prisma.service";

type ListUsersInput = {
  q?: string;
  status?: UserStatus;
  departmentId?: string;
  page?: number;
  pageSize?: number;
  actor: AuthenticatedUser;
};

type CreateUserInput = {
  email: string;
  fullName: string;
  password: string;
  employeeCode?: string;
  country?: string;
  timezone?: string;
  departmentId?: string;
  roleIds?: string[];
  actor: AuthenticatedUser;
};

type UpdateUserInput = {
  fullName?: string;
  employeeCode?: string | null;
  country?: string | null;
  timezone?: string;
  departmentId?: string | null;
  status?: UserStatus;
  roleIds?: string[];
  actor: AuthenticatedUser;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(input: ListUsersInput) {
    const page = input.page && input.page > 0 ? input.page : 1;
    const pageSize = input.pageSize && input.pageSize > 0 ? Math.min(input.pageSize, 100) : 25;
    const actorContext = await this.actorContext(input.actor);
    const where: Prisma.UserWhereInput = {};

    if (actorContext.departmentRestricted) {
      where.departmentId = actorContext.departmentId;
    } else if (input.departmentId) {
      where.departmentId = input.departmentId;
    }

    if (input.status) {
      where.status = input.status;
    }

    const query = input.q?.trim();
    if (query) {
      where.OR = [
        { email: { contains: query, mode: "insensitive" } },
        { fullName: { contains: query, mode: "insensitive" } },
        { employeeCode: { contains: query, mode: "insensitive" } }
      ];
    }

    const [users, totalItems] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: this.userInclude(),
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.user.count({ where })
    ]);

    return {
      data: users.map((user) => this.serializeUser(user)),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize)
      }
    };
  }

  async options(actor: AuthenticatedUser) {
    const actorContext = await this.actorContext(actor);
    const [departments, roles] = await Promise.all([
      this.prisma.department.findMany({
        where: actorContext.departmentRestricted ? { id: actorContext.departmentId ?? "__none__" } : undefined,
        orderBy: { name: "asc" }
      }),
      this.prisma.role.findMany({
        where: actorContext.departmentRestricted ? { code: { not: "SUPER_ADMIN" } } : undefined,
        orderBy: { name: "asc" }
      })
    ]);

    return {
      departments: departments.map((department) => ({
        id: department.id,
        name: department.name,
        code: department.code
      })),
      roles: roles.map((role) => ({
        id: role.id,
        code: role.code,
        name: role.name
      }))
    };
  }

  async create(input: CreateUserInput) {
    const email = input.email.trim().toLowerCase();
    const fullName = input.fullName.trim();
    const password = input.password.trim();
    const actorContext = await this.actorContext(input.actor);
    const departmentId = input.departmentId?.trim() || actorContext.departmentId;
    const roleIds = [...new Set(input.roleIds ?? [])];

    if (!email || !fullName || !password) {
      throw new BadRequestException("email, fullName, and password are required");
    }

    if (password.length < 10) {
      throw new BadRequestException("Password must be at least 10 characters");
    }

    await this.ensureEmailAvailable(email);
    await this.ensureDepartmentAllowed(departmentId, actorContext);
    await this.ensureRolesAllowed(roleIds, actorContext);

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          fullName,
          passwordHash: await bcrypt.hash(password, 12),
          employeeCode: input.employeeCode?.trim() || null,
          country: input.country?.trim() || null,
          timezone: input.timezone?.trim() || "Asia/Calcutta",
          departmentId,
          roles: {
            create: roleIds.map((roleId) => ({ roleId }))
          }
        },
        include: this.userInclude()
      });

      await tx.auditLog.create({
        data: {
          actorUserId: input.actor.id,
          action: "USER_CREATED",
          entityType: "user",
          entityId: user.id,
          entityName: user.email,
          newValueJson: {
            email: user.email,
            departmentId: user.departmentId,
            roleIds
          }
        }
      });

      return user;
    });

    return this.serializeUser(created);
  }

  async update(id: string, input: UpdateUserInput) {
    const actorContext = await this.actorContext(input.actor);
    const existing = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!existing) {
      throw new NotFoundException("User not found");
    }

    this.ensureUserAllowed(existing.departmentId, actorContext);

    const departmentId = input.departmentId === undefined ? undefined : input.departmentId?.trim() || null;
    if (departmentId !== undefined) {
      await this.ensureDepartmentAllowed(departmentId, actorContext);
    }

    if (input.roleIds) {
      await this.ensureRolesAllowed(input.roleIds, actorContext);
    }

    if (!input.actor.roles.includes("SUPER_ADMIN") && existing.roles.some((link) => link.role.code === "SUPER_ADMIN")) {
      throw new ForbiddenException("Department admins cannot update super admins");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: {
          fullName: input.fullName?.trim(),
          employeeCode: input.employeeCode === undefined ? undefined : input.employeeCode?.trim() || null,
          country: input.country === undefined ? undefined : input.country?.trim() || null,
          timezone: input.timezone?.trim(),
          departmentId,
          status: input.status
        },
        include: this.userInclude()
      });

      if (input.roleIds) {
        const roleIds = [...new Set(input.roleIds)];
        await tx.userRole.deleteMany({ where: { userId: id } });
        if (roleIds.length > 0) {
          await tx.userRole.createMany({
            data: roleIds.map((roleId) => ({ userId: id, roleId })),
            skipDuplicates: true
          });
        }
      }

      await tx.auditLog.create({
        data: {
          actorUserId: input.actor.id,
          action: "USER_UPDATED",
          entityType: "user",
          entityId: id,
          entityName: user.email,
          newValueJson: {
            status: input.status,
            departmentId,
            roleIds: input.roleIds
          }
        }
      });

      return tx.user.findUniqueOrThrow({
        where: { id },
        include: this.userInclude()
      });
    });

    return this.serializeUser(updated);
  }

  async delete(id: string, actor: AuthenticatedUser) {
    if (id === actor.id) {
      throw new BadRequestException("You cannot delete your own signed-in account");
    }

    const actorContext = await this.actorContext(actor);
    const existing = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!existing) {
      throw new NotFoundException("User not found");
    }

    this.ensureUserAllowed(existing.departmentId, actorContext);

    if (!actor.roles.includes("SUPER_ADMIN") && existing.roles.some((link) => link.role.code === "SUPER_ADMIN")) {
      throw new ForbiddenException("Department admins cannot delete super admins");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.userSession.updateMany({
        where: {
          userId: id,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });

      const user = await tx.user.update({
        where: { id },
        data: {
          status: UserStatus.DEACTIVATED
        },
        include: this.userInclude()
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "USER_DELETED",
          entityType: "user",
          entityId: id,
          entityName: existing.email,
          oldValueJson: {
            status: existing.status,
            email: existing.email,
            departmentId: existing.departmentId
          },
          newValueJson: {
            status: UserStatus.DEACTIVATED
          }
        }
      });

      return user;
    });

    return this.serializeUser(updated);
  }

  private async actorContext(actor: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: {
        departmentId: true
      }
    });

    if (!user) {
      throw new ForbiddenException("Authenticated user context is missing");
    }

    return {
      departmentId: user.departmentId,
      departmentRestricted: !actor.roles.includes("SUPER_ADMIN")
    };
  }

  private async ensureEmailAvailable(email: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      throw new ConflictException("A user with this email already exists");
    }
  }

  private async ensureDepartmentAllowed(departmentId: string | null | undefined, actorContext: Awaited<ReturnType<UsersService["actorContext"]>>) {
    if (!departmentId) {
      if (actorContext.departmentRestricted) {
        throw new BadRequestException("Department is required for department-scoped admins");
      }
      return;
    }

    if (actorContext.departmentRestricted && departmentId !== actorContext.departmentId) {
      throw new ForbiddenException("Department admins can only manage users in their own department");
    }

    const department = await this.prisma.department.findUnique({
      where: { id: departmentId }
    });

    if (!department) {
      throw new BadRequestException("Department not found");
    }
  }

  private ensureUserAllowed(departmentId: string | null, actorContext: Awaited<ReturnType<UsersService["actorContext"]>>) {
    if (actorContext.departmentRestricted && departmentId !== actorContext.departmentId) {
      throw new ForbiddenException("Department admins can only manage users in their own department");
    }
  }

  private async ensureRolesAllowed(roleIds: string[], actorContext: Awaited<ReturnType<UsersService["actorContext"]>>) {
    if (roleIds.length === 0) {
      return;
    }

    const roles = await this.prisma.role.findMany({
      where: { id: { in: roleIds } }
    });

    if (roles.length !== roleIds.length) {
      throw new BadRequestException("One or more roles were not found");
    }

    if (actorContext.departmentRestricted && roles.some((role) => role.code === "SUPER_ADMIN")) {
      throw new ForbiddenException("Department admins cannot assign super admin");
    }
  }

  private userInclude() {
    return {
      department: {
        select: {
          id: true,
          name: true,
          code: true
        }
      },
      roles: {
        include: {
          role: {
            select: {
              id: true,
              code: true,
              name: true
            }
          }
        },
        orderBy: {
          role: {
            name: "asc" as const
          }
        }
      }
    };
  }

  private serializeUser(user: {
    id: string;
    email: string;
    fullName: string;
    employeeCode: string | null;
    country: string | null;
    timezone: string;
    status: UserStatus;
    departmentId: string | null;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date | null;
    department?: {
      id: string;
      name: string;
      code: string;
    } | null;
    roles?: Array<{
      role: {
        id: string;
        code: string;
        name: string;
      };
    }>;
  }) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      employeeCode: user.employeeCode,
      country: user.country,
      timezone: user.timezone,
      status: user.status,
      departmentId: user.departmentId,
      department: user.department ?? null,
      roles: user.roles?.map((link) => link.role) ?? [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt
    };
  }
}
