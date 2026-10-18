/** Keep authorization failures distinct from temporary network/server failures. */
export class ReportAccessError extends Error {
  constructor(public readonly status: number, public readonly retryAfter = 1, public readonly code?: "PAYMENT_VERIFICATION_REQUIRED") { super("리포트를 불러오지 못했습니다."); }
}

export function retryAfterSeconds(value: string | null) {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(60, Math.ceil(seconds)) : 5;
}
