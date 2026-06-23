import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { UserStatus } from "@prisma/client";
import { AuthenticatedUser, AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { UsersService } from "./users.service";

type ListUsersQuery = {
  q?: string;
  status?: UserStatus;
  departmentId?: string;
  page?: string;
  pageSize?: string;
};

type CreateUserBody = {
  email: string;
  fullName: string;
  password: string;
  employeeCode?: string;
  country?: string;
  timezone?: string;
  departmentId?: string;
  roleIds?: string[];
};

type UpdateUserBody = {
  fullName?: string;
  employeeCode?: string | null;
  country?: string | null;
  timezone?: string;
  departmentId?: string | null;
  status?: UserStatus;
  roleIds?: string[];
};

@UseGuards(AuthGuard, PermissionsGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions("user.read")
  list(@Query() query: ListUsersQuery, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.list({
      q: query.q,
      status: query.status,
      departmentId: query.departmentId,
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
      actor
    });
  }

  @Get("options")
  @RequirePermissions("user.read")
  options(@CurrentUser() actor: AuthenticatedUser) {
    return this.users.options(actor);
  }

  @Post()
  @RequirePermissions("user.create")
  create(@Body() body: CreateUserBody, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.create({
      ...body,
      roleIds: Array.isArray(body.roleIds) ? body.roleIds : [],
      actor
    });
  }

  @Patch(":id")
  @RequirePermissions("user.update")
  update(@Param("id") id: string, @Body() body: UpdateUserBody, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.update(id, {
      ...body,
      actor
    });
  }

  @Post(":id/status")
  @RequirePermissions("user.deactivate")
  setStatus(@Param("id") id: string, @Body() body: { status: UserStatus }, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.update(id, {
      status: body.status,
      actor
    });
  }
}
