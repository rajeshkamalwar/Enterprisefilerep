import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { ScanQueueService } from "../queue/scan-queue.service";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { ScanService } from "../scanning/scan.service";

type RunScanBody = {
  limit?: number;
};

@UseGuards(AuthGuard, PermissionsGuard)
@Controller("admin")
export class AdminController {
  constructor(
    private readonly scanQueue: ScanQueueService,
    private readonly scanner: ScanService
  ) {}

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

  @Post("scans/run-pending")
  @RequirePermissions("backup.run")
  runPendingScans(@Body() body: RunScanBody) {
    const limit = body.limit && body.limit > 0 ? Math.min(body.limit, 100) : 25;
    return this.scanner.scanPending(limit);
  }

  @Get("scans/queue")
  @RequirePermissions("backup.read")
  scanQueueStatus() {
    return this.scanQueue.getCounts();
  }
}
