import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { permissions, roles } from "../../shared/demo-data";

type RoleCreateBody = {
  name: string;
  code: string;
  description?: string;
};

@Controller()
export class RbacController {
  @Get("permissions")
  listPermissions() {
    return { data: permissions };
  }

  @Get("roles")
  listRoles() {
    return { data: roles };
  }

  @Post("roles")
  createRole(@Body() body: RoleCreateBody) {
    return {
      id: `role_${body.code.toLowerCase()}`,
      ...body,
      permissions: []
    };
  }

  @Get("roles/:id/permissions")
  rolePermissions(@Param("id") id: string) {
    const role = roles.find((item) => item.id === id);

    return {
      roleId: id,
      permissions: role?.permissions ?? []
    };
  }

  @Post("roles/:id/permissions")
  assignRolePermission(@Param("id") id: string, @Body() body: { permissionKey: string }) {
    return {
      roleId: id,
      permissionKey: body.permissionKey,
      assigned: true,
      auditRequired: true
    };
  }

  @Get("users/:id/effective-permissions")
  effectivePermissions(@Param("id") id: string) {
    return {
      userId: id,
      permissions: ["folder.read", "file.read", "file.preview", "file.download"],
      sources: [
        {
          type: "role",
          id: "role_employee",
          name: "Employee"
        }
      ]
    };
  }
}
