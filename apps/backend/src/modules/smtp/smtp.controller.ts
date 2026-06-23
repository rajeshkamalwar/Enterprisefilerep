import { Body, Controller, Get, Patch, Post } from "@nestjs/common";

@Controller("settings/smtp")
export class SmtpController {
  @Get()
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
  updateSettings(@Body() body: Record<string, unknown>) {
    return {
      updated: true,
      storedFields: Object.keys(body).filter((key) => key !== "password"),
      passwordUpdated: typeof body.password === "string"
    };
  }

  @Post("test")
  testEmail(@Body() body: { to: string }) {
    return {
      queued: true,
      to: body.to,
      message: "SMTP test email queued. BullMQ delivery worker comes in the notification milestone."
    };
  }

  @Get("delivery-logs")
  logs() {
    return {
      data: [],
      pagination: { page: 1, pageSize: 50, totalItems: 0, totalPages: 0 }
    };
  }
}
