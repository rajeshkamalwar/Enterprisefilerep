import { NestFactory } from "@nestjs/core";
import { AppModule } from "../modules/app.module";
import { ScanService } from "../modules/scanning/scan.service";

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"]
  });

  try {
    const scanner = app.get(ScanService);
    const limit = Number(process.env.SCAN_LIMIT ?? 25);
    const result = await scanner.scanPending(limit);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await app.close();
  }
}

void main();
