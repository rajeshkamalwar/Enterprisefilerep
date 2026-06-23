import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RequirePermissions } from "./permissions.decorator";
import { PermissionsGuard } from "./permissions.guard";
import { RbacService } from "./rbac.service";

type RoleCreateBody = {
  name: string;
  code: string;
  description?: string;
};

@Controller()
export class RbacController {
  constructor(private readonly rbac: RbacService) {}

  @Get("permissions")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("role.read")
  listPermissions() {
    return this.rbac.listPermissions().then((data) => ({ data }));
  }

  @Get("roles")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("role.read")
  listRoles() {
    return this.rbac.listRoles().then((data) => ({ data }));
  }

  @Post("roles")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("role.create")
  createRole(@Body() body: RoleCreateBody) {
    return this.rbac.createRole(body);
  }

  @Get("roles/:id/permissions")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("role.read")
  rolePermissions(@Param("id") id: string) {
    return this.rbac.rolePermissions(id).then((permissions) => ({ roleId: id, permissions }));
  }

  @Post("roles/:id/permissions")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("role.permission.assign")
  assignRolePermission(@Param("id") id: string, @Body() body: { permissionKey: string }) {
    return this.rbac.assignPermission(id, body.permissionKey);
  }

  @Get("users/:id/effective-permissions")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("permission.assign")
  effectivePermissions(@Param("id") id: string) {
    return this.rbac.effectivePermissions(id);
  }
}
