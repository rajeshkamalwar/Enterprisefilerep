import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AuthenticatedUser, AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { DepartmentsService } from "./departments.service";

type ListDepartmentsQuery = {
  q?: string;
  status?: string;
  page?: string;
  pageSize?: string;
};

type CreateDepartmentBody = {
  name: string;
  code: string;
  description?: string | null;
  storageQuotaBytes?: string | number | null;
  status?: string;
};

type UpdateDepartmentBody = {
  name?: string;
  code?: string;
  description?: string | null;
  storageQuotaBytes?: string | number | null;
  status?: string;
};

@UseGuards(AuthGuard, PermissionsGuard)
@Controller("departments")
export class DepartmentsController {
  constructor(private readonly departments: DepartmentsService) {}

  @Get()
  @RequirePermissions("settings.read")
  list(@Query() query: ListDepartmentsQuery) {
    return this.departments.list({
      q: query.q,
      status: query.status,
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined
    });
  }

  @Post()
  @RequirePermissions("settings.update")
  create(@Body() body: CreateDepartmentBody, @CurrentUser() actor: AuthenticatedUser) {
    return this.departments.create({
      ...body,
      actor
    });
  }

  @Patch(":id")
  @RequirePermissions("settings.update")
  update(@Param("id") id: string, @Body() body: UpdateDepartmentBody, @CurrentUser() actor: AuthenticatedUser) {
    return this.departments.update(id, {
      ...body,
      actor
    });
  }

  @Post(":id/status")
  @RequirePermissions("settings.update")
  setStatus(@Param("id") id: string, @Body() body: { status: string }, @CurrentUser() actor: AuthenticatedUser) {
    return this.departments.update(id, {
      status: body.status,
      actor
    });
  }

  @Delete(":id")
  @RequirePermissions("settings.update")
  delete(@Param("id") id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.departments.delete(id, actor);
  }
}
