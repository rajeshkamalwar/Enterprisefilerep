import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuthenticatedUser } from "../auth/auth.guard";
import { PrismaService } from "../database/prisma.service";

type ListDepartmentsInput = {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

type CreateDepartmentInput = {
  name: string;
  code: string;
  description?: string | null;
  storageQuotaBytes?: string | number | null;
  status?: string;
  actor: AuthenticatedUser;
};

type UpdateDepartmentInput = {
  name?: string;
  code?: string;
  description?: string | null;
  storageQuotaBytes?: string | number | null;
  status?: string;
  actor: AuthenticatedUser;
};

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(input: ListDepartmentsInput = {}) {
    const page = input.page && input.page > 0 ? input.page : 1;
    const pageSize = input.pageSize && input.pageSize > 0 ? Math.min(input.pageSize, 100) : 25;
    const where: Prisma.DepartmentWhereInput = {};

    if (input.status?.trim()) {
      where.status = input.status.trim().toUpperCase();
    }

    const query = input.q?.trim();
    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { code: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } }
      ];
    }

    const [departments, totalItems, storageRows] = await Promise.all([
      this.prisma.department.findMany({
        where,
        include: {
          _count: {
            select: {
              users: true,
              folders: true,
              files: true
            }
          }
        },
        orderBy: { name: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.department.count({ where }),
      this.departmentStorageRows()
    ]);

    const storageByDepartment = new Map(storageRows.map((row) => [row.departmentId, row]));

    return {
      data: departments.map((department) => this.serializeDepartment(department, storageByDepartment.get(department.id))),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize)
      }
    };
  }

  async create(input: CreateDepartmentInput) {
    const name = input.name.trim();
    const code = this.normalizeCode(input.code);

    if (!name || !code) {
      throw new BadRequestException("name and code are required");
    }

    await this.ensureUniqueDepartment({ name, code });

    const quota = this.parseQuota(input.storageQuotaBytes);
    const created = await this.prisma.$transaction(async (tx) => {
      const department = await tx.department.create({
        data: {
          name,
          code,
          description: input.description?.trim() || null,
          storageQuotaBytes: quota,
          status: input.status?.trim().toUpperCase() || "ACTIVE"
        },
        include: {
          _count: {
            select: {
              users: true,
              folders: true,
              files: true
            }
          }
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: input.actor.id,
          action: "DEPARTMENT_CREATED",
          entityType: "department",
          entityId: department.id,
          entityName: department.name,
          newValueJson: {
            name: department.name,
            code: department.code,
            status: department.status,
            storageQuotaBytes: department.storageQuotaBytes?.toString() ?? null
          }
        }
      });

      return department;
    });

    return this.serializeDepartment(created);
  }

  async update(id: string, input: UpdateDepartmentInput) {
    const existing = await this.prisma.department.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new NotFoundException("Department not found");
    }

    const name = input.name === undefined ? undefined : input.name.trim();
    const code = input.code === undefined ? undefined : this.normalizeCode(input.code);

    if (name === "") {
      throw new BadRequestException("Department name cannot be blank");
    }

    if (code === "") {
      throw new BadRequestException("Department code cannot be blank");
    }

    if (name || code) {
      await this.ensureUniqueDepartment({ name: name ?? existing.name, code: code ?? existing.code, excludeId: id });
    }

    const quota = input.storageQuotaBytes === undefined ? undefined : this.parseQuota(input.storageQuotaBytes);
    const updated = await this.prisma.$transaction(async (tx) => {
      const department = await tx.department.update({
        where: { id },
        data: {
          name,
          code,
          description: input.description === undefined ? undefined : input.description?.trim() || null,
          storageQuotaBytes: quota,
          status: input.status?.trim().toUpperCase()
        },
        include: {
          _count: {
            select: {
              users: true,
              folders: true,
              files: true
            }
          }
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: input.actor.id,
          action: "DEPARTMENT_UPDATED",
          entityType: "department",
          entityId: department.id,
          entityName: department.name,
          oldValueJson: {
            name: existing.name,
            code: existing.code,
            status: existing.status,
            storageQuotaBytes: existing.storageQuotaBytes?.toString() ?? null
          },
          newValueJson: {
            name: department.name,
            code: department.code,
            status: department.status,
            storageQuotaBytes: department.storageQuotaBytes?.toString() ?? null
          }
        }
      });

      return department;
    });

    const storage = await this.departmentStorageRows(id);
    return this.serializeDepartment(updated, storage[0]);
  }

  async delete(id: string, actor: AuthenticatedUser) {
    const existing = await this.prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            groups: true,
            folders: true,
            files: true
          }
        }
      }
    });

    if (!existing) {
      throw new NotFoundException("Department not found");
    }

    const usageCount = existing._count.users + existing._count.groups + existing._count.folders + existing._count.files;
    if (usageCount > 0) {
      throw new ConflictException("Department has users, groups, folders, or files. Disable it instead of deleting.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.department.delete({
        where: { id }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "DEPARTMENT_DELETED",
          entityType: "department",
          entityId: existing.id,
          entityName: existing.name,
          oldValueJson: {
            name: existing.name,
            code: existing.code,
            status: existing.status,
            storageQuotaBytes: existing.storageQuotaBytes?.toString() ?? null
          }
        }
      });
    });

    return { deleted: true, id };
  }

  private async ensureUniqueDepartment(input: { name: string; code: string; excludeId?: string }) {
    const existing = await this.prisma.department.findFirst({
      where: {
        OR: [{ name: input.name }, { code: input.code }],
        ...(input.excludeId ? { id: { not: input.excludeId } } : {})
      }
    });

    if (existing) {
      throw new ConflictException("Department name or code already exists");
    }
  }

  private normalizeCode(code: string) {
    return code.trim().toUpperCase().replaceAll(" ", "_").replaceAll("-", "_");
  }

  private parseQuota(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const normalized = typeof value === "number" ? Math.trunc(value).toString() : value.trim();

    if (!/^\d+$/.test(normalized)) {
      throw new BadRequestException("storageQuotaBytes must be a non-negative integer");
    }

    return BigInt(normalized);
  }

  private async departmentStorageRows(departmentId?: string) {
    const files = await this.prisma.repositoryFile.findMany({
      where: {
        isDeleted: false,
        ...(departmentId ? { departmentId } : {})
      },
      select: {
        departmentId: true,
        currentVersion: {
          select: {
            sizeBytes: true
          }
        }
      }
    });

    const rows = new Map<string, { departmentId: string; usedBytes: bigint; fileCount: number }>();

    for (const file of files) {
      if (!file.departmentId) {
        continue;
      }

      const existing = rows.get(file.departmentId) ?? {
        departmentId: file.departmentId,
        usedBytes: 0n,
        fileCount: 0
      };

      existing.usedBytes += file.currentVersion?.sizeBytes ?? 0n;
      existing.fileCount += 1;
      rows.set(file.departmentId, existing);
    }

    return [...rows.values()];
  }

  private serializeDepartment(
    department: {
      id: string;
      name: string;
      code: string;
      description: string | null;
      storageQuotaBytes: bigint | null;
      status: string;
      createdAt: Date;
      _count?: {
        users: number;
        folders: number;
        files: number;
      };
    },
    storage?: {
      usedBytes: bigint;
      fileCount: number;
    }
  ) {
    const usedBytes = storage?.usedBytes ?? 0n;
    const quota = department.storageQuotaBytes;

    return {
      id: department.id,
      name: department.name,
      code: department.code,
      description: department.description,
      storageQuotaBytes: quota ? quota.toString() : null,
      storageUsedBytes: usedBytes.toString(),
      quotaUsedPercent: quota && quota > 0n ? Number(((usedBytes * 10_000n) / quota)) / 100 : null,
      status: department.status,
      userCount: department._count?.users ?? 0,
      folderCount: department._count?.folders ?? 0,
      fileCount: storage?.fileCount ?? department._count?.files ?? 0,
      createdAt: department.createdAt
    };
  }
}
