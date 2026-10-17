import { NextResponse } from "next/server";
import { generateReport } from "@/lib/llm/report-generator";
import { firebaseStore } from "@/lib/firebase/store";
import { PUBLIC_REPORT_FAILURE_MESSAGE } from "@/lib/llm/report-messages";
import { getSajuAccount, canReadSajuReport } from "@/lib/saju/account";
import { guardedMutation } from "@/lib/security/request";
import { enforceAccountRateLimit } from "@/lib/security/rate-limit";

// Generation and editorial repair share a bounded request budget.
export const maxDuration = 55;

export async function POST(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  return guardedMutation(request, async () => {
  const { reportId } = await params;
  const account = await getSajuAccount();
  if (!account) return NextResponse.json({ error: "로그인이 필요해." }, { status: 401 });
  const report = await firebaseStore.getReportWithAccess(reportId);
  if (!report || !canReadSajuReport(report, account)) return NextResponse.json({ error: "리포트를 찾을 수 없습니다." }, { status: 404 });
  await enforceAccountRateLimit(account.id, "report-generate", 6, 3_600_000);
  await enforceAccountRateLimit(account.id, `report-generate:${reportId}`, 3, 900_000);
  try {
    await generateReport(reportId);
    const result = await firebaseStore.getReportWithAccess(reportId);
    if (!result || result.status === "FAILED") return NextResponse.json({ ok: false, error: PUBLIC_REPORT_FAILURE_MESSAGE }, { status: 503 });
    return NextResponse.json({ ok: true, status: result.status });
  } catch {
    console.error("[Report] Generation request failed", { reportId });
    return NextResponse.json({ ok: false, error: PUBLIC_REPORT_FAILURE_MESSAGE }, { status: 503 });
  }
  });
}
