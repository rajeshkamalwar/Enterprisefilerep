import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { OperationalMetricsService } from "../analytics/operational-metrics.service";
import { AuthGuard } from "../auth/auth.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";

@UseGuards(AuthGuard, PermissionsGuard)
@Controller("reports")
export class ReportsController {
  constructor(private readonly metrics: OperationalMetricsService) {}

  @Get("storage")
  @RequirePermissions("audit.read")
  storageReport() {
    return this.metrics.storageReport();
  }

  @Post(":reportType/export")
  @RequirePermissions("audit.export")
  exportReport(@Param("reportType") reportType: string, @Body() body: { format: string }) {
    return {
      exportId: `export_${reportType}`,
      reportType,
      format: body.format,
      status: "queued"
    };
  }
}
