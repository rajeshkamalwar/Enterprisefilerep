import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  all() {
    return this.health.all();
  }

  @Get(":name")
  async one(@Param("name") name: string) {
    const check = await this.health.one(name);

    if (!check) {
      throw new NotFoundException(`Unknown health check: ${name}`);
    }

    return {
      generatedAt: new Date().toISOString(),
      ...check
    };
  }
}
