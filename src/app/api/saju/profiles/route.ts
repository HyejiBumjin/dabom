import { NextResponse } from "next/server";
import { getSajuAccount } from "@/lib/saju/account";
import { profileInputSchema } from "@/lib/saju/profile-input";
import { findExistingSajuReport, saveSajuProfile } from "@/lib/saju/library-service";
import { guardedMutation, readJsonBody } from "@/lib/security/request";
import { enforceAccountRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  return guardedMutation(request, async () => {
    const account = await getSajuAccount();
    if (!account) return NextResponse.json({ error: "운세를 받으려면 카카오 로그인이 필요해." }, { status: 401 });
    await enforceAccountRateLimit(account.id, "profiles", 20, 3_600_000);
    const parsed = profileInputSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) return NextResponse.json({ error: "입력값을 다시 확인해 주세요." }, { status: 400 });
    const report = await findExistingSajuReport(account.id, parsed.data);
    if (report) return NextResponse.json({ profileId: report.sajuProfileId, existing: true, existingReport: true, reportId: report.id });
    const result = await saveSajuProfile(account.id, parsed.data);
    return NextResponse.json(result, { status: result.existing ? 200 : 201 });
  });
}
