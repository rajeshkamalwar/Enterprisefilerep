import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { FileClassification, Prisma, ScanStatus } from "@prisma/client";
import type { MultipartFile } from "@fastify/multipart";
import { PrismaService } from "../database/prisma.service";
import { ScanQueueService } from "../queue/scan-queue.service";
import { LocalStorageService } from "../storage/local-storage.service";

type UploadFields = {
  folderId: string;
  classification?: FileClassification;
  description?: string;
};

type ListFilesInput = {
  q?: string;
  folderId?: string;
  classification?: FileClassification;
  scanStatus?: ScanStatus;
  extension?: string;
  page?: number;
  pageSize?: number;
};

type BreadcrumbFolder = {
  id: string;
  name: string;
  parentId: string | null;
  isDeleted: boolean;
};

@Injectable()
export class RepositoryService {
  private readonly blockedExtensions = new Set([".exe", ".bat", ".cmd", ".msi", ".scr", ".vbs", ".ps1", ".sh"]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scanQueue: ScanQueueService,
    private readonly storage: LocalStorageService
  ) {}

  async listFolders(input: { parentId?: string | null } = {}) {
    const folders = await this.prisma.folder.findMany({
      where: {
        parentId: input.parentId ?? null,
        isDeleted: false
      },
      include: {
        _count: {
          select: {
            children: {
              where: { isDeleted: false }
            },
            files: {
              where: { isDeleted: false }
            }
          }
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      },
      orderBy: { name: "asc" }
    });

    return {
      data: folders.map((folder) => this.serializeFolderSummary(folder))
    };
  }

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
        department: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        children: {
          where: { isDeleted: false },
          include: {
            _count: {
              select: {
                children: {
                  where: { isDeleted: false }
                },
                files: {
                  where: { isDeleted: false }
                }
              }
            },
            department: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          },
          orderBy: { name: "asc" }
        },
        files: {
          where: { isDeleted: false },
          include: {
            currentVersion: true,
            createdBy: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            },
            department: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          },
          orderBy: { updatedAt: "desc" }
        }
      }
    });

    if (!folder || folder.isDeleted) {
      throw new NotFoundException("Folder not found");
    }

    return {
      folder: this.serializeFolder(folder),
      breadcrumbs: await this.folderBreadcrumbs(folder.id),
      children: folder.children.map((child) => this.serializeFolderSummary(child)),
      files: folder.files.map((file) => this.serializeFile(file))
    };
  }

  async listRecentFiles(limit = 20) {
    const take = Math.min(Math.max(limit, 1), 100);
    const files = await this.prisma.repositoryFile.findMany({
      where: { isDeleted: false },
      include: this.fileListInclude(),
      orderBy: { updatedAt: "desc" },
      take
    });

    return {
      data: files.map((file) => this.serializeFile(file))
    };
  }

  async searchFiles(input: ListFilesInput) {
    const page = input.page && input.page > 0 ? input.page : 1;
    const pageSize = input.pageSize && input.pageSize > 0 ? Math.min(input.pageSize, 100) : 25;
    const where: Prisma.RepositoryFileWhereInput = {
      isDeleted: false
    };

    if (input.folderId) {
      where.folderId = input.folderId;
    }

    if (input.classification) {
      where.classification = input.classification;
    }

    if (input.extension) {
      const normalizedExtension = input.extension.startsWith(".")
        ? input.extension.toLowerCase()
        : `.${input.extension.toLowerCase()}`;
      where.extension = normalizedExtension;
    }

    if (input.scanStatus) {
      where.currentVersion = {
        scanStatus: input.scanStatus
      };
    }

    const query = input.q?.trim();
    if (query) {
      where.OR = [
        { originalName: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { extension: { contains: query.toLowerCase(), mode: "insensitive" } }
      ];
    }

    const [files, totalItems] = await this.prisma.$transaction([
      this.prisma.repositoryFile.findMany({
        where,
        include: this.fileListInclude(),
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.repositoryFile.count({ where })
    ]);

    return {
      data: files.map((file) => this.serializeFile(file)),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize)
      }
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

    const serialized = this.serializeFile(created);

    try {
      if (created.currentVersion) {
        await this.scanQueue.enqueueFileScan({
          fileId: created.id,
          versionId: created.currentVersion.id
        });
      }

      return {
        ...serialized,
        scanQueued: true
      };
    } catch (error) {
      return {
        ...serialized,
        scanQueued: false,
        scanQueueError: error instanceof Error ? error.message : "Unable to enqueue scan job"
      };
    }
  }

  async getFile(id: string) {
    const file = await this.prisma.repositoryFile.findUnique({
      where: { id },
      include: {
        currentVersion: true,
        versions: {
          orderBy: { versionNumber: "desc" }
        },
        folder: {
          select: {
            id: true,
            name: true,
            pathCache: true
          }
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true
          }
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

  private fileListInclude() {
    return {
      currentVersion: true,
      folder: {
        select: {
          id: true,
          name: true,
          pathCache: true
        }
      },
      createdBy: {
        select: {
          id: true,
          fullName: true,
          email: true
        }
      },
      department: {
        select: {
          id: true,
          name: true,
          code: true
        }
      }
    };
  }

  private async folderBreadcrumbs(folderId: string) {
    const breadcrumbs: Array<{ id: string; name: string; parentId: string | null }> = [];
    let currentId: string | null = folderId;

    while (currentId) {
      const folder: BreadcrumbFolder | null = await this.prisma.folder.findUnique({
        where: { id: currentId },
        select: {
          id: true,
          name: true,
          parentId: true,
          isDeleted: true
        }
      });

      if (!folder || folder.isDeleted) {
        break;
      }

      breadcrumbs.unshift({
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId
      });
      currentId = folder.parentId;
    }

    return breadcrumbs;
  }

  private serializeFolder(folder: {
    id: string;
    parentId: string | null;
    name: string;
    pathCache: string | null;
    departmentId: string | null;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
    department?: {
      id: string;
      name: string;
      code: string;
    } | null;
  }) {
    return {
      id: folder.id,
      parentId: folder.parentId,
      name: folder.name,
      pathCache: folder.pathCache,
      departmentId: folder.departmentId,
      department: folder.department ?? null,
      createdById: folder.createdById,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt
    };
  }

  private serializeFolderSummary(folder: {
    id: string;
    parentId: string | null;
    name: string;
    pathCache: string | null;
    departmentId: string | null;
    createdAt: Date;
    updatedAt: Date;
    department?: {
      id: string;
      name: string;
      code: string;
    } | null;
    _count?: {
      children: number;
      files: number;
    };
  }) {
    return {
      id: folder.id,
      parentId: folder.parentId,
      name: folder.name,
      pathCache: folder.pathCache,
      departmentId: folder.departmentId,
      department: folder.department ?? null,
      childFolderCount: folder._count?.children ?? 0,
      fileCount: folder._count?.files ?? 0,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt
    };
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
    folder?: {
      id: string;
      name: string;
      pathCache: string | null;
    };
    createdBy?: {
      id: string;
      fullName: string;
      email: string;
    };
    department?: {
      id: string;
      name: string;
      code: string;
    } | null;
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
