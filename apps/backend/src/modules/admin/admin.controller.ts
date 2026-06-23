import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";

@UseGuards(AuthGuard, PermissionsGuard)
@Controller("admin")
export class AdminController {
  @Get("dashboard")
  @RequirePermissions("settings.read")
  dashboard() {
    return {
      totalUsers: 143,
      activeUsers: 138,
      totalFiles: 24890,
      storageUsedBytes: 1979120929996,
      pendingAccessRequests: 12,
      failedJobs: 0,
      backupStatus: "completed",
      smtpStatus: "needs_test"
    };
  }

  @Get("storage")
  @RequirePermissions("backup.read")
  storage() {
    return {
      driver: process.env.STORAGE_DRIVER ?? "local",
      usedBytes: 1979120929996,
      quotaBytes: 3199028310016,
      warningThresholdPercent: 80
    };
  }
}
