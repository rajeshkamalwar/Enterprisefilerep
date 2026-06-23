import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ResourceType, SubjectType } from "@prisma/client";
import { AuthenticatedUser } from "../auth/auth.guard";
import { PrismaService } from "../database/prisma.service";

type ResourceAccessInput = {
  user: AuthenticatedUser;
  permissionKey: string;
  resourceType: ResourceType;
  resourceId: string;
};

type ResourceScope = {
  resourceType: ResourceType;
  resourceId: string;
  departmentId: string | null;
  createdById: string | null;
  inheritedResources: Array<{
    resourceType: ResourceType;
    resourceId: string;
  }>;
  entityType: string;
  entityName: string | null;
};

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

  async updateRole(id: string, input: { name?: string; code?: string; description?: string | null }) {
    const existing = await this.prisma.role.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException("Role not found");
    }

    if (existing.isSystemRole && input.code && input.code.toUpperCase() !== existing.code) {
      throw new BadRequestException("System role code cannot be changed");
    }

    return this.prisma.role.update({
      where: { id },
      data: {
        name: input.name?.trim() || undefined,
        code: input.code?.trim().toUpperCase() || undefined,
        description: input.description === null ? null : input.description?.trim() || undefined
      },
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      }
    });
  }

  async deleteRole(id: string) {
    const existing = await this.prisma.role.findUnique({
      where: { id },
      include: {
        users: true,
        permissions: true
      }
    });

    if (!existing) {
      throw new NotFoundException("Role not found");
    }

    if (existing.isSystemRole) {
      throw new BadRequestException("System roles cannot be deleted");
    }

    if (existing.users.length > 0) {
      throw new ConflictException("Role cannot be deleted while users are assigned to it");
    }

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      this.prisma.role.delete({ where: { id } })
    ]);

    return { deleted: true };
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

  async removePermission(roleId: string, permissionKey: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });

    if (!role) {
      throw new NotFoundException("Role not found");
    }

    if (role.isSystemRole && role.code === "SUPER_ADMIN") {
      throw new BadRequestException("Super Admin permissions cannot be removed");
    }

    await this.prisma.rolePermission.deleteMany({
      where: {
        roleId,
        permissionKey
      }
    });

    return { removed: true };
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

  async assertResourceAccess(input: ResourceAccessInput) {
    const allowed = await this.canAccessResource(input);

    if (allowed) {
      return;
    }

    await this.auditDeniedAccess(input);
    throw new ForbiddenException("You do not have access to this resource");
  }

  async canAccessResource(input: ResourceAccessInput) {
    if (input.user.roles.includes("SUPER_ADMIN")) {
      return true;
    }

    const [hasBasePermission, userContext, resource] = await Promise.all([
      this.userHasPermission(input.user.id, input.permissionKey),
      this.userAccessContext(input.user.id),
      this.resourceScope(input.resourceType, input.resourceId)
    ]);

    if (!hasBasePermission || !userContext || !resource) {
      return false;
    }

    if (resource.createdById === input.user.id) {
      return true;
    }

    if (
      input.user.roles.includes("DEPARTMENT_ADMIN") &&
      resource.departmentId &&
      resource.departmentId === userContext.departmentId
    ) {
      return true;
    }

    const subjectFilters = [
      { subjectType: SubjectType.USER, subjectId: input.user.id },
      ...userContext.roleIds.map((roleId) => ({ subjectType: SubjectType.ROLE, subjectId: roleId })),
      ...userContext.groupIds.map((groupId) => ({ subjectType: SubjectType.GROUP, subjectId: groupId }))
    ];

    if (subjectFilters.length === 0) {
      return false;
    }

    const resourceFilters = [
      { resourceType: resource.resourceType, resourceId: resource.resourceId },
      ...resource.inheritedResources
    ];

    const matchingAce = await this.prisma.accessControlEntry.findFirst({
      where: {
        permissionKey: input.permissionKey,
        OR: subjectFilters.map((subject) => ({
          subjectType: subject.subjectType,
          subjectId: subject.subjectId,
          OR: resourceFilters.map((target) => ({
            resourceType: target.resourceType,
            resourceId: target.resourceId
          }))
        }))
      }
    });

    return Boolean(matchingAce);
  }

  private async userAccessContext(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true
              }
            }
          }
        },
        groupLinks: {
          select: {
            groupId: true
          }
        }
      }
    });

    if (!user || user.status !== "ACTIVE") {
      return null;
    }

    return {
      departmentId: user.departmentId,
      roleIds: user.roles.map((link) => link.role.id),
      groupIds: user.groupLinks.map((link) => link.groupId)
    };
  }

  private async resourceScope(resourceType: ResourceType, resourceId: string): Promise<ResourceScope | null> {
    if (resourceType === ResourceType.FOLDER) {
      const folder = await this.prisma.folder.findUnique({
        where: { id: resourceId },
        select: {
          id: true,
          name: true,
          parentId: true,
          departmentId: true,
          createdById: true,
          isDeleted: true
        }
      });

      if (!folder || folder.isDeleted) {
        return null;
      }

      return {
        resourceType,
        resourceId: folder.id,
        departmentId: folder.departmentId,
        createdById: folder.createdById,
        inheritedResources: await this.folderAncestorResources(folder.parentId),
        entityType: "folder",
        entityName: folder.name
      };
    }

    if (resourceType === ResourceType.FILE) {
      const file = await this.prisma.repositoryFile.findUnique({
        where: { id: resourceId },
        select: {
          id: true,
          originalName: true,
          folderId: true,
          departmentId: true,
          createdById: true,
          isDeleted: true
        }
      });

      if (!file || file.isDeleted) {
        return null;
      }

      return {
        resourceType,
        resourceId: file.id,
        departmentId: file.departmentId,
        createdById: file.createdById,
        inheritedResources: [
          { resourceType: ResourceType.FOLDER, resourceId: file.folderId },
          ...(await this.folderAncestorResources(file.folderId))
        ],
        entityType: "file",
        entityName: file.originalName
      };
    }

    return null;
  }

  private async folderAncestorResources(folderId: string | null) {
    const resources: Array<{ resourceType: ResourceType; resourceId: string }> = [];
    let currentId = folderId;

    while (currentId) {
      const folder = await this.prisma.folder.findUnique({
        where: { id: currentId },
        select: {
          id: true,
          parentId: true,
          isDeleted: true
        }
      });

      if (!folder || folder.isDeleted) {
        break;
      }

      resources.push({ resourceType: ResourceType.FOLDER, resourceId: folder.id });
      currentId = folder.parentId;
    }

    return resources;
  }

  private async auditDeniedAccess(input: ResourceAccessInput) {
    const resource = await this.resourceScope(input.resourceType, input.resourceId);

    await this.prisma.auditLog.create({
      data: {
        actorUserId: input.user.id,
        action: "ACCESS_DENIED",
        entityType: resource?.entityType ?? input.resourceType.toLowerCase(),
        entityId: input.resourceId,
        entityName: resource?.entityName ?? input.permissionKey,
        success: false,
        failureReason: `Missing resource access for ${input.permissionKey}`
      }
    });
  }
}
