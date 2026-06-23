import { Module } from "@nestjs/common";
import { AccessRequestsController } from "./workflow/access-requests.controller";
import { AdminController } from "./admin/admin.controller";
import { AuthController } from "./auth/auth.controller";
import { FilesController } from "./repository/files.controller";
import { HealthController } from "./health/health.controller";
import { RbacController } from "./rbac/rbac.controller";
import { ReportsController } from "./reports/reports.controller";
import { SmtpController } from "./smtp/smtp.controller";

@Module({
  controllers: [
    AccessRequestsController,
    AdminController,
    AuthController,
    FilesController,
    HealthController,
    RbacController,
    ReportsController,
    SmtpController
  ]
})
export class AppModule {}
