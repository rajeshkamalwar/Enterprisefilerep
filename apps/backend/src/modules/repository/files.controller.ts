import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";

@UseGuards(AuthGuard, PermissionsGuard)
@Controller("files")
export class FilesController {
  @Post("upload")
  @RequirePermissions("file.create")
  uploadScaffold() {
    return {
      fileId: "file_demo",
      versionId: "version_001",
      status: "scanning",
      message: "Upload endpoint scaffolded. Multipart storage and ClamAV queue come in the file milestone."
    };
  }

  @Get(":id")
  @RequirePermissions("file.read")
  getFile(@Param("id") id: string) {
    return {
      id,
      originalName: "demo-policy.pdf",
      classification: "Internal",
      scanStatus: "clean",
      currentVersion: 1
    };
  }

  @Get(":id/download")
  @RequirePermissions("file.download")
  download(@Param("id") id: string) {
    return {
      fileId: id,
      message: "Download authorization endpoint scaffolded. Streaming comes with local storage adapter."
    };
  }
}
