import { Injectable } from "@nestjs/common";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { PrismaService } from "../database/prisma.service";

type StorageManifestEntry = {
  path: string;
  sizeBytes: number;
  modifiedAt: string;
};

@Injectable()
export class BackupService {
  private readonly backupRoot = path.resolve(process.env.BACKUP_LOCAL_ROOT ?? path.join(process.cwd(), "backups"));
  private readonly storageRoot = path.resolve(process.env.LOCAL_STORAGE_ROOT ?? path.join(process.cwd(), "storage"));

  constructor(private readonly prisma: PrismaService) {}

  async runManualBackup() {
    const startedAt = new Date();
    const backupId = startedAt.toISOString().replaceAll(":", "-").replaceAll(".", "-");
    const targetDir = path.join(this.backupRoot, backupId);

    await mkdir(targetDir, { recursive: true });

    const [users, departments, roles, permissions, folders, files, versions, auditLogs, emailTemplates, smtpSettings] = await Promise.all([
      this.prisma.user.findMany({ select: { id: true, email: true, fullName: true, status: true, departmentId: true, createdAt: true, updatedAt: true } }),
      this.prisma.department.findMany(),
      this.prisma.role.findMany(),
      this.prisma.permission.findMany(),
      this.prisma.folder.findMany(),
      this.prisma.repositoryFile.findMany(),
      this.prisma.fileVersion.findMany(),
      this.prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10_000 }),
      this.prisma.emailTemplate.findMany(),
      this.prisma.smtpSetting.findMany({ select: { id: true, host: true, port: true, username: true, secure: true, requireTls: true, fromEmail: true, fromName: true, replyTo: true, lastTestStatus: true, lastTestedAt: true, updatedAt: true } })
    ]);

    const metadata = {
      backupId,
      startedAt,
      completedAt: new Date(),
      database: {
        users,
        departments,
        roles,
        permissions,
        folders,
        files,
        versions,
        auditLogs,
        emailTemplates,
        smtpSettings
      },
      storage: {
        root: this.storageRoot,
        files: await this.storageManifest(this.storageRoot)
      }
    };

    await writeFile(path.join(targetDir, "metadata.json"), JSON.stringify(metadata, this.jsonReplacer, 2), "utf8");
    await writeFile(path.join(targetDir, "README.txt"), "Enterprise File Repository backup metadata snapshot. Pair this with the storage directory and PostgreSQL volume/dump for full restore.\n", "utf8");

    return {
      backupId,
      targetDir,
      completedAt: metadata.completedAt,
      counts: {
        users: users.length,
        departments: departments.length,
        folders: folders.length,
        files: files.length,
        versions: versions.length,
        auditLogs: auditLogs.length,
        storageFiles: metadata.storage.files.length
      }
    };
  }

  async latestBackups(limit = 10) {
    await mkdir(this.backupRoot, { recursive: true });
    const entries = await readdir(this.backupRoot, { withFileTypes: true });
    const backups = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const fullPath = path.join(this.backupRoot, entry.name);
          const info = await stat(fullPath);

          return {
            backupId: entry.name,
            path: fullPath,
            modifiedAt: info.mtime
          };
        })
    );

    return {
      data: backups
        .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime())
        .slice(0, Math.min(Math.max(limit, 1), 100))
    };
  }

  private async storageManifest(root: string, relative = ""): Promise<StorageManifestEntry[]> {
    try {
      const entries = await readdir(path.join(root, relative), { withFileTypes: true });
      const rows: StorageManifestEntry[] = [];

      for (const entry of entries) {
        const entryRelativePath = path.join(relative, entry.name);
        const fullPath = path.join(root, entryRelativePath);

        if (entry.isDirectory()) {
          rows.push(...await this.storageManifest(root, entryRelativePath));
        } else if (entry.isFile()) {
          const info = await stat(fullPath);
          rows.push({
            path: entryRelativePath.replaceAll(path.sep, "/"),
            sizeBytes: info.size,
            modifiedAt: info.mtime.toISOString()
          });
        }
      }

      return rows;
    } catch {
      return [];
    }
  }

  private jsonReplacer(_: string, value: unknown) {
    return typeof value === "bigint" ? value.toString() : value;
  }
}
