import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { FileClassification, Prisma, ResourceType, ScanStatus } from "@prisma/client";
import type { MultipartFile } from "@fastify/multipart";
import { AuthenticatedUser } from "../auth/auth.guard";
import { PrismaService } from "../database/prisma.service";
import { ScanQueueService } from "../queue/scan-queue.service";
import { RbacService } from "../rbac/rbac.service";
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
    private readonly rbac: RbacService,
    private readonly storage: LocalStorageService
  ) {}

  async listFolders(input: { parentId?: string | null; user: AuthenticatedUser }) {
    if (input.parentId) {
      await this.rbac.assertResourceAccess({
        user: input.user,
        permissionKey: "folder.read",
        resourceType: ResourceType.FOLDER,
        resourceId: input.parentId
      });
    }

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
    const accessibleFolders = await this.filterAccessibleFolders(folders, input.user, "folder.read");

    return {
      data: accessibleFolders.map((folder) => this.serializeFolderSummary(folder))
    };
  }

  async createFolder(input: {
    name: string;
    parentId?: string;
    departmentId?: string;
    actorUser: AuthenticatedUser;
  }) {
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

    if (parent) {
      await this.rbac.assertResourceAccess({
        user: input.actorUser,
        permissionKey: "folder.create",
        resourceType: ResourceType.FOLDER,
        resourceId: parent.id
      });
    }

    const folder = await this.prisma.folder.create({
      data: {
        name: input.name.trim(),
        parentId: input.parentId,
        departmentId: input.departmentId ?? parent?.departmentId,
        createdById: input.actorUser.id,
        pathCache: parent?.pathCache ? `${parent.pathCache}/${folderName}` : folderName
      }
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: input.actorUser.id,
        action: "FOLDER_CREATED",
        entityType: "folder",
        entityId: folder.id,
        entityName: folder.name
      }
    });

    return folder;
  }

  async updateFolder(input: { id: string; name: string; actorUser: AuthenticatedUser }) {
    const folderName = input.name.trim();

    if (!folderName) {
      throw new BadRequestException("Folder name is required");
    }

    const existing = await this.prisma.folder.findUnique({
      where: { id: input.id }
    });

    if (!existing || existing.isDeleted) {
      throw new NotFoundException("Folder not found");
    }

    await this.rbac.assertResourceAccess({
      user: input.actorUser,
      permissionKey: "folder.update",
      resourceType: ResourceType.FOLDER,
      resourceId: existing.id
    });

    const duplicate = await this.prisma.folder.findFirst({
      where: {
        id: { not: existing.id },
        parentId: existing.parentId,
        name: folderName,
        isDeleted: false
      }
    });

    if (duplicate) {
      throw new ConflictException("A folder with this name already exists in the same location");
    }

    return this.prisma.$transaction(async (tx) => {
      const parent = existing.parentId
        ? await tx.folder.findUnique({
            where: { id: existing.parentId },
            select: {
              pathCache: true
            }
          })
        : null;

      const pathCache = parent?.pathCache ? `${parent.pathCache}/${folderName}` : folderName;
      const updated = await tx.folder.update({
        where: { id: existing.id },
        data: {
          name: folderName,
          pathCache,
          updatedById: input.actorUser.id
        },
        include: {
          department: {
            select: {
              id: true,
              name: true,
              code: true
            }
          }
        }
      });

      await this.rebuildChildPathCaches(tx, updated.id, pathCache);

      await tx.auditLog.create({
        data: {
          actorUserId: input.actorUser.id,
          action: "FOLDER_UPDATED",
          entityType: "folder",
          entityId: updated.id,
          entityName: updated.name,
          oldValueJson: {
            name: existing.name,
            pathCache: existing.pathCache
          },
          newValueJson: {
            name: updated.name,
            pathCache: updated.pathCache
          }
        }
      });

      return this.serializeFolder(updated);
    });
  }

  async getFolder(id: string, user: AuthenticatedUser) {
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

    await this.rbac.assertResourceAccess({
      user,
      permissionKey: "folder.read",
      resourceType: ResourceType.FOLDER,
      resourceId: folder.id
    });

    const [accessibleChildren, accessibleFiles] = await Promise.all([
      this.filterAccessibleFolders(folder.children, user, "folder.read"),
      this.filterAccessibleFiles(folder.files, user, "file.read")
    ]);

    return {
      folder: this.serializeFolder(folder),
      breadcrumbs: await this.folderBreadcrumbs(folder.id),
      children: accessibleChildren.map((child) => this.serializeFolderSummary(child)),
      files: accessibleFiles.map((file) => this.serializeFile(file))
    };
  }

  async listRecentFiles(user: AuthenticatedUser, limit = 20) {
    const take = Math.min(Math.max(limit, 1), 100);
    const files = await this.prisma.repositoryFile.findMany({
      where: { isDeleted: false },
      include: this.fileListInclude(),
      orderBy: { updatedAt: "desc" },
      take
    });
    const accessibleFiles = await this.filterAccessibleFiles(files, user, "file.read");

    return {
      data: accessibleFiles.map((file) => this.serializeFile(file))
    };
  }

  async searchFiles(input: ListFilesInput & { user: AuthenticatedUser }) {
    const page = input.page && input.page > 0 ? input.page : 1;
    const pageSize = input.pageSize && input.pageSize > 0 ? Math.min(input.pageSize, 100) : 25;
    const where: Prisma.RepositoryFileWhereInput = {
      isDeleted: false
    };

    if (input.folderId) {
      await this.rbac.assertResourceAccess({
        user: input.user,
        permissionKey: "folder.read",
        resourceType: ResourceType.FOLDER,
        resourceId: input.folderId
      });
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

    const files = await this.prisma.repositoryFile.findMany({
      where,
      include: this.fileListInclude(),
      orderBy: { updatedAt: "desc" }
    });
    const accessibleFiles = await this.filterAccessibleFiles(files, input.user, "file.read");
    const totalItems = accessibleFiles.length;
    const pageFiles = accessibleFiles.slice((page - 1) * pageSize, page * pageSize);

    return {
      data: pageFiles.map((file) => this.serializeFile(file)),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize)
      }
    };
  }

  async upload(file: MultipartFile, fields: UploadFields, actorUser: AuthenticatedUser) {
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

    await this.rbac.assertResourceAccess({
      user: actorUser,
      permissionKey: "file.create",
      resourceType: ResourceType.FOLDER,
      resourceId: folder.id
    });

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
          createdById: actorUser.id
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
          uploadedById: actorUser.id
        }
      });

      const updatedFile = await tx.repositoryFile.update({
        where: { id: repositoryFile.id },
        data: { currentVersionId: version.id },
        include: { currentVersion: true }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actorUser.id,
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

  async getFile(id: string, user: AuthenticatedUser) {
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

    await this.rbac.assertResourceAccess({
      user,
      permissionKey: "file.read",
      resourceType: ResourceType.FILE,
      resourceId: file.id
    });

    return this.serializeFile(file);
  }

  async prepareDownload(id: string, user: AuthenticatedUser) {
    const file = await this.prisma.repositoryFile.findUnique({
      where: { id },
      include: { currentVersion: true }
    });

    if (!file || file.isDeleted || !file.currentVersion) {
      throw new NotFoundException("File not found");
    }

    await this.rbac.assertResourceAccess({
      user,
      permissionKey: "file.download",
      resourceType: ResourceType.FILE,
      resourceId: file.id
    });

    if (file.currentVersion.scanStatus !== ScanStatus.CLEAN) {
      throw new ConflictException("File is not available for download until antivirus scanning marks it clean");
    }

    await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
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

  async preparePreview(id: string, user: AuthenticatedUser) {
    const file = await this.prisma.repositoryFile.findUnique({
      where: { id },
      include: { currentVersion: true }
    });

    if (!file || file.isDeleted || !file.currentVersion) {
      throw new NotFoundException("File not found");
    }

    await this.rbac.assertResourceAccess({
      user,
      permissionKey: "file.preview",
      resourceType: ResourceType.FILE,
      resourceId: file.id
    });

    if (file.currentVersion.scanStatus !== ScanStatus.CLEAN) {
      throw new ConflictException("File is not available for preview until antivirus scanning marks it clean");
    }

    const mimeType = file.currentVersion.mimeType ?? file.mimeType ?? "application/octet-stream";
    const previewable = mimeType.startsWith("image/") ||
      mimeType.startsWith("text/") ||
      mimeType === "application/pdf" ||
      mimeType === "application/json";

    if (!previewable) {
      throw new ConflictException("Preview is not supported for this file type");
    }

    await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "FILE_PREVIEWED",
        entityType: "file",
        entityId: file.id,
        entityName: file.originalName
      }
    });

    return {
      fileName: file.originalName,
      mimeType,
      stream: await this.storage.openReadStream(file.currentVersion.storagePath)
    };
  }

  async restoreVersion(input: { fileId: string; versionId: string; user: AuthenticatedUser }) {
    const file = await this.prisma.repositoryFile.findUnique({
      where: { id: input.fileId },
      include: {
        currentVersion: true,
        versions: {
          where: { id: input.versionId }
        }
      }
    });

    if (!file || file.isDeleted) {
      throw new NotFoundException("File not found");
    }

    const version = file.versions[0];

    if (!version) {
      throw new NotFoundException("File version not found");
    }

    await this.rbac.assertResourceAccess({
      user: input.user,
      permissionKey: "file.version.restore",
      resourceType: ResourceType.FILE,
      resourceId: file.id
    });

    const updated = await this.prisma.repositoryFile.update({
      where: { id: file.id },
      data: {
        currentVersionId: version.id
      },
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

    await this.prisma.auditLog.create({
      data: {
        actorUserId: input.user.id,
        action: "FILE_VERSION_RESTORED",
        entityType: "file",
        entityId: file.id,
        entityName: file.originalName,
        oldValueJson: {
          currentVersionId: file.currentVersionId
        },
        newValueJson: {
          currentVersionId: version.id,
          versionNumber: version.versionNumber
        }
      }
    });

    return this.serializeFile(updated);
  }

  async deleteFile(id: string, user: AuthenticatedUser) {
    const file = await this.prisma.repositoryFile.findUnique({ where: { id } });

    if (!file || file.isDeleted) {
      throw new NotFoundException("File not found");
    }

    await this.rbac.assertResourceAccess({
      user,
      permissionKey: "file.delete",
      resourceType: ResourceType.FILE,
      resourceId: file.id
    });

    const updated = await this.prisma.repositoryFile.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById: user.id
      }
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "FILE_DELETED",
        entityType: "file",
        entityId: file.id,
        entityName: file.originalName
      }
    });

    return this.serializeFile(updated);
  }

  async restoreFile(id: string, user: AuthenticatedUser) {
    const file = await this.prisma.repositoryFile.findUnique({ where: { id } });

    if (!file || !file.isDeleted) {
      throw new NotFoundException("Deleted file not found");
    }

    const updated = await this.prisma.repositoryFile.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedById: null
      },
      include: this.fileListInclude()
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "FILE_RESTORED",
        entityType: "file",
        entityId: file.id,
        entityName: file.originalName
      }
    });

    return this.serializeFile(updated);
  }

  async permanentlyDeleteFile(id: string, user: AuthenticatedUser) {
    const file = await this.prisma.repositoryFile.findUnique({ where: { id } });

    if (!file || !file.isDeleted) {
      throw new NotFoundException("Deleted file not found");
    }

    await this.prisma.repositoryFile.update({
      where: { id },
      data: { currentVersionId: null }
    });
    await this.prisma.repositoryFile.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "FILE_PERMANENTLY_DELETED",
        entityType: "file",
        entityId: file.id,
        entityName: file.originalName
      }
    });

    return { deleted: true, id };
  }

  async listFileRecycleBin(user: AuthenticatedUser, limit = 50) {
    const files = await this.prisma.repositoryFile.findMany({
      where: { isDeleted: true },
      include: this.fileListInclude(),
      orderBy: { deletedAt: "desc" },
      take: Math.min(Math.max(limit, 1), 100)
    });

    return {
      data: files.map((file) => this.serializeFile(file))
    };
  }

  async deleteFolder(id: string, user: AuthenticatedUser) {
    const folder = await this.prisma.folder.findUnique({ where: { id } });

    if (!folder || folder.isDeleted) {
      throw new NotFoundException("Folder not found");
    }

    await this.rbac.assertResourceAccess({
      user,
      permissionKey: "folder.delete",
      resourceType: ResourceType.FOLDER,
      resourceId: folder.id
    });

    const updated = await this.prisma.folder.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById: user.id
      }
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "FOLDER_DELETED",
        entityType: "folder",
        entityId: folder.id,
        entityName: folder.name
      }
    });

    return this.serializeFolder(updated);
  }

  async restoreFolder(id: string, user: AuthenticatedUser) {
    const folder = await this.prisma.folder.findUnique({ where: { id } });

    if (!folder || !folder.isDeleted) {
      throw new NotFoundException("Deleted folder not found");
    }

    const updated = await this.prisma.folder.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedById: null
      }
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "FOLDER_RESTORED",
        entityType: "folder",
        entityId: folder.id,
        entityName: folder.name
      }
    });

    return this.serializeFolder(updated);
  }

  async permanentlyDeleteFolder(id: string, user: AuthenticatedUser) {
    const folder = await this.prisma.folder.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            children: true,
            files: true
          }
        }
      }
    });

    if (!folder || !folder.isDeleted) {
      throw new NotFoundException("Deleted folder not found");
    }

    if (folder._count.children > 0 || folder._count.files > 0) {
      throw new ConflictException("Folder must be empty before permanent deletion");
    }

    await this.prisma.folder.delete({ where: { id } });
    await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "FOLDER_PERMANENTLY_DELETED",
        entityType: "folder",
        entityId: folder.id,
        entityName: folder.name
      }
    });

    return { deleted: true, id };
  }

  async listFolderRecycleBin(user: AuthenticatedUser, limit = 50) {
    const folders = await this.prisma.folder.findMany({
      where: { isDeleted: true },
      include: {
        _count: {
          select: {
            children: true,
            files: true
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
      orderBy: { deletedAt: "desc" },
      take: Math.min(Math.max(limit, 1), 100)
    });

    return {
      data: folders.map((folder) => this.serializeFolderSummary(folder))
    };
  }

  private async filterAccessibleFolders<T extends { id: string }>(
    folders: T[],
    user: AuthenticatedUser,
    permissionKey: string
  ) {
    const decisions = await Promise.all(
      folders.map(async (folder) => ({
        folder,
        allowed: await this.rbac.canAccessResource({
          user,
          permissionKey,
          resourceType: ResourceType.FOLDER,
          resourceId: folder.id
        })
      }))
    );

    return decisions.filter((decision) => decision.allowed).map((decision) => decision.folder);
  }

  private async filterAccessibleFiles<T extends { id: string }>(files: T[], user: AuthenticatedUser, permissionKey: string) {
    const decisions = await Promise.all(
      files.map(async (file) => ({
        file,
        allowed: await this.rbac.canAccessResource({
          user,
          permissionKey,
          resourceType: ResourceType.FILE,
          resourceId: file.id
        })
      }))
    );

    return decisions.filter((decision) => decision.allowed).map((decision) => decision.file);
  }

  private async rebuildChildPathCaches(
    tx: Prisma.TransactionClient,
    parentId: string,
    parentPath: string
  ): Promise<void> {
    const children = await tx.folder.findMany({
      where: {
        parentId,
        isDeleted: false
      },
      select: {
        id: true,
        name: true
      }
    });

    for (const child of children) {
      const childPath = `${parentPath}/${child.name}`;
      await tx.folder.update({
        where: { id: child.id },
        data: { pathCache: childPath }
      });
      await this.rebuildChildPathCaches(tx, child.id, childPath);
    }
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
    versions?: Array<{
      id: string;
      versionNumber: number;
      sizeBytes: bigint;
      checksumSha256: string;
      scanStatus: ScanStatus;
      previewStatus: string;
      uploadedAt: Date;
    }>;
  }) {
    return {
      ...file,
      currentVersion: file.currentVersion
        ? {
            ...file.currentVersion,
            sizeBytes: file.currentVersion.sizeBytes.toString()
          }
        : null,
      versions: file.versions?.map((version) => ({
        ...version,
        sizeBytes: version.sizeBytes.toString()
      }))
    };
  }
}
