import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AccessRequestStatus, ResourceType } from "@prisma/client";
import { AuthGuard } from "../auth/auth.guard";
import { RequestWithUser } from "../auth/auth.guard";
import { RequirePermissions } from "../rbac/permissions.decorator";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { AccessRequestsService } from "./access-requests.service";

type CreateAccessRequestBody = {
  resourceType: ResourceType;
  resourceId: string;
  permissionKey: string;
  businessJustification: string;
};

type AccessRequestListQuery = {
  status?: AccessRequestStatus;
  page?: string;
  pageSize?: string;
};

@UseGuards(AuthGuard, PermissionsGuard)
@Controller("access-requests")
export class AccessRequestsController {
  constructor(private readonly accessRequests: AccessRequestsService) {}

  @Get()
  @RequirePermissions("permission.assign")
  list(@Query() query: AccessRequestListQuery) {
    return this.accessRequests.list({
      status: query.status,
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined
    });
  }

  @Post()
  @RequirePermissions("file.read")
  create(@Body() body: CreateAccessRequestBody, @Req() request: RequestWithUser) {
    return this.accessRequests.create(body, request.user!.id);
  }

  @Post(":id/approve")
  @RequirePermissions("permission.assign")
  approve(@Param("id") id: string, @Body() body: { decisionReason?: string }, @Req() request: RequestWithUser) {
    return this.accessRequests.approve(id, request.user!.id, body.decisionReason);
  }

  @Post(":id/reject")
  @RequirePermissions("permission.assign")
  reject(@Param("id") id: string, @Body() body: { decisionReason?: string }, @Req() request: RequestWithUser) {
    return this.accessRequests.reject(id, request.user!.id, body.decisionReason);
  }
}
