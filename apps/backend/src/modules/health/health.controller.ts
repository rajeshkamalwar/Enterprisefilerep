import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { healthChecks } from "../../shared/demo-data";

@Controller("health")
export class HealthController {
  @Get()
  all() {
    const unhealthy = healthChecks.filter((check) => check.status === "unhealthy");

    return {
      status: unhealthy.length > 0 ? "degraded" : "ok",
      generatedAt: new Date().toISOString(),
      checks: healthChecks
    };
  }

  @Get(":name")
  one(@Param("name") name: string) {
    const check = healthChecks.find((item) => item.name === name);

    if (!check) {
      throw new NotFoundException(`Unknown health check: ${name}`);
    }

    return {
      generatedAt: new Date().toISOString(),
      ...check
    };
  }
}
