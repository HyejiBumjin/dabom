import { getSajuAccount } from "@/lib/saju/account";
import { privateJson, securityErrorResponse } from "@/lib/security/request";

/** Read-only identity check; never creates an account or renews a session. */
export async function GET() {
  try {
    const account = await getSajuAccount();
    return account ? privateJson({ accountId: account.id }) : privateJson({ error: "로그인이 필요해." }, 401);
  } catch (error) { return securityErrorResponse(error); }
}
