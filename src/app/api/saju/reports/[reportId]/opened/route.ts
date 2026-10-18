import { getSajuAccount } from "@/lib/saju/account";
import { firebaseStore } from "@/lib/firebase/store";
import { guardedMutation, privateJson } from "@/lib/security/request";
import { enforceAccountRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  return guardedMutation(request, async () => {
    const account = await getSajuAccount();
    if (!account) return privateJson({ error: "로그인이 필요해." }, 401);
    await enforceAccountRateLimit(account.id, "report-opened", 60, 60_000);
    const { reportId } = await params;
    const recorded = await firebaseStore.markReportReceipt(account.id, reportId, "opened");
    return recorded ? new Response(null, { status: 204 }) : privateJson({ error: "리포트를 찾을 수 없습니다." }, 404);
  });
}
