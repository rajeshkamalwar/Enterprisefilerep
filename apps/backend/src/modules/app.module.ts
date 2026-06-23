import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AccessRequestsController } from "./workflow/access-requests.controller";
import { AccessRequestsService } from "./workflow/access-requests.service";
import { AdminController } from "./admin/admin.controller";
import { OperationalMetricsService } from "./analytics/operational-metrics.service";
import { AuditLogsController } from "./audit/audit-logs.controller";
import { AuditLogsService } from "./audit/audit-logs.service";
import { AuthController } from "./auth/auth.controller";
import { AuthGuard } from "./auth/auth.guard";
import { AuthService } from "./auth/auth.service";
import { DatabaseModule } from "./database/database.module";
import { DepartmentsController } from "./departments/departments.controller";
import { DepartmentsService } from "./departments/departments.service";
import { FilesController } from "./repository/files.controller";
import { FoldersController } from "./repository/folders.controller";
import { HealthController } from "./health/health.controller";
import { HealthService } from "./health/health.service";
import { RbacController } from "./rbac/rbac.controller";
import { PermissionsGuard } from "./rbac/permissions.guard";
import { RbacService } from "./rbac/rbac.service";
import { ReportsController } from "./reports/reports.controller";
import { EmailTemplatesController } from "./smtp/email-templates.controller";
import { SettingsController } from "./settings/settings.controller";
import { SmtpController } from "./smtp/smtp.controller";
import { UsersController } from "./users/users.controller";
import { RepositoryService } from "./repository/repository.service";
import { ScanQueueService } from "./queue/scan-queue.service";
import { EmailQueueService } from "./queue/email-queue.service";
import { ClamavService } from "./scanning/clamav.service";
import { ScanService } from "./scanning/scan.service";
import { MailerService } from "./smtp/mailer.service";
import { LocalStorageService } from "./storage/local-storage.service";
import { UsersService } from "./users/users.service";

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
    AuditLogsController,
    AuthController,
    DepartmentsController,
    FilesController,
    FoldersController,
    HealthController,
    RbacController,
    ReportsController,
    EmailTemplatesController,
    SettingsController,
    SmtpController,
    UsersController
  ],
  providers: [
    AccessRequestsService,
    AuditLogsService,
    AuthGuard,
    AuthService,
    ClamavService,
    DepartmentsService,
    EmailQueueService,
    HealthService,
    LocalStorageService,
    MailerService,
    OperationalMetricsService,
    PermissionsGuard,
    RbacService,
    RepositoryService,
    ScanQueueService,
    ScanService,
    UsersService
  ]
})
export class AppModule {}
