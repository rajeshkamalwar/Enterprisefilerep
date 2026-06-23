import { Body, Controller, Get, Param, Post } from "@nestjs/common";

@Controller("access-requests")
export class AccessRequestsController {
  @Get()
  list() {
    return {
      data: [
        {
          id: "request_demo",
          requester: "Finance Analyst",
          resourceType: "folder",
          resourceId: "folder_finance_2026",
          status: "pending"
        }
      ]
    };
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return {
      id: "request_new",
      status: "pending",
      ...body
    };
  }

  @Post(":id/approve")
  approve(@Param("id") id: string, @Body() body: { decisionReason?: string }) {
    return {
      id,
      status: "approved",
      decisionReason: body.decisionReason ?? null,
      auditRequired: true
    };
  }

  @Post(":id/reject")
  reject(@Param("id") id: string, @Body() body: { decisionReason?: string }) {
    return {
      id,
      status: "rejected",
      decisionReason: body.decisionReason ?? null,
      auditRequired: true
    };
  }
}
