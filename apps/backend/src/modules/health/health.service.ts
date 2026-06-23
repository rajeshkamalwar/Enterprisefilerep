import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { EmailQueueService } from "../queue/email-queue.service";
import { ScanQueueService } from "../queue/scan-queue.service";
import { ClamavService } from "../scanning/clamav.service";
import { MailerService } from "../smtp/mailer.service";
import { LocalStorageService } from "../storage/local-storage.service";

export type HealthStatus = "healthy" | "degraded" | "unhealthy" | "not_configured";

export type HealthCheck = {
  name: string;
  status: HealthStatus;
  detail: string;
  latencyMs: number;
  meta?: Record<string, unknown>;
};

type CheckResult = Omit<HealthCheck, "name" | "latencyMs">;

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scanQueue: ScanQueueService,
    private readonly emailQueue: EmailQueueService,
    private readonly clamav: ClamavService,
    private readonly mailer: MailerService,
    private readonly storage: LocalStorageService
  ) {}

  async all() {
    const checks = await Promise.all([
      this.run("api", () => this.checkApi()),
      this.run("database", () => this.checkDatabase()),
      this.run("redis", () => this.checkRedis()),
      this.run("search", () => this.checkSearch()),
      this.run("storage", () => this.checkStorage()),
      this.run("clamav", () => this.checkClamav()),
      this.run("smtp", () => this.checkSmtp())
    ]);

    return {
      status: this.rollupStatus(checks),
      generatedAt: new Date().toISOString(),
      checks
    };
  }

  async one(name: string) {
    const checks: Record<string, () => Promise<HealthCheck>> = {
      api: () => this.run("api", () => this.checkApi()),
      database: () => this.run("database", () => this.checkDatabase()),
      redis: () => this.run("redis", () => this.checkRedis()),
      search: () => this.run("search", () => this.checkSearch()),
      storage: () => this.run("storage", () => this.checkStorage()),
      clamav: () => this.run("clamav", () => this.checkClamav()),
      smtp: () => this.run("smtp", () => this.checkSmtp())
    };

    return checks[name]?.();
  }

  private checkApi(): CheckResult {
    return {
      status: "healthy",
      detail: "NestJS process is responding"
    };
  }

  private async checkDatabase(): Promise<CheckResult> {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      status: "healthy",
      detail: "PostgreSQL query succeeded"
    };
  }

  private async checkRedis(): Promise<CheckResult> {
    const [scanQueue, emailQueue] = await Promise.all([
      this.scanQueue.healthCheck(),
      this.emailQueue.healthCheck()
    ]);

    return {
      status: "healthy",
      detail: "Redis queues are reachable",
      meta: {
        scanQueue,
        emailQueue
      }
    };
  }

  private async checkSearch(): Promise<CheckResult> {
    const baseUrl = process.env.MEILISEARCH_HOST ?? "http://localhost:7700";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);

    try {
      const headers: Record<string, string> = {};
      if (process.env.MEILISEARCH_API_KEY) {
        headers.Authorization = `Bearer ${process.env.MEILISEARCH_API_KEY}`;
      }

      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/health`, {
        headers,
        signal: controller.signal
      });

      if (!response.ok) {
        return {
          status: "unhealthy",
          detail: `Meilisearch health endpoint returned HTTP ${response.status}`
        };
      }

      const body = (await response.json()) as Record<string, unknown>;

      return {
        status: "healthy",
        detail: "Meilisearch health endpoint is reachable",
        meta: body
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async checkStorage(): Promise<CheckResult> {
    const meta = await this.storage.healthCheck();

    return {
      status: "healthy",
      detail: "Local storage root is writable",
      meta
    };
  }

  private async checkClamav(): Promise<CheckResult> {
    const response = await this.clamav.ping();
    const healthy = response.includes("PONG");

    return {
      status: healthy ? "healthy" : "unhealthy",
      detail: healthy ? "ClamAV daemon responded to ping" : "ClamAV ping returned an unexpected response",
      meta: {
        response
      }
    };
  }

  private async checkSmtp(): Promise<CheckResult> {
    const result = await this.mailer.verifyConnection();

    if (!result.configured) {
      return {
        status: "not_configured",
        detail: "SMTP is not configured with production credentials",
        meta: result
      };
    }

    return {
      status: "healthy",
      detail: "SMTP connection verification succeeded",
      meta: result
    };
  }

  private async run(name: string, check: () => CheckResult | Promise<CheckResult>): Promise<HealthCheck> {
    const startedAt = performance.now();

    try {
      const result = await check();

      return {
        name,
        latencyMs: Math.round(performance.now() - startedAt),
        ...result
      };
    } catch (error) {
      return {
        name,
        status: "unhealthy",
        detail: error instanceof Error ? error.message : "Unknown health check failure",
        latencyMs: Math.round(performance.now() - startedAt)
      };
    }
  }

  private rollupStatus(checks: HealthCheck[]) {
    if (checks.some((check) => check.status === "unhealthy")) {
      return "degraded";
    }

    if (checks.some((check) => check.status === "degraded" || check.status === "not_configured")) {
      return "degraded";
    }

    return "ok";
  }
}
