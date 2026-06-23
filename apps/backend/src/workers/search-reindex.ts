import { NestFactory } from "@nestjs/core";
import { AppModule } from "../modules/app.module";
import { SearchIndexService } from "../modules/search/search-index.service";

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"]
  });

  try {
    const search = app.get(SearchIndexService);
    const result = await search.reindexFiles();
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await app.close();
  }
}

void main();
