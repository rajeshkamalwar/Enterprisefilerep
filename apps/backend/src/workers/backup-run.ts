import { NestFactory } from "@nestjs/core";
import { AppModule } from "../modules/app.module";
import { BackupService } from "../modules/backup/backup.service";

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"]
  });

  try {
    const backup = app.get(BackupService);
    const result = await backup.runManualBackup();
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await app.close();
  }
}

void main();
