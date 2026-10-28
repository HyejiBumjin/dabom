import { getSajuAccount } from "@/lib/saju/account";
import { firebaseStore } from "@/lib/firebase/store";
import { createServiceRequest, serviceRequestSchema } from "@/lib/privacy/service-request";
import { guardedMutation, privateJson, readJsonBody, RequestSecurityError } from "@/lib/security/request";
import { enforceAccountRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  return guardedMutation(request, async () => {
    const account = await getSajuAccount();
    if (!account) return privateJson({ error: "요청을 남기려면 카카오로 로그인해줘." }, 401);
    await enforceAccountRateLimit(account.id, "support-request", 6, 86_400_000);
    const parsed = serviceRequestSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) return privateJson({ error: "요청 항목을 확인해줘." }, 400);
    try { return privateJson({ requestId: await createServiceRequest(firebaseStore, account.id, parsed.data) }, 201); }
    catch (error) {
      if (error instanceof Error && error.message === "ORDER_NOT_FOUND") throw new RequestSecurityError(404, "이 계정의 주문을 찾지 못했어. 주문번호를 비우고 접수해도 돼.");
      throw error;
    }
  });
}
