import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { AuthenticatedUser, AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { PrismaService } from "../database/prisma.service";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";

type UpdateTemplateBody = {
  subject?: string;
  textBody?: string;
  htmlBody?: string;
  isEnabled?: boolean;
};

@UseGuards(AuthGuard, PermissionsGuard)
@Controller("settings/email-templates")
export class EmailTemplatesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions("smtp.read")
  async listTemplates() {
    const data = await this.prisma.emailTemplate.findMany({
      orderBy: { templateKey: "asc" }
    });

    return { data };
  }

  @Patch(":id")
  @RequirePermissions("smtp.update")
  async updateTemplate(@Param("id") id: string, @Body() body: UpdateTemplateBody, @CurrentUser() user: AuthenticatedUser) {
    const existing = await this.prisma.emailTemplate.findUniqueOrThrow({
      where: { id }
    });

    const updated = await this.prisma.emailTemplate.update({
      where: { id },
      data: {
        subject: body.subject ?? existing.subject,
        textBody: body.textBody ?? existing.textBody,
        htmlBody: body.htmlBody ?? existing.htmlBody,
        isEnabled: body.isEnabled ?? existing.isEnabled
      }
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "EMAIL_TEMPLATE_UPDATED",
        entityType: "EMAIL_TEMPLATE",
        entityId: updated.id,
        entityName: updated.templateKey,
        oldValueJson: {
          subject: existing.subject,
          isEnabled: existing.isEnabled
        },
        newValueJson: {
          subject: updated.subject,
          isEnabled: updated.isEnabled
        }
      }
    });

    return updated;
  }
}
