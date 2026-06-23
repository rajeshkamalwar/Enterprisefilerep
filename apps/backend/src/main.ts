import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./modules/app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );

  app.enableCors();
  app.setGlobalPrefix("api/v1");

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 4000, "0.0.0.0");
}

void bootstrap();
