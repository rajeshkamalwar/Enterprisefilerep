import { Injectable } from "@nestjs/common";
import { FileClassification, ScanStatus, UserStatus } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { EmailQueueService } from "../queue/email-queue.service";
import { ScanQueueService } from "../queue/scan-queue.service";
import { MailerService } from "../smtp/mailer.service";

type StorageDepartmentRow = {
  departmentId: string | null;
  department: string;
  departmentCode: string | null;
  usedBytes: bigint;
  fileCount: number;
  quotaBytes: bigint | null;
};

@Injectable()
export class OperationalMetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scanQueue: ScanQueueService,
    private readonly emailQueue: EmailQueueService,
    private readonly mailer: MailerService
  ) {}

  async dashboard() {
    const [
      userCounts,
      totalDepartments,
      totalFolders,
      fileCounts,
      scanCounts,
      pendingAccessRequests,
      storageUsedBytes,
      recentActivity,
      scanQueue,
      emailQueue
    ] = await Promise.all([
      this.userCounts(),
      this.prisma.department.count(),
      this.prisma.folder.count({ where: { isDeleted: false } }),
      this.fileCounts(),
      this.scanStatusCounts(),
      this.prisma.accessRequest.count({ where: { status: "PENDING" } }),
      this.currentStorageUsedBytes(),
      this.recentActivity(8),
      this.scanQueue.getCounts(),
      this.emailQueue.getCounts()
    ]);

    const smtp = this.mailer.getConfigurationStatus();
    const failedJobs = scanQueue.failed + emailQueue.failed;

    return {
      totalUsers: userCounts.total,
      activeUsers: userCounts.byStatus.ACTIVE ?? 0,
      suspendedUsers: userCounts.byStatus.SUSPENDED ?? 0,
      deactivatedUsers: userCounts.byStatus.DEACTIVATED ?? 0,
      totalDepartments,
      totalFolders,
      totalFiles: fileCounts.total,
      deletedFiles: fileCounts.deleted,
      storageUsedBytes: this.toNumber(storageUsedBytes),
      pendingAccessRequests,
      pendingScans: scanCounts.PENDING ?? 0,
      scanningFiles: scanCounts.SCANNING ?? 0,
      cleanFiles: scanCounts.CLEAN ?? 0,
      infectedFiles: scanCounts.INFECTED ?? 0,
      failedScans: scanCounts.FAILED ?? 0,
      failedJobs,
      backupStatus: this.backupStatus(),
      smtpStatus: smtp.configured ? "configured" : "not_configured",
      queues: {
        scan: scanQueue,
        email: emailQueue
      },
      recentActivity
    };
  }

  async storageSummary() {
    const [usedBytes, totalFiles, departments, classificationBreakdown, scanStatusBreakdown] = await Promise.all([
      this.currentStorageUsedBytes(),
      this.prisma.repositoryFile.count({ where: { isDeleted: false } }),
      this.storageByDepartment(),
      this.classificationBreakdown(),
      this.scanStatusBreakdown()
    ]);

    const quotaBytes = this.storageQuotaBytes();

    return {
      driver: process.env.STORAGE_DRIVER ?? "local",
      usedBytes: this.toNumber(usedBytes),
      quotaBytes: this.toNumber(quotaBytes),
      quotaUsedPercent: quotaBytes > 0n ? Number(((usedBytes * 10_000n) / quotaBytes)) / 100 : null,
      warningThresholdPercent: Number(process.env.STORAGE_WARNING_THRESHOLD_PERCENT ?? 80),
      totalFiles,
      departments,
      classificationBreakdown,
      scanStatusBreakdown
    };
  }

  async storageReport() {
    const summary = await this.storageSummary();

    return {
      generatedAt: new Date().toISOString(),
      data: summary.departments,
      summary: {
        driver: summary.driver,
        usedBytes: summary.usedBytes,
        quotaBytes: summary.quotaBytes,
        quotaUsedPercent: summary.quotaUsedPercent,
        totalFiles: summary.totalFiles
      },
      classificationBreakdown: summary.classificationBreakdown,
      scanStatusBreakdown: summary.scanStatusBreakdown
    };
  }

  private async userCounts() {
    const grouped = await this.prisma.user.groupBy({
      by: ["status"],
      _count: { _all: true }
    });

    const byStatus = this.zeroedRecord<UserStatus>(["ACTIVE", "SUSPENDED", "DEACTIVATED"]);

    for (const row of grouped) {
      byStatus[row.status] = row._count._all;
    }

    return {
      total: Object.values(byStatus).reduce((sum, value) => sum + value, 0),
      byStatus
    };
  }

  private async fileCounts() {
    const [total, deleted] = await Promise.all([
      this.prisma.repositoryFile.count({ where: { isDeleted: false } }),
      this.prisma.repositoryFile.count({ where: { isDeleted: true } })
    ]);

    return {
      total,
      deleted
    };
  }

  private async scanStatusCounts() {
    const grouped = await this.prisma.fileVersion.groupBy({
      by: ["scanStatus"],
      where: {
        currentForFile: {
          isDeleted: false
        }
      },
      _count: { _all: true }
    });

    const counts = this.zeroedRecord<ScanStatus>(["PENDING", "SCANNING", "CLEAN", "INFECTED", "FAILED"]);

    for (const row of grouped) {
      counts[row.scanStatus] = row._count._all;
    }

    return counts;
  }

  private async currentStorageUsedBytes() {
    const result = await this.prisma.fileVersion.aggregate({
      where: {
        currentForFile: {
          isDeleted: false
        }
      },
      _sum: {
        sizeBytes: true
      }
    });

    return result._sum.sizeBytes ?? 0n;
  }

  private async storageByDepartment() {
    const rows = await this.prisma.repositoryFile.findMany({
      where: { isDeleted: false },
      select: {
        departmentId: true,
        department: {
          select: {
            name: true,
            code: true,
            storageQuotaBytes: true
          }
        },
        currentVersion: {
          select: {
            sizeBytes: true
          }
        }
      }
    });

    const grouped = new Map<string, StorageDepartmentRow>();

    for (const row of rows) {
      const key = row.departmentId ?? "unassigned";
      const existing = grouped.get(key) ?? {
        departmentId: row.departmentId,
        department: row.department?.name ?? "Unassigned",
        departmentCode: row.department?.code ?? null,
        usedBytes: 0n,
        fileCount: 0,
        quotaBytes: row.department?.storageQuotaBytes ?? null
      };

      existing.fileCount += 1;
      existing.usedBytes += row.currentVersion?.sizeBytes ?? 0n;
      grouped.set(key, existing);
    }

    return [...grouped.values()]
      .map((row) => ({
        departmentId: row.departmentId,
        department: row.department,
        departmentCode: row.departmentCode,
        usedBytes: this.toNumber(row.usedBytes),
        usedGb: this.bytesToGb(row.usedBytes),
        files: row.fileCount,
        quotaBytes: row.quotaBytes ? this.toNumber(row.quotaBytes) : null,
        quotaUsedPercent: row.quotaBytes && row.quotaBytes > 0n
          ? Number(((row.usedBytes * 10_000n) / row.quotaBytes)) / 100
          : null
      }))
      .sort((a, b) => b.usedBytes - a.usedBytes);
  }

  private async classificationBreakdown() {
    const grouped = await this.prisma.repositoryFile.groupBy({
      by: ["classification"],
      where: { isDeleted: false },
      _count: { _all: true }
    });

    const counts = this.zeroedRecord<FileClassification>(["PUBLIC_INTERNAL", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"]);

    for (const row of grouped) {
      counts[row.classification] = row._count._all;
    }

    return counts;
  }

  private async scanStatusBreakdown() {
    return this.scanStatusCounts();
  }

  private async recentActivity(limit: number) {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        actor: {
          select: {
            fullName: true,
            email: true
          }
        }
      }
    });

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      actor: log.actor?.fullName ?? log.actor?.email ?? "System",
      entityType: log.entityType,
      entityId: log.entityId,
      entityName: log.entityName,
      success: log.success,
      failureReason: log.failureReason,
      createdAt: log.createdAt
    }));
  }

  private storageQuotaBytes() {
    const configured = process.env.STORAGE_QUOTA_BYTES;

    if (!configured) {
      return 0n;
    }

    try {
      return BigInt(configured);
    } catch {
      return 0n;
    }
  }

  private backupStatus() {
    const destination = process.env.BACKUP_DESTINATION;

    if (!destination || destination === "s3-compatible-or-remote-path") {
      return "not_configured";
    }

    return "configured";
  }

  private zeroedRecord<T extends string>(keys: T[]) {
    return Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;
  }

  private toNumber(value: bigint) {
    return Number(value);
  }

  private bytesToGb(value: bigint) {
    return Number(value) / 1024 / 1024 / 1024;
  }
}
