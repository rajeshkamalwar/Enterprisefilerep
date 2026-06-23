import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AccessRequestsController } from "./workflow/access-requests.controller";
import { AdminController } from "./admin/admin.controller";
import { AuthController } from "./auth/auth.controller";
import { AuthGuard } from "./auth/auth.guard";
import { AuthService } from "./auth/auth.service";
import { DatabaseModule } from "./database/database.module";
import { FilesController } from "./repository/files.controller";
import { FoldersController } from "./repository/folders.controller";
import { HealthController } from "./health/health.controller";
import { RbacController } from "./rbac/rbac.controller";
import { PermissionsGuard } from "./rbac/permissions.guard";
import { RbacService } from "./rbac/rbac.service";
import { ReportsController } from "./reports/reports.controller";
import { SmtpController } from "./smtp/smtp.controller";
import { RepositoryService } from "./repository/repository.service";
import { ScanQueueService } from "./queue/scan-queue.service";
import { EmailQueueService } from "./queue/email-queue.service";
import { ClamavService } from "./scanning/clamav.service";
import { ScanService } from "./scanning/scan.service";
import { MailerService } from "./smtp/mailer.service";
import { LocalStorageService } from "./storage/local-storage.service";

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
    FoldersController,
    HealthController,
    RbacController,
    ReportsController,
    SmtpController
  ],
  providers: [
    AuthGuard,
    AuthService,
    ClamavService,
    EmailQueueService,
    LocalStorageService,
    MailerService,
    PermissionsGuard,
    RbacService,
    RepositoryService,
    ScanQueueService,
    ScanService
  ]
})
export class AppModule {}
