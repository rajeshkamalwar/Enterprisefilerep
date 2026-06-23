import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { FileClassification, ScanStatus } from "@prisma/client";
import type { MultipartFile } from "@fastify/multipart";
import { PrismaService } from "../database/prisma.service";
import { LocalStorageService } from "../storage/local-storage.service";

type UploadFields = {
  folderId: string;
  classification?: FileClassification;
  description?: string;
};

@Injectable()
export class RepositoryService {
  private readonly blockedExtensions = new Set([".exe", ".bat", ".cmd", ".msi", ".scr", ".vbs", ".ps1", ".sh"]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStorageService
  ) {}

  async createFolder(input: { name: string; parentId?: string; departmentId?: string; actorUserId: string }) {
    const folderName = input.name.trim();

    if (!folderName) {
      throw new BadRequestException("Folder name is required");
    }

    const parent = input.parentId
      ? await this.prisma.folder.findUnique({ where: { id: input.parentId } })
      : null;

    if (input.parentId && !parent) {
      throw new NotFoundException("Parent folder not found");
    }

    const folder = await this.prisma.folder.create({
      data: {
        name: input.name.trim(),
        parentId: input.parentId,
        departmentId: input.departmentId ?? parent?.departmentId,
        createdById: input.actorUserId,
        pathCache: parent?.pathCache ? `${parent.pathCache}/${folderName}` : folderName
      }
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: "FOLDER_CREATED",
        entityType: "folder",
        entityId: folder.id,
        entityName: folder.name
      }
    });

    return folder;
  }

  async getFolder(id: string) {
    const folder = await this.prisma.folder.findUnique({
      where: { id },
      include: {
        children: {
          where: { isDeleted: false },
          orderBy: { name: "asc" }
        },
        files: {
          where: { isDeleted: false },
          include: { currentVersion: true },
          orderBy: { updatedAt: "desc" }
        }
      }
    });

    if (!folder || folder.isDeleted) {
      throw new NotFoundException("Folder not found");
    }

    return {
      ...folder,
      files: folder.files.map((file) => this.serializeFile(file))
    };
  }

  async upload(file: MultipartFile, fields: UploadFields, actorUserId: string) {
    const extension = this.extensionFromName(file.filename);

    if (extension && this.blockedExtensions.has(extension)) {
      throw new BadRequestException(`File type is blocked: ${extension}`);
    }

    const folder = await this.prisma.folder.findUnique({
      where: { id: fields.folderId }
    });

    if (!folder || folder.isDeleted) {
      throw new NotFoundException("Folder not found");
    }

    const stored = await this.storage.saveToQuarantine({
      stream: file.file,
      originalName: file.filename
    });

    const created = await this.prisma.$transaction(async (tx) => {
      const repositoryFile = await tx.repositoryFile.create({
        data: {
          folderId: folder.id,
          originalName: file.filename,
          extension,
          mimeType: file.mimetype,
          classification: fields.classification ?? "INTERNAL",
          description: fields.description,
          departmentId: folder.departmentId,
          createdById: actorUserId
        }
      });

      const version = await tx.fileVersion.create({
        data: {
          fileId: repositoryFile.id,
          versionNumber: 1,
          storageKey: stored.storageKey,
          storagePath: stored.storagePath,
          sizeBytes: stored.sizeBytes,
          checksumSha256: stored.checksumSha256,
          mimeType: file.mimetype,
          scanStatus: "PENDING",
          previewStatus: "PENDING",
          uploadedById: actorUserId
        }
      });

      const updatedFile = await tx.repositoryFile.update({
        where: { id: repositoryFile.id },
        data: { currentVersionId: version.id },
        include: { currentVersion: true }
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          action: "FILE_UPLOADED",
          entityType: "file",
          entityId: repositoryFile.id,
          entityName: repositoryFile.originalName,
          newValueJson: {
            versionId: version.id,
            scanStatus: version.scanStatus,
            sizeBytes: stored.sizeBytes.toString()
          }
        }
      });

      return updatedFile;
    });

    return this.serializeFile(created);
  }

  async getFile(id: string) {
    const file = await this.prisma.repositoryFile.findUnique({
      where: { id },
      include: {
        currentVersion: true,
        versions: {
          orderBy: { versionNumber: "desc" }
        }
      }
    });

    if (!file || file.isDeleted) {
      throw new NotFoundException("File not found");
    }

    return this.serializeFile(file);
  }

  async prepareDownload(id: string, actorUserId: string) {
    const file = await this.prisma.repositoryFile.findUnique({
      where: { id },
      include: { currentVersion: true }
    });

    if (!file || file.isDeleted || !file.currentVersion) {
      throw new NotFoundException("File not found");
    }

    if (file.currentVersion.scanStatus !== ScanStatus.CLEAN) {
      throw new ConflictException("File is not available for download until antivirus scanning marks it clean");
    }

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        action: "FILE_DOWNLOADED",
        entityType: "file",
        entityId: file.id,
        entityName: file.originalName
      }
    });

    return {
      fileName: file.originalName,
      mimeType: file.currentVersion.mimeType ?? "application/octet-stream",
      stream: await this.storage.openReadStream(file.currentVersion.storagePath)
    };
  }

  private extensionFromName(name: string) {
    const index = name.lastIndexOf(".");
    return index >= 0 ? name.slice(index).toLowerCase() : null;
  }

  private serializeFile(file: {
    id: string;
    folderId: string;
    originalName: string;
    extension: string | null;
    mimeType: string | null;
    classification: FileClassification;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    currentVersion?: {
      id: string;
      versionNumber: number;
      sizeBytes: bigint;
      checksumSha256: string;
      scanStatus: ScanStatus;
      previewStatus: string;
      uploadedAt: Date;
    } | null;
  }) {
    return {
      ...file,
      currentVersion: file.currentVersion
        ? {
            ...file.currentVersion,
            sizeBytes: file.currentVersion.sizeBytes.toString()
          }
        : null
    };
  }
}
