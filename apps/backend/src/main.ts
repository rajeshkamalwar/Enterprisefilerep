import "reflect-metadata";
import * as fs from "node:fs";
import * as path from "node:path";
import { NestFactory } from "@nestjs/core";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { config as loadEnv } from "dotenv";

const envPath = [path.resolve(process.cwd(), ".env"), path.resolve(process.cwd(), "../../.env")].find((candidate) =>
  fs.existsSync(candidate)
);
loadEnv(envPath ? { path: envPath } : undefined);

async function bootstrap() {
  const { AppModule } = await import("./modules/app.module");
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );

  await app.register(helmet);
  await app.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX ?? 300),
    timeWindow: process.env.RATE_LIMIT_WINDOW ?? "1 minute"
  });

  const corsOrigins = (process.env.CORS_ORIGINS ?? process.env.APP_URL ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "Accept"]
  });
  await app.register(multipart, {
    limits: {
      fileSize: Number(process.env.MAX_UPLOAD_BYTES ?? 262_144_000)
    }
  });
  app.setGlobalPrefix("api/v1");

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 4000, "0.0.0.0");
}

void bootstrap();
