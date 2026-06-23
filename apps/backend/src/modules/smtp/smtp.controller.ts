import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { EmailQueueService } from "../queue/email-queue.service";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { MailerService } from "./mailer.service";

@UseGuards(AuthGuard, PermissionsGuard)
@Controller("settings/smtp")
export class SmtpController {
  constructor(
    private readonly emailQueue: EmailQueueService,
    private readonly mailer: MailerService
  ) {}

  @Get()
  @RequirePermissions("smtp.read")
  getSettings() {
    return {
      host: process.env.SMTP_HOST ?? null,
      port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : null,
      username: process.env.SMTP_USER ?? null,
      passwordConfigured: Boolean(process.env.SMTP_PASSWORD),
      fromEmail: process.env.SMTP_FROM_EMAIL ?? null,
      fromName: process.env.SMTP_FROM_NAME ?? "Enterprise File Repository",
      lastTestStatus: "not_run"
    };
  }

  @Patch()
  @RequirePermissions("smtp.update")
  updateSettings(@Body() body: Record<string, unknown>) {
    return {
      updated: true,
      storedFields: Object.keys(body).filter((key) => key !== "password"),
      passwordUpdated: typeof body.password === "string"
    };
  }

  @Post("test")
  @RequirePermissions("smtp.update")
  testEmail(@Body() body: { to: string }) {
    return this.emailQueue.enqueue({
      to: body.to,
      templateKey: "smtp.test",
      variables: {
        appName: "Enterprise File Repository",
        timestamp: new Date().toISOString()
      }
    });
  }

  @Get("delivery-logs")
  @RequirePermissions("smtp.read")
  logs() {
    return this.mailer.listDeliveryLogs();
  }

  @Get("queue")
  @RequirePermissions("smtp.read")
  queue() {
    return this.emailQueue.getCounts();
  }
}
