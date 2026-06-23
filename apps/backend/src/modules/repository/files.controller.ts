import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { MultipartFile } from "@fastify/multipart";
import type { FastifyReply } from "fastify";
import { FileClassification, ScanStatus } from "@prisma/client";
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

  @Get()
  @RequirePermissions("file.read")
  listFiles(
    @CurrentUser() user: AuthenticatedUser,
    @Query("q") q?: string,
    @Query("folderId") folderId?: string,
    @Query("classification") classification?: string,
    @Query("scanStatus") scanStatus?: string,
    @Query("extension") extension?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    return this.repository.searchFiles({
      user,
      q,
      folderId,
      classification: this.parseClassification(classification),
      scanStatus: this.parseScanStatus(scanStatus),
      extension,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined
    });
  }

  @Get("recent")
  @RequirePermissions("file.read")
  recentFiles(@CurrentUser() user: AuthenticatedUser, @Query("limit") limit?: string) {
    return this.repository.listRecentFiles(user, limit ? Number(limit) : undefined);
  }

  @Get("recycle-bin")
  @RequirePermissions("file.restore")
  recycleBin(@CurrentUser() user: AuthenticatedUser, @Query("limit") limit?: string) {
    return this.repository.listFileRecycleBin(user, limit ? Number(limit) : undefined);
  }

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
      user
    );
  }

  @Get(":id")
  @RequirePermissions("file.read")
  getFile(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.repository.getFile(id, user);
  }

  @Get(":id/download")
  @RequirePermissions("file.download")
  async download(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser, @Res() reply: FastifyReply) {
    const download = await this.repository.prepareDownload(id, user);
    const encodedName = encodeURIComponent(download.fileName);

    reply.header("Content-Type", download.mimeType);
    reply.header("Content-Disposition", `attachment; filename*=UTF-8''${encodedName}`);

    return reply.send(download.stream);
  }

  @Get(":id/preview")
  @RequirePermissions("file.preview")
  async preview(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser, @Res() reply: FastifyReply) {
    const preview = await this.repository.preparePreview(id, user);
    const encodedName = encodeURIComponent(preview.fileName);

    reply.header("Content-Type", preview.mimeType);
    reply.header("Content-Disposition", `inline; filename*=UTF-8''${encodedName}`);

    return reply.send(preview.stream);
  }

  @Post(":id/restore-version")
  @RequirePermissions("file.version.restore")
  restoreVersion(@Param("id") id: string, @Body() body: { versionId: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.repository.restoreVersion({
      fileId: id,
      versionId: body.versionId,
      user
    });
  }

  @Patch(":id/owner")
  @RequirePermissions("file.update")
  updateOwner(@Param("id") id: string, @Body() body: { ownerUserId: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.repository.updateFileOwner({
      fileId: id,
      ownerUserId: body.ownerUserId,
      user
    });
  }

  @Delete(":id")
  @RequirePermissions("file.delete")
  deleteFile(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.repository.deleteFile(id, user);
  }

  @Patch(":id/restore")
  @RequirePermissions("file.restore")
  restoreFile(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.repository.restoreFile(id, user);
  }

  @Delete(":id/permanent")
  @RequirePermissions("file.delete")
  permanentlyDeleteFile(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.repository.permanentlyDeleteFile(id, user);
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

  private parseScanStatus(value?: string): ScanStatus | undefined {
    if (!value) {
      return undefined;
    }

    const normalized = value.trim().toUpperCase().replaceAll(" ", "_").replaceAll("-", "_");
    const allowed = new Set<string>(Object.values(ScanStatus));

    if (!allowed.has(normalized)) {
      throw new BadRequestException(`Unsupported scan status: ${value}`);
    }

    return normalized as ScanStatus;
  }
}
