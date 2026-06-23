import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";

@UseGuards(AuthGuard, PermissionsGuard)
@Controller("access-requests")
export class AccessRequestsController {
  @Get()
  @RequirePermissions("permission.assign")
  list() {
    return {
      data: [
        {
          id: "request_demo",
          requester: "Finance Analyst",
          resourceType: "folder",
          resourceId: "folder_finance_2026",
          status: "pending"
        }
      ]
    };
  }

  @Post()
  @RequirePermissions("file.read")
  create(@Body() body: Record<string, unknown>) {
    return {
      id: "request_new",
      status: "pending",
      ...body
    };
  }

  @Post(":id/approve")
  @RequirePermissions("permission.assign")
  approve(@Param("id") id: string, @Body() body: { decisionReason?: string }) {
    return {
      id,
      status: "approved",
      decisionReason: body.decisionReason ?? null,
      auditRequired: true
    };
  }

  @Post(":id/reject")
  @RequirePermissions("permission.assign")
  reject(@Param("id") id: string, @Body() body: { decisionReason?: string }) {
    return {
      id,
      status: "rejected",
      decisionReason: body.decisionReason ?? null,
      auditRequired: true
    };
  }
}
