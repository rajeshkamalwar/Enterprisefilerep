import { Body, Controller, Get, Param, Post } from "@nestjs/common";

@Controller("reports")
export class ReportsController {
  @Get("storage")
  storageReport() {
    return {
      data: [
        { department: "Finance", usedGb: 420, files: 6240 },
        { department: "HR", usedGb: 180, files: 3180 },
        { department: "Legal", usedGb: 260, files: 1290 }
      ]
    };
  }

  @Post(":reportType/export")
  exportReport(@Param("reportType") reportType: string, @Body() body: { format: string }) {
    return {
      exportId: `export_${reportType}`,
      reportType,
      format: body.format,
      status: "queued"
    };
  }
}
