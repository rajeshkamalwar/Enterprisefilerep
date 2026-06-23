import { Injectable } from "@nestjs/common";
import { ScanStatus } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { EmailQueueService } from "../queue/email-queue.service";
import { LocalStorageService } from "../storage/local-storage.service";
import { ClamavService } from "./clamav.service";

type ScanOneResult = {
  versionId: string;
  fileId: string;
  status: ScanStatus;
  message: string;
};

@Injectable()
export class ScanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailQueue: EmailQueueService,
    private readonly storage: LocalStorageService,
    private readonly clamav: ClamavService
  ) {}

  async scanPending(limit = 25) {
    const versions = await this.prisma.fileVersion.findMany({
      where: { scanStatus: { in: ["PENDING", "FAILED"] } },
      include: { file: true },
      orderBy: { uploadedAt: "asc" },
      take: limit
    });

    const results: ScanOneResult[] = [];

    for (const version of versions) {
      results.push(await this.scanVersion(version.id));
    }

    return {
      scanned: results.length,
      results
    };
  }

  async scanVersion(versionId: string): Promise<ScanOneResult> {
    const version = await this.prisma.fileVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: { file: true }
    });

    await this.prisma.fileVersion.update({
      where: { id: version.id },
      data: { scanStatus: "SCANNING" }
    });

    try {
      const absolutePath = await this.storage.getAbsolutePath(version.storagePath);
      const result = await this.clamav.scanFile(absolutePath);

      if (result.status === "clean") {
        const cleanStoragePath = await this.storage.moveToOriginals({
          storagePath: version.storagePath,
          storageKey: version.storageKey
        });

        await this.prisma.$transaction([
          this.prisma.fileVersion.update({
            where: { id: version.id },
            data: {
              scanStatus: "CLEAN",
              storagePath: cleanStoragePath
            }
          }),
          this.prisma.auditLog.create({
            data: {
              action: "FILE_SCAN_COMPLETED",
              entityType: "file_version",
              entityId: version.id,
              entityName: version.file.originalName,
              newValueJson: {
                scanStatus: "CLEAN",
                clamav: result.raw
              }
            }
          })
        ]);

        return {
          versionId: version.id,
          fileId: version.fileId,
          status: "CLEAN",
          message: "File marked clean and moved to originals storage"
        };
      }

      await this.prisma.$transaction([
        this.prisma.fileVersion.update({
          where: { id: version.id },
          data: { scanStatus: "INFECTED" }
        }),
        this.prisma.auditLog.create({
          data: {
            action: "FILE_SCAN_COMPLETED",
            entityType: "file_version",
            entityId: version.id,
            entityName: version.file.originalName,
            newValueJson: {
              scanStatus: "INFECTED",
              signature: result.signature,
              clamav: result.raw
            }
          }
        })
      ]);

      await this.notifyAdmins({
        templateKey: "file.scan.infected",
        variables: {
          fileName: version.file.originalName,
          fileId: version.fileId,
          versionId: version.id,
          signature: result.signature ?? "Unknown"
        }
      });

      return {
        versionId: version.id,
        fileId: version.fileId,
        status: "INFECTED",
        message: result.signature ? `Infected: ${result.signature}` : "Infected file detected"
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown scan error";

      await this.prisma.$transaction([
        this.prisma.fileVersion.update({
          where: { id: version.id },
          data: { scanStatus: "FAILED" }
        }),
        this.prisma.auditLog.create({
          data: {
            action: "FILE_SCAN_FAILED",
            entityType: "file_version",
            entityId: version.id,
            entityName: version.file.originalName,
            success: false,
            failureReason: message
          }
        })
      ]);

      await this.notifyAdmins({
        templateKey: "file.scan.failed",
        variables: {
          fileName: version.file.originalName,
          versionId: version.id,
          reason: message
        }
      });

      return {
        versionId: version.id,
        fileId: version.fileId,
        status: "FAILED",
        message
      };
    }
  }

  private async notifyAdmins(input: { templateKey: string; variables: Record<string, string> }) {
    const recipients = (process.env.SECURITY_ALERT_EMAILS ?? process.env.SMTP_REPLY_TO ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    for (const recipient of recipients) {
      try {
        await this.emailQueue.enqueue({
          to: recipient,
          templateKey: input.templateKey,
          variables: input.variables
        });
      } catch (error) {
        console.error("Failed to enqueue security notification", error);
      }
    }
  }
}
