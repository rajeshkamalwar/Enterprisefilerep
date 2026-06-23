import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  listPermissions() {
    return this.prisma.permission.findMany({
      orderBy: { key: "asc" }
    });
  }

  listRoles() {
    return this.prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      },
      orderBy: { name: "asc" }
    });
  }

  async createRole(input: { name: string; code: string; description?: string }) {
    return this.prisma.role.create({
      data: {
        name: input.name,
        code: input.code.toUpperCase(),
        description: input.description
      }
    });
  }

  async assignPermission(roleId: string, permissionKey: string, actorUserId?: string) {
    const assignment = await this.prisma.rolePermission.upsert({
      where: {
        roleId_permissionKey: {
          roleId,
          permissionKey
        }
      },
      update: {},
      create: {
        roleId,
        permissionKey
      }
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        action: "PERMISSION_ASSIGNED",
        entityType: "role",
        entityId: roleId,
        entityName: permissionKey
      }
    });

    return assignment;
  }

  async rolePermissions(roleId: string) {
    const permissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
      orderBy: { permissionKey: "asc" }
    });

    return permissions.map((item) => item.permission);
  }

  async effectivePermissions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return {
        userId,
        permissions: [],
        sources: []
      };
    }

    const permissionSet = new Set<string>();
    const sources: Array<{ type: "role"; id: string; name: string }> = [];

    for (const link of user.roles) {
      sources.push({ type: "role", id: link.role.id, name: link.role.name });
      for (const permission of link.role.permissions) {
        permissionSet.add(permission.permissionKey);
      }
    }

    return {
      userId,
      permissions: [...permissionSet].sort(),
      sources
    };
  }

  async userHasPermission(userId: string, permissionKey: string) {
    const effective = await this.effectivePermissions(userId);
    return effective.permissions.includes(permissionKey);
  }
}
