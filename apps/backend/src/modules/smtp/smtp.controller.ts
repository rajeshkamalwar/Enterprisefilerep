import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";

@UseGuards(AuthGuard, PermissionsGuard)
@Controller("settings/smtp")
export class SmtpController {
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
    return {
      queued: true,
      to: body.to,
      message: "SMTP test email queued. BullMQ delivery worker comes in the notification milestone."
    };
  }

  @Get("delivery-logs")
  @RequirePermissions("smtp.read")
  logs() {
    return {
      data: [],
      pagination: { page: 1, pageSize: 50, totalItems: 0, totalPages: 0 }
    };
  }
}
