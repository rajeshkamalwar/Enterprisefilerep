import { NestFactory } from "@nestjs/core";
import multipart from "@fastify/multipart";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./modules/app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );

  app.enableCors();
  await app.register(multipart, {
    limits: {
      fileSize: Number(process.env.MAX_UPLOAD_BYTES ?? 262_144_000)
    }
  });
  app.setGlobalPrefix("api/v1");

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 4000, "0.0.0.0");
}

void bootstrap();
