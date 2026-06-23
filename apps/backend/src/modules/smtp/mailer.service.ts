import { Injectable, NotFoundException } from "@nestjs/common";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import * as nodemailer from "nodemailer";
import { PrismaService } from "../database/prisma.service";

type TemplateVariables = Record<string, string | number | boolean | null | undefined>;

export type QueueEmailInput = {
  to: string;
  templateKey: string;
  variables?: TemplateVariables;
};

export type SmtpSettingsInput = {
  host?: unknown;
  port?: unknown;
  username?: unknown;
  password?: unknown;
  secure?: unknown;
  requireTls?: unknown;
  fromEmail?: unknown;
  fromName?: unknown;
  replyTo?: unknown;
};

type EffectiveSmtpConfiguration = {
  source: "database" | "environment";
  host: string | null;
  port: number;
  username: string | null;
  password: string | null;
  secure: boolean;
  requireTls: boolean;
  fromEmail: string | null;
  fromName: string;
  replyTo: string | null;
  lastTestStatus: string;
  lastTestedAt: Date | null;
};

@Injectable()
export class MailerService {
  private static readonly settingsId = "default";

  constructor(private readonly prisma: PrismaService) {}

  async getConfigurationStatus() {
    const configuration = await this.resolveConfiguration();
    const placeholderValues = ["smtp.example.com", "noreply@example.com", "change-me"];

    const configured = Boolean(configuration.host && configuration.fromEmail) &&
      !placeholderValues.includes(configuration.host ?? "") &&
      !placeholderValues.includes(configuration.fromEmail ?? "") &&
      configuration.password !== "change-me";

    return {
      configured,
      source: configuration.source,
      host: configuration.host,
      port: configuration.port,
      username: configuration.username,
      usernameConfigured: Boolean(configuration.username),
      passwordConfigured: Boolean(configuration.password),
      secure: configuration.secure,
      requireTls: configuration.requireTls,
      fromEmail: configuration.fromEmail,
      fromName: configuration.fromName,
      replyTo: configuration.replyTo,
      lastTestStatus: configuration.lastTestStatus,
      lastTestedAt: configuration.lastTestedAt
    };
  }

  async updateSettings(input: SmtpSettingsInput, actorUserId: string) {
    const existing = await this.prisma.smtpSetting.findUnique({
      where: { id: MailerService.settingsId }
    });

    const passwordCipher = this.passwordCipherFromInput(input.password, existing?.passwordCipher ?? null);
    const port = this.toPort(input.port, existing?.port ?? 587);

    const setting = await this.prisma.smtpSetting.upsert({
      where: { id: MailerService.settingsId },
      update: {
        host: this.optionalString(input.host),
        port,
        username: this.optionalString(input.username),
        passwordCipher,
        secure: this.optionalBoolean(input.secure, existing?.secure ?? false),
        requireTls: this.optionalBoolean(input.requireTls, existing?.requireTls ?? true),
        fromEmail: this.optionalString(input.fromEmail),
        fromName: this.optionalString(input.fromName) ?? "Enterprise File Repository",
        replyTo: this.optionalString(input.replyTo),
        updatedById: actorUserId
      },
      create: {
        id: MailerService.settingsId,
        host: this.optionalString(input.host),
        port,
        username: this.optionalString(input.username),
        passwordCipher,
        secure: this.optionalBoolean(input.secure, false),
        requireTls: this.optionalBoolean(input.requireTls, true),
        fromEmail: this.optionalString(input.fromEmail),
        fromName: this.optionalString(input.fromName) ?? "Enterprise File Repository",
        replyTo: this.optionalString(input.replyTo),
        updatedById: actorUserId
      }
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        action: "SMTP_SETTINGS_UPDATED",
        entityType: "SMTP_SETTINGS",
        entityId: setting.id,
        entityName: setting.host ?? "SMTP Settings",
        newValueJson: {
          host: setting.host,
          port: setting.port,
          usernameConfigured: Boolean(setting.username),
          passwordConfigured: Boolean(setting.passwordCipher),
          secure: setting.secure,
          requireTls: setting.requireTls,
          fromEmail: setting.fromEmail,
          fromName: setting.fromName,
          replyTo: setting.replyTo
        }
      }
    });

    return this.getConfigurationStatus();
  }

  async markTestQueued(actorUserId: string, recipientEmail: string, deliveryLogId: string) {
    await this.prisma.smtpSetting.upsert({
      where: { id: MailerService.settingsId },
      update: {
        lastTestStatus: "queued",
        lastTestedAt: new Date(),
        updatedById: actorUserId
      },
      create: {
        id: MailerService.settingsId,
        lastTestStatus: "queued",
        lastTestedAt: new Date(),
        updatedById: actorUserId
      }
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        action: "SMTP_TEST_QUEUED",
        entityType: "EMAIL_DELIVERY_LOG",
        entityId: deliveryLogId,
        entityName: recipientEmail
      }
    });
  }

  async verifyConnection() {
    const configuration = await this.getConfigurationStatus();

    if (!configuration.configured) {
      return configuration;
    }

    const transporter = nodemailer.createTransport({
      host: configuration.host ?? undefined,
      port: configuration.port,
      secure: configuration.secure,
      requireTLS: configuration.requireTls,
      connectionTimeout: 5_000,
      greetingTimeout: 5_000,
      socketTimeout: 5_000,
      auth: configuration.username
        ? {
            user: configuration.username,
            pass: (await this.resolveConfiguration()).password ?? undefined
          }
        : undefined
    });

    try {
      await transporter.verify();
      return configuration;
    } finally {
      transporter.close();
    }
  }

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

    const configuration = await this.resolveConfiguration();

    if (!configuration.host || !configuration.fromEmail) {
      throw new Error("SMTP host and from email are required before sending email.");
    }

    const rendered = await this.renderTemplate(log.templateKey, variables);
    const transporter = nodemailer.createTransport({
      host: configuration.host,
      port: configuration.port,
      secure: configuration.secure,
      requireTLS: configuration.requireTls,
      auth: configuration.username
        ? {
            user: configuration.username,
            pass: configuration.password ?? undefined
          }
        : undefined
    });

    try {
      await transporter.sendMail({
        to: log.recipientEmail,
        from: {
          address: configuration.fromEmail,
          name: configuration.fromName
        },
        replyTo: configuration.replyTo ?? undefined,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html
      });

      const updatedLog = await this.prisma.emailDeliveryLog.update({
        where: { id: deliveryLogId },
        data: {
          status: "SENT",
          sentAt: new Date(),
          failureReason: null
        }
      });

      if (log.templateKey === "smtp.test") {
        await this.updateLastTestStatus("sent");
      }

      return updatedLog;
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

      if (log.templateKey === "smtp.test") {
        await this.updateLastTestStatus("failed");
      }

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

  private async resolveConfiguration(): Promise<EffectiveSmtpConfiguration> {
    const stored = await this.prisma.smtpSetting.findUnique({
      where: { id: MailerService.settingsId }
    });

    if (stored) {
      return {
        source: "database",
        host: stored.host,
        port: stored.port,
        username: stored.username,
        password: stored.passwordCipher ? this.decryptSecret(stored.passwordCipher) : null,
        secure: stored.secure,
        requireTls: stored.requireTls,
        fromEmail: stored.fromEmail,
        fromName: stored.fromName,
        replyTo: stored.replyTo,
        lastTestStatus: stored.lastTestStatus,
        lastTestedAt: stored.lastTestedAt
      };
    }

    return {
      source: "environment",
      host: process.env.SMTP_HOST ?? null,
      port: Number(process.env.SMTP_PORT ?? 587),
      username: process.env.SMTP_USER ?? null,
      password: process.env.SMTP_PASSWORD ?? null,
      secure: process.env.SMTP_SECURE === "true",
      requireTls: process.env.SMTP_REQUIRE_TLS !== "false",
      fromEmail: process.env.SMTP_FROM_EMAIL ?? null,
      fromName: process.env.SMTP_FROM_NAME ?? "Enterprise File Repository",
      replyTo: process.env.SMTP_REPLY_TO ?? null,
      lastTestStatus: "not_run",
      lastTestedAt: null
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

  private passwordCipherFromInput(value: unknown, existing: string | null) {
    if (typeof value !== "string") {
      return existing;
    }

    if (!value.trim()) {
      return null;
    }

    return this.encryptSecret(value);
  }

  private optionalString(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  private optionalBoolean(value: unknown, fallback: boolean) {
    return typeof value === "boolean" ? value : fallback;
  }

  private toPort(value: unknown, fallback: number) {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) {
      return fallback;
    }

    return parsed;
  }

  private encryptSecret(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
  }

  private decryptSecret(value: string) {
    const [version, iv, tag, encrypted] = value.split(":");

    if (version !== "v1" || !iv || !tag || !encrypted) {
      return null;
    }

    const decipher = createDecipheriv("aes-256-gcm", this.encryptionKey(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));

    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64")),
      decipher.final()
    ]).toString("utf8");
  }

  private encryptionKey() {
    const source = process.env.SMTP_ENCRYPTION_KEY ??
      process.env.APP_ENCRYPTION_KEY ??
      process.env.JWT_SECRET ??
      "dev-only-smtp-secret";

    return createHash("sha256").update(source).digest();
  }

  private async updateLastTestStatus(status: "sent" | "failed") {
    await this.prisma.smtpSetting.upsert({
      where: { id: MailerService.settingsId },
      update: {
        lastTestStatus: status,
        lastTestedAt: new Date()
      },
      create: {
        id: MailerService.settingsId,
        lastTestStatus: status,
        lastTestedAt: new Date()
      }
    });
  }
}
