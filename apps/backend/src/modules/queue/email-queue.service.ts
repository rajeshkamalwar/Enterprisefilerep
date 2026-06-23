import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Job, JobsOptions, Queue, Worker } from "bullmq";
import { MailerService, QueueEmailInput } from "../smtp/mailer.service";

type EmailJobData = QueueEmailInput & {
  deliveryLogId: string;
};

@Injectable()
export class EmailQueueService implements OnModuleDestroy {
  static readonly queueName = "email-delivery";

  private readonly connection = this.getRedisConnection();

  private readonly queue = new Queue<EmailJobData>(EmailQueueService.queueName, {
    connection: this.connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 15_000
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

  constructor(private readonly mailer: MailerService) {}

  async enqueue(input: QueueEmailInput) {
    const deliveryLog = await this.mailer.createDeliveryLog(input);
    const options: JobsOptions = {
      jobId: `email:${deliveryLog.id}`
    };

    const job = await this.queue.add(
      "send-template-email",
      {
        ...input,
        deliveryLogId: deliveryLog.id
      },
      options
    );

    return {
      deliveryLogId: deliveryLog.id,
      jobId: job.id
    };
  }

  async getCounts() {
    return this.queue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused");
  }

  async createWorker() {
    const worker = new Worker<EmailJobData>(
      EmailQueueService.queueName,
      async (job: Job<EmailJobData>) => {
        return this.mailer.sendDeliveryLog(job.data.deliveryLogId, job.data.variables ?? {});
      },
      {
        connection: this.getRedisConnection(),
        concurrency: Number(process.env.EMAIL_WORKER_CONCURRENCY ?? 3)
      }
    );

    worker.on("completed", (job) => {
      console.log(`Email job completed: ${job.id}`);
    });
    worker.on("failed", (job, error) => {
      console.error(`Email job failed: ${job?.id ?? "unknown"}`, error);
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
