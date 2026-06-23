import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { AuditLogsService, AuditLogQuery } from "./audit-logs.service";

@UseGuards(AuthGuard, PermissionsGuard)
@Controller("audit-logs")
export class AuditLogsController {
  constructor(private readonly auditLogs: AuditLogsService) {}

  @Get()
  @RequirePermissions("audit.read")
  list(@Query() query: AuditLogQuery) {
    return this.auditLogs.list(query);
  }

  @Get("actions")
  @RequirePermissions("audit.read")
  actions() {
    return { data: this.auditLogs.actions() };
  }
}
