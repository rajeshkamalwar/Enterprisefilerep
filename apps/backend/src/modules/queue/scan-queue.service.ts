import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Job, JobsOptions, Queue, Worker } from "bullmq";
import { ScanService } from "../scanning/scan.service";

type ScanJobData = {
  versionId: string;
  fileId: string;
};

@Injectable()
export class ScanQueueService implements OnModuleDestroy {
  static readonly queueName = "file-scan";

  private readonly connection = this.getRedisConnection();

  private readonly queue = new Queue<ScanJobData>(ScanQueueService.queueName, {
    connection: this.connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 10_000
      },
      removeOnComplete: {
        age: 86_400,
        count: 1_000
      },
      removeOnFail: {
        age: 604_800,
        count: 5_000
      }
    }
  });

  constructor(private readonly scanner: ScanService) {}

  async enqueueFileScan(data: ScanJobData) {
    const options: JobsOptions = {
      jobId: `scan:${data.versionId}`
    };

    return this.queue.add("scan-file-version", data, options);
  }

  async getCounts() {
    return this.queue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused");
  }

  async createWorker() {
    const worker = new Worker<ScanJobData>(
      ScanQueueService.queueName,
      async (job: Job<ScanJobData>) => {
        return this.scanner.scanVersion(job.data.versionId);
      },
      {
        connection: this.getRedisConnection(),
        concurrency: Number(process.env.SCAN_WORKER_CONCURRENCY ?? 2)
      }
    );

    worker.on("completed", (job) => {
      console.log(`Scan job completed: ${job.id}`);
    });
    worker.on("failed", (job, error) => {
      console.error(`Scan job failed: ${job?.id ?? "unknown"}`, error);
    });

    return worker;
  }

  async close() {
    await this.queue.close();
  }

  async onModuleDestroy() {
    await this.close();
  }

  private getRedisConnection() {
    const url = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");

    return {
      host: url.hostname,
      port: Number(url.port || 6379),
      username: url.username || undefined,
      password: url.password || undefined,
      db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0
    };
  }
}
