import { BadRequestException, Controller, Get, Param, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { MultipartFile } from "@fastify/multipart";
import type { FastifyReply } from "fastify";
import { FileClassification } from "@prisma/client";
import { AuthenticatedUser, AuthGuard, RequestWithUser } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RepositoryService } from "./repository.service";

type MultipartRequest = RequestWithUser & {
  file: () => Promise<MultipartFile | undefined>;
};

@UseGuards(AuthGuard, PermissionsGuard)
@Controller("files")
export class FilesController {
  constructor(private readonly repository: RepositoryService) {}

  @Post("upload")
  @RequirePermissions("file.create")
  async upload(@Req() request: MultipartRequest, @CurrentUser() user: AuthenticatedUser) {
    const file = await request.file();

    if (!file) {
      throw new BadRequestException("Multipart field 'file' is required");
    }

    const folderId = this.getFieldValue(file, "folderId");

    if (!folderId) {
      throw new BadRequestException("Multipart field 'folderId' is required");
    }

    return this.repository.upload(
      file,
      {
        folderId,
        classification: this.parseClassification(this.getFieldValue(file, "classification")),
        description: this.getFieldValue(file, "description")
      },
      user.id
    );
  }

  @Get(":id")
  @RequirePermissions("file.read")
  getFile(@Param("id") id: string) {
    return this.repository.getFile(id);
  }

  @Get(":id/download")
  @RequirePermissions("file.download")
  async download(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser, @Res() reply: FastifyReply) {
    const download = await this.repository.prepareDownload(id, user.id);
    const encodedName = encodeURIComponent(download.fileName);

    reply.header("Content-Type", download.mimeType);
    reply.header("Content-Disposition", `attachment; filename*=UTF-8''${encodedName}`);

    return reply.send(download.stream);
  }

  private getFieldValue(file: MultipartFile, name: string) {
    const fields = file.fields as Record<string, { value?: unknown }> | undefined;
    const value = fields?.[name]?.value;
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
  }

  private parseClassification(value?: string): FileClassification | undefined {
    if (!value) {
      return undefined;
    }

    const normalized = value.trim().toUpperCase().replaceAll(" ", "_").replaceAll("-", "_");
    const allowed = new Set<string>(Object.values(FileClassification));

    if (!allowed.has(normalized)) {
      throw new BadRequestException(`Unsupported classification: ${value}`);
    }

    return normalized as FileClassification;
  }
}
