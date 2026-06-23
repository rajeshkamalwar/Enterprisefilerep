import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AuthenticatedUser, AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RepositoryService } from "./repository.service";

type CreateFolderBody = {
  name: string;
  parentId?: string;
  departmentId?: string;
};

type UpdateFolderBody = {
  name: string;
};

@UseGuards(AuthGuard, PermissionsGuard)
@Controller("folders")
export class FoldersController {
  constructor(private readonly repository: RepositoryService) {}

  @Get()
  @RequirePermissions("folder.read")
  listFolders(@CurrentUser() user: AuthenticatedUser, @Query("parentId") parentId?: string) {
    return this.repository.listFolders({
      user,
      parentId: parentId?.trim() || null
    });
  }

  @Post()
  @RequirePermissions("folder.create")
  createFolder(@Body() body: CreateFolderBody, @CurrentUser() user: AuthenticatedUser) {
    return this.repository.createFolder({
      ...body,
      actorUser: user
    });
  }

  @Patch(":id")
  @RequirePermissions("folder.update")
  updateFolder(@Param("id") id: string, @Body() body: UpdateFolderBody, @CurrentUser() user: AuthenticatedUser) {
    return this.repository.updateFolder({
      id,
      name: body.name,
      actorUser: user
    });
  }

  @Get(":id")
  @RequirePermissions("folder.read")
  getFolder(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.repository.getFolder(id, user);
  }
}
