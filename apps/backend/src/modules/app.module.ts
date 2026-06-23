import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AccessRequestsController } from "./workflow/access-requests.controller";
import { AdminController } from "./admin/admin.controller";
import { AuthController } from "./auth/auth.controller";
import { AuthGuard } from "./auth/auth.guard";
import { AuthService } from "./auth/auth.service";
import { DatabaseModule } from "./database/database.module";
import { FilesController } from "./repository/files.controller";
import { HealthController } from "./health/health.controller";
import { RbacController } from "./rbac/rbac.controller";
import { PermissionsGuard } from "./rbac/permissions.guard";
import { RbacService } from "./rbac/rbac.service";
import { ReportsController } from "./reports/reports.controller";
import { SmtpController } from "./smtp/smtp.controller";

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? "dev-only-change-me",
      signOptions: { expiresIn: "15m" }
    })
  ],
  controllers: [
    AccessRequestsController,
    AdminController,
    AuthController,
    FilesController,
    HealthController,
    RbacController,
    ReportsController,
    SmtpController
  ],
  providers: [AuthGuard, AuthService, PermissionsGuard, RbacService]
})
export class AppModule {}
