import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { OperationalMetricsService } from "../analytics/operational-metrics.service";
import { AuthGuard } from "../auth/auth.guard";
import { BackupService } from "../backup/backup.service";
import { ScanQueueService } from "../queue/scan-queue.service";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { ScanService } from "../scanning/scan.service";
import { SearchIndexService } from "../search/search-index.service";

type RunScanBody = {
  limit?: number;
};

@UseGuards(AuthGuard, PermissionsGuard)
@Controller("admin")
export class AdminController {
  constructor(
    private readonly metrics: OperationalMetricsService,
    private readonly backup: BackupService,
    private readonly scanQueue: ScanQueueService,
    private readonly scanner: ScanService,
    private readonly search: SearchIndexService
  ) {}

  @Get("dashboard")
  @RequirePermissions("settings.read")
  dashboard() {
    return this.metrics.dashboard();
  }

  @Get("storage")
  @RequirePermissions("backup.read")
  storage() {
    return this.metrics.storageSummary();
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

  @Post("backup/run")
  @RequirePermissions("backup.run")
  runBackup() {
    return this.backup.runManualBackup();
  }

  @Get("backup/latest")
  @RequirePermissions("backup.read")
  latestBackups() {
    return this.backup.latestBackups();
  }

  @Post("search/reindex")
  @RequirePermissions("settings.update")
  reindexSearch() {
    return this.search.reindexFiles();
  }
}
