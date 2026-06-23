import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";

@UseGuards(AuthGuard, PermissionsGuard)
@Controller("reports")
export class ReportsController {
  @Get("storage")
  @RequirePermissions("audit.read")
  storageReport() {
    return {
      data: [
        { department: "Finance", usedGb: 420, files: 6240 },
        { department: "HR", usedGb: 180, files: 3180 },
        { department: "Legal", usedGb: 260, files: 1290 }
      ]
    };
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
