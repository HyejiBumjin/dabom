import { NextResponse } from "next/server";
import { firebaseStore } from "@/lib/firebase/store";
import type { ReportContent } from "@/lib/llm/types";
import { PUBLIC_REPORT_FAILURE_MESSAGE } from "@/lib/llm/report-messages";
import { getSajuAccount, canReadSajuReport } from "@/lib/saju/account";

import { securityErrorResponse } from "@/lib/security/request";

export async function GET(_request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  try {
  const { reportId } = await params;
  const account = await getSajuAccount();
  if (!account) return NextResponse.json({ error: "로그인이 필요해." }, { status: 401 });
  const report = await firebaseStore.getReportWithAccess(reportId);
  if (!report || !canReadSajuReport(report, account)) return NextResponse.json({ error: "리포트를 찾을 수 없습니다." }, { status: 404 });
  if (report.status === "COMPLETED" && report.content && report.order?.status === "PAID") {
    // A receipt outage must not withhold already purchased content.
    await firebaseStore.markReportReceipt(account.id, reportId, "delivered").catch(() => console.error("[report-receipt] delivery record unavailable"));
  }
  return NextResponse.json({ id: report.id, status: report.status, content: report.content as ReportContent | null, lastError: report.status === "FAILED" ? PUBLIC_REPORT_FAILURE_MESSAGE : null, recordOpening: report.status === "COMPLETED" && report.order?.status === "PAID" }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return securityErrorResponse(error); }
}
