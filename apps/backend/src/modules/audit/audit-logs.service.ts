import { Injectable } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";

export type AuditLogQuery = {
  page?: string;
  pageSize?: string;
  action?: string;
  actorId?: string;
  entityType?: string;
  success?: string;
  q?: string;
  from?: string;
  to?: string;
};

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AuditLogQuery) {
    const page = this.positiveInt(query.page, 1, 1, 10_000);
    const pageSize = this.positiveInt(query.pageSize, 20, 1, 100);
    const where = this.buildWhere(query);

    const [total, logs] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              fullName: true
            }
          }
        }
      })
    ]);

    return {
      data: logs.map((log) => ({
        id: log.id,
        actorUserId: log.actorUserId,
        actor: log.actor
          ? {
              id: log.actor.id,
              email: log.actor.email,
              fullName: log.actor.fullName
            }
          : null,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        entityName: log.entityName,
        success: log.success,
        failureReason: log.failureReason,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt
      })),
      meta: {
        page,
        pageSize,
        total,
        pageCount: Math.max(1, Math.ceil(total / pageSize))
      }
    };
  }

  actions() {
    return Object.values(AuditAction);
  }

  private buildWhere(query: AuditLogQuery): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = {};

    if (query.action && this.isAuditAction(query.action)) {
      where.action = query.action;
    }

    if (query.actorId) {
      where.actorUserId = query.actorId;
    }

    if (query.entityType) {
      where.entityType = { equals: query.entityType, mode: "insensitive" };
    }

    if (query.success === "true") {
      where.success = true;
    }

    if (query.success === "false") {
      where.success = false;
    }

    const createdAt: Prisma.DateTimeFilter = {};
    const from = this.safeDate(query.from);
    const to = this.safeDate(query.to);

    if (from) {
      createdAt.gte = from;
    }

    if (to) {
      createdAt.lte = to;
    }

    if (createdAt.gte || createdAt.lte) {
      where.createdAt = createdAt;
    }

    const q = query.q?.trim();

    if (q) {
      where.OR = [
        { entityName: { contains: q, mode: "insensitive" } },
        { entityType: { contains: q, mode: "insensitive" } },
        { entityId: { contains: q, mode: "insensitive" } },
        { failureReason: { contains: q, mode: "insensitive" } },
        { actor: { fullName: { contains: q, mode: "insensitive" } } },
        { actor: { email: { contains: q, mode: "insensitive" } } }
      ];
    }

    return where;
  }

  private positiveInt(value: string | undefined, fallback: number, min: number, max: number) {
    const parsed = Number(value);

    if (!Number.isInteger(parsed)) {
      return fallback;
    }

    return Math.min(Math.max(parsed, min), max);
  }

  private safeDate(value: string | undefined) {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private isAuditAction(value: string): value is AuditAction {
    return Object.values(AuditAction).includes(value as AuditAction);
  }
}
