import { BadRequestException, Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { AuthenticatedUser, AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { PrismaService } from "../database/prisma.service";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";

type UpdateSettingsBody = {
  maxUploadBytes?: string | number;
  storageQuotaBytes?: string | number;
  storageWarningThresholdPercent?: string | number;
  backupDestination?: string;
};

@UseGuards(AuthGuard, PermissionsGuard)
@Controller("settings/system")
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions("settings.read")
  getSettings() {
    return this.snapshot();
  }

  @Patch()
  @RequirePermissions("settings.update")
  async updateSettings(@Body() body: UpdateSettingsBody, @CurrentUser() user: AuthenticatedUser) {
    const oldValue = this.snapshot();

    if (body.maxUploadBytes !== undefined) {
      process.env.MAX_UPLOAD_BYTES = this.nonNegativeIntegerString(body.maxUploadBytes, "maxUploadBytes");
    }

    if (body.storageQuotaBytes !== undefined) {
      process.env.STORAGE_QUOTA_BYTES = this.nonNegativeIntegerString(body.storageQuotaBytes, "storageQuotaBytes");
    }

    if (body.storageWarningThresholdPercent !== undefined) {
      const value = Number(body.storageWarningThresholdPercent);
      process.env.STORAGE_WARNING_THRESHOLD_PERCENT = Number.isFinite(value)
        ? String(Math.min(Math.max(Math.round(value), 1), 100))
        : process.env.STORAGE_WARNING_THRESHOLD_PERCENT;
    }

    if (typeof body.backupDestination === "string") {
      process.env.BACKUP_DESTINATION = body.backupDestination.trim();
    }

    const updated = this.snapshot();

    await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "SETTINGS_UPDATED",
        entityType: "SYSTEM_SETTINGS",
        entityId: "runtime",
        entityName: "System Settings",
        oldValueJson: oldValue,
        newValueJson: updated
      }
    });

    return updated;
  }

  private snapshot() {
    return {
      storageDriver: process.env.STORAGE_DRIVER ?? "local",
      localStorageRoot: process.env.LOCAL_STORAGE_ROOT ?? "./storage",
      maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 262_144_000),
      storageQuotaBytes: Number(process.env.STORAGE_QUOTA_BYTES ?? 0),
      storageWarningThresholdPercent: Number(process.env.STORAGE_WARNING_THRESHOLD_PERCENT ?? 80),
      backupDestination: process.env.BACKUP_DESTINATION ?? null,
      appUrl: process.env.APP_URL ?? "http://localhost:3000",
      apiUrl: process.env.API_URL ?? "http://localhost:4000/api/v1"
    };
  }

  private nonNegativeIntegerString(value: string | number, field: string) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new BadRequestException(`${field} must be a non-negative number`);
    }

    return String(Math.round(parsed));
  }
}
