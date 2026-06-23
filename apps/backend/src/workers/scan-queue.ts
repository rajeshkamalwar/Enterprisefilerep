import { NestFactory } from "@nestjs/core";
import { AppModule } from "../modules/app.module";
import { ScanQueueService } from "../modules/queue/scan-queue.service";

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"]
  });

  const queue = app.get(ScanQueueService);
  const worker = await queue.createWorker();

  console.log("File scan queue worker started");

  const shutdown = async () => {
    console.log("Stopping file scan queue worker");
    await worker.close();
    await app.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

void main();
