import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AccessRequestStatus, ResourceType } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";

type CreateAccessRequestInput = {
  resourceType: ResourceType;
  resourceId: string;
  permissionKey: string;
  businessJustification: string;
};

type ListAccessRequestsInput = {
  status?: AccessRequestStatus;
  page?: number;
  pageSize?: number;
};

@Injectable()
export class AccessRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(input: ListAccessRequestsInput = {}) {
    const page = input.page && input.page > 0 ? input.page : 1;
    const pageSize = input.pageSize && input.pageSize > 0 ? Math.min(input.pageSize, 100) : 50;
    const where = input.status ? { status: input.status } : {};

    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.accessRequest.findMany({
        where,
        include: this.includePeople(),
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.accessRequest.count({ where })
    ]);

    return {
      data: data.map((request) => this.serialize(request)),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize)
      }
    };
  }

  async listMine(requesterId: string, input: ListAccessRequestsInput = {}) {
    const page = input.page && input.page > 0 ? input.page : 1;
    const pageSize = input.pageSize && input.pageSize > 0 ? Math.min(input.pageSize, 100) : 50;
    const where = {
      requesterId,
      ...(input.status ? { status: input.status } : {})
    };

    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.accessRequest.findMany({
        where,
        include: this.includePeople(),
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.accessRequest.count({ where })
    ]);

    return {
      data: data.map((request) => this.serialize(request)),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize)
      }
    };
  }

  async create(input: CreateAccessRequestInput, requesterId: string) {
    const permissionKey = input.permissionKey.trim();
    const resourceId = input.resourceId.trim();
    const businessJustification = input.businessJustification.trim();

    if (!permissionKey || !resourceId || !businessJustification) {
      throw new BadRequestException("resourceId, permissionKey, and businessJustification are required");
    }

    await this.ensurePermissionExists(permissionKey);
    await this.ensureResourceExists(input.resourceType, resourceId);

    const existing = await this.prisma.accessRequest.findFirst({
      where: {
        requesterId,
        resourceType: input.resourceType,
        resourceId,
        permissionKey,
        status: "PENDING"
      }
    });

    if (existing) {
      throw new ConflictException("A pending access request already exists for this resource and permission");
    }

    const request = await this.prisma.$transaction(async (tx) => {
      const created = await tx.accessRequest.create({
        data: {
          requesterId,
          resourceType: input.resourceType,
          resourceId,
          permissionKey,
          businessJustification
        },
        include: this.includePeople()
      });

      await tx.auditLog.create({
        data: {
          actorUserId: requesterId,
          action: "ACCESS_REQUEST_CREATED",
          entityType: "access_request",
          entityId: created.id,
          entityName: `${input.resourceType}:${resourceId}`,
          newValueJson: {
            resourceType: input.resourceType,
            resourceId,
            permissionKey
          }
        }
      });

      return created;
    });

    return this.serialize(request);
  }

  async approve(id: string, reviewerId: string, decisionReason?: string) {
    const request = await this.findPending(id);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.accessControlEntry.upsert({
        where: {
          subjectType_subjectId_resourceType_resourceId_permissionKey: {
            subjectType: "USER",
            subjectId: request.requesterId,
            resourceType: request.resourceType,
            resourceId: request.resourceId,
            permissionKey: request.permissionKey
          }
        },
        update: {},
        create: {
          subjectType: "USER",
          subjectId: request.requesterId,
          resourceType: request.resourceType,
          resourceId: request.resourceId,
          permissionKey: request.permissionKey,
          createdBy: reviewerId
        }
      });

      const approved = await tx.accessRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          reviewerId,
          decisionReason: decisionReason?.trim() || null,
          decidedAt: new Date()
        },
        include: this.includePeople()
      });

      await tx.auditLog.create({
        data: {
          actorUserId: reviewerId,
          action: "ACCESS_REQUEST_APPROVED",
          entityType: "access_request",
          entityId: id,
          entityName: `${request.resourceType}:${request.resourceId}`,
          newValueJson: {
            permissionKey: request.permissionKey,
            requesterId: request.requesterId,
            decisionReason: decisionReason ?? null
          }
        }
      });

      return approved;
    });

    return this.serialize(updated);
  }

  async reject(id: string, reviewerId: string, decisionReason?: string) {
    const request = await this.findPending(id);

    const updated = await this.prisma.$transaction(async (tx) => {
      const rejected = await tx.accessRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          reviewerId,
          decisionReason: decisionReason?.trim() || null,
          decidedAt: new Date()
        },
        include: this.includePeople()
      });

      await tx.auditLog.create({
        data: {
          actorUserId: reviewerId,
          action: "ACCESS_REQUEST_REJECTED",
          entityType: "access_request",
          entityId: id,
          entityName: `${request.resourceType}:${request.resourceId}`,
          newValueJson: {
            permissionKey: request.permissionKey,
            requesterId: request.requesterId,
            decisionReason: decisionReason ?? null
          }
        }
      });

      return rejected;
    });

    return this.serialize(updated);
  }

  private async findPending(id: string) {
    const request = await this.prisma.accessRequest.findUnique({
      where: { id }
    });

    if (!request) {
      throw new NotFoundException("Access request not found");
    }

    if (request.status !== "PENDING") {
      throw new ConflictException("Access request has already been decided");
    }

    return request;
  }

  private async ensurePermissionExists(permissionKey: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { key: permissionKey }
    });

    if (!permission) {
      throw new BadRequestException(`Unknown permission: ${permissionKey}`);
    }
  }

  private async ensureResourceExists(resourceType: ResourceType, resourceId: string) {
    if (resourceType === "GLOBAL") {
      return;
    }

    if (resourceType === "FOLDER") {
      const folder = await this.prisma.folder.findUnique({
        where: { id: resourceId }
      });

      if (!folder || folder.isDeleted) {
        throw new BadRequestException("Requested folder does not exist");
      }

      return;
    }

    if (resourceType === "FILE") {
      const file = await this.prisma.repositoryFile.findUnique({
        where: { id: resourceId }
      });

      if (!file || file.isDeleted) {
        throw new BadRequestException("Requested file does not exist");
      }

      return;
    }

    if (resourceType === "DEPARTMENT") {
      const department = await this.prisma.department.findUnique({
        where: { id: resourceId }
      });

      if (!department) {
        throw new BadRequestException("Requested department does not exist");
      }

      return;
    }

    if (resourceType === "PROJECT") {
      throw new BadRequestException("Project resources are not available until the project module is implemented");
    }
  }

  private includePeople() {
    return {
      requester: {
        select: {
          id: true,
          email: true,
          fullName: true
        }
      },
      reviewer: {
        select: {
          id: true,
          email: true,
          fullName: true
        }
      }
    };
  }

  private serialize(request: {
    id: string;
    requesterId: string;
    resourceType: ResourceType;
    resourceId: string;
    permissionKey: string;
    businessJustification: string;
    status: AccessRequestStatus;
    reviewerId: string | null;
    decisionReason: string | null;
    decidedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    requester?: { id: string; email: string; fullName: string } | null;
    reviewer?: { id: string; email: string; fullName: string } | null;
  }) {
    return {
      id: request.id,
      requesterId: request.requesterId,
      requester: request.requester ?? null,
      resourceType: request.resourceType,
      resourceId: request.resourceId,
      permissionKey: request.permissionKey,
      businessJustification: request.businessJustification,
      status: request.status,
      reviewerId: request.reviewerId,
      reviewer: request.reviewer ?? null,
      decisionReason: request.decisionReason,
      decidedAt: request.decidedAt,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt
    };
  }
}
