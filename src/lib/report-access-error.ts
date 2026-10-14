/** Keep authorization failures distinct from temporary network/server failures. */
export class ReportAccessError extends Error {
  constructor(public readonly status: number) { super("리포트를 불러오지 못했습니다."); }
}
