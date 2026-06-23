import { Injectable, NotFoundException } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { PrismaService } from "../database/prisma.service";

type TemplateVariables = Record<string, string | number | boolean | null | undefined>;

export type QueueEmailInput = {
  to: string;
  templateKey: string;
  variables?: TemplateVariables;
};

@Injectable()
export class MailerService {
  constructor(private readonly prisma: PrismaService) {}

  async createDeliveryLog(input: QueueEmailInput) {
    const rendered = await this.renderTemplate(input.templateKey, input.variables ?? {});

    return this.prisma.emailDeliveryLog.create({
      data: {
        templateKey: input.templateKey,
        recipientEmail: input.to,
        subject: rendered.subject,
        status: "QUEUED"
      }
    });
  }

  async sendDeliveryLog(deliveryLogId: string, variables: TemplateVariables = {}) {
    const log = await this.prisma.emailDeliveryLog.findUnique({
      where: { id: deliveryLogId }
    });

    if (!log) {
      throw new NotFoundException("Email delivery log not found");
    }

    const rendered = await this.renderTemplate(log.templateKey, variables);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      requireTLS: process.env.SMTP_REQUIRE_TLS !== "false",
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
          }
        : undefined
    });

    try {
      await transporter.sendMail({
        to: log.recipientEmail,
        from: {
          address: process.env.SMTP_FROM_EMAIL ?? "noreply@example.com",
          name: process.env.SMTP_FROM_NAME ?? "Enterprise File Repository"
        },
        replyTo: process.env.SMTP_REPLY_TO,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html
      });

      return this.prisma.emailDeliveryLog.update({
        where: { id: deliveryLogId },
        data: {
          status: "SENT",
          sentAt: new Date(),
          failureReason: null
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown SMTP error";

      await this.prisma.emailDeliveryLog.update({
        where: { id: deliveryLogId },
        data: {
          status: "FAILED",
          retryCount: { increment: 1 },
          failureReason: message
        }
      });

      throw error;
    }
  }

  async listDeliveryLogs(page = 1, pageSize = 50) {
    const skip = (page - 1) * pageSize;
    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.emailDeliveryLog.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize
      }),
      this.prisma.emailDeliveryLog.count()
    ]);

    return {
      data,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize)
      }
    };
  }

  private async renderTemplate(templateKey: string, variables: TemplateVariables) {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { templateKey }
    });

    if (!template || !template.isEnabled) {
      throw new NotFoundException(`Email template is unavailable: ${templateKey}`);
    }

    return {
      subject: this.render(template.subject, variables),
      text: this.render(template.textBody, variables),
      html: this.render(template.htmlBody, variables)
    };
  }

  private render(source: string, variables: TemplateVariables) {
    return source.replaceAll(/\{\{(\w+)\}\}/g, (_match, key: string) => {
      const value = variables[key];
      return value === null || value === undefined ? "" : String(value);
    });
  }
}
