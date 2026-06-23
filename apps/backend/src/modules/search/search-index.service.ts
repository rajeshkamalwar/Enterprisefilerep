import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

type MeiliTaskResponse = {
  taskUid?: number;
  indexUid?: string;
  status?: string;
};

@Injectable()
export class SearchIndexService {
  private readonly host = (process.env.MEILISEARCH_HOST ?? "").replace(/\/$/, "");
  private readonly apiKey = process.env.MEILISEARCH_API_KEY;
  private readonly indexName = process.env.MEILISEARCH_FILES_INDEX ?? "repository_files";

  constructor(private readonly prisma: PrismaService) {}

  async reindexFiles() {
    if (!this.host) {
      return {
        indexed: 0,
        skipped: true,
        reason: "MEILISEARCH_HOST is not configured"
      };
    }

    const files = await this.prisma.repositoryFile.findMany({
      where: { isDeleted: false },
      include: {
        currentVersion: true,
        folder: {
          select: {
            name: true,
            pathCache: true
          }
        },
        department: {
          select: {
            name: true,
            code: true
          }
        },
        createdBy: {
          select: {
            fullName: true,
            email: true
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    const documents = files.map((file) => ({
      id: file.id,
      originalName: file.originalName,
      extension: file.extension,
      mimeType: file.mimeType,
      classification: file.classification,
      description: file.description,
      folderId: file.folderId,
      folderName: file.folder.name,
      folderPath: file.folder.pathCache,
      departmentId: file.departmentId,
      departmentName: file.department?.name ?? null,
      ownerName: file.createdBy.fullName,
      ownerEmail: file.createdBy.email,
      scanStatus: file.currentVersion?.scanStatus ?? null,
      previewStatus: file.currentVersion?.previewStatus ?? null,
      sizeBytes: file.currentVersion?.sizeBytes?.toString() ?? "0",
      updatedAt: file.updatedAt.toISOString(),
      createdAt: file.createdAt.toISOString()
    }));

    const task = await this.meiliFetch<MeiliTaskResponse>(
      `/indexes/${encodeURIComponent(this.indexName)}/documents?primaryKey=id`,
      {
        method: "POST",
        body: JSON.stringify(documents)
      }
    );

    return {
      indexed: documents.length,
      indexName: this.indexName,
      task
    };
  }

  private async meiliFetch<T>(path: string, init: RequestInit) {
    const response = await fetch(`${this.host}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        ...init.headers
      }
    });

    if (!response.ok) {
      throw new Error(`Meilisearch request failed: ${response.status} ${await response.text()}`);
    }

    return response.json() as Promise<T>;
  }
}
