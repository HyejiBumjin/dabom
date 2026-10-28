import { z } from "zod";

export type ReportPreparation =
  | { kind: "checkout"; href: string }
  | { kind: "report"; href: string }
  | { kind: "existing"; reportId: string };

export class ReportLoginRequired extends Error {}
export class ReportRequestError extends Error {}

const reportResponseSchema = z.object({
  reportId: z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
  existing: z.boolean(),
});

/** Prepare the saved profile's comprehensive yearly report. */
export async function requestSajuReport(profileId: string, signal: AbortSignal): Promise<ReportPreparation> {
  try {
    const response = await fetch(`/api/saju/profiles/${encodeURIComponent(profileId)}/reports`, {
      method: "POST", signal,
    });
    if (response.status === 401) throw new ReportLoginRequired();
    if (response.status === 402) {
      return { kind: "checkout", href: `/saju/profiles/${encodeURIComponent(profileId)}/checkout` };
    }
    const data: unknown = await response.json();
    if (!response.ok) {
      const error = z.object({ error: z.string().min(1).max(240) }).safeParse(data);
      throw new ReportRequestError(error.success ? error.data.error : "리포트를 준비하지 못했어. 잠시 뒤 다시 눌러줘.");
    }
    const result = reportResponseSchema.safeParse(data);
    if (!result.success) throw new ReportRequestError("리포트 정보를 확인하지 못했어. 잠시 뒤 다시 눌러줘.");
    return result.data.existing
      ? { kind: "existing", reportId: result.data.reportId }
      : { kind: "report", href: `/saju/reports/${encodeURIComponent(result.data.reportId)}` };
  } catch (cause) {
    if (signal.aborted) throw cause;
    if (cause instanceof SyntaxError || cause instanceof TypeError) throw new ReportRequestError("리포트 서버에 연결하지 못했어. 잠시 뒤 다시 눌러줘.");
    throw cause;
  }
}
