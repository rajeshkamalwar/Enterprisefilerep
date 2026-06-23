import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "apps/backend/prisma/schema.prisma",
  migrations: {
    path: "apps/backend/prisma/migrations",
    seed: "tsx apps/backend/prisma/seed.ts"
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://filerepo:filerepo@localhost:5432/filerepo"
  }
});
