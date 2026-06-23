import { Controller, Get, Param, Post } from "@nestjs/common";

@Controller("files")
export class FilesController {
  @Post("upload")
  uploadScaffold() {
    return {
      fileId: "file_demo",
      versionId: "version_001",
      status: "scanning",
      message: "Upload endpoint scaffolded. Multipart storage and ClamAV queue come in the file milestone."
    };
  }

  @Get(":id")
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
  download(@Param("id") id: string) {
    return {
      fileId: id,
      message: "Download authorization endpoint scaffolded. Streaming comes with local storage adapter."
    };
  }
}
