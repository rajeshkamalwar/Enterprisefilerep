import { BadRequestException, Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../auth/auth.guard";
import { EmailQueueService } from "../queue/email-queue.service";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { MailerService, SmtpSettingsInput } from "./mailer.service";

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
    return this.mailer.getConfigurationStatus();
  }

  @Patch()
  @RequirePermissions("smtp.update")
  updateSettings(@Body() body: SmtpSettingsInput, @CurrentUser() user: AuthenticatedUser) {
    return this.mailer.updateSettings(body, user.id);
  }

  @Post("test")
  @RequirePermissions("smtp.update")
  async testEmail(@Body() body: { to: string }, @CurrentUser() user: AuthenticatedUser) {
    if (!body.to?.trim()) {
      throw new BadRequestException("Test recipient email is required");
    }

    const result = await this.emailQueue.enqueue({
      to: body.to.trim(),
      templateKey: "smtp.test",
      variables: {
        appName: "Enterprise File Repository",
        timestamp: new Date().toISOString()
      }
    });
    await this.mailer.markTestQueued(user.id, body.to.trim(), result.deliveryLogId);

    return result;
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
