/** Keep the model, HTTP client and generation lease budgets in this order. */
export const REPORT_RENDER_BUDGET_MS = 100_000;
export const REPORT_MIN_ATTEMPT_MS = 5_000;
// The route's statically analysed maxDuration is 120 seconds.
export const REPORT_CLIENT_TIMEOUT_MS = 130_000;
export const REPORT_GENERATION_LEASE_MS = 180_000;

/** Operational metadata only: never include prompts, excerpts or personal data. */
export interface ReportGenerationDiagnostics {
  elapsedMs: number;
  stopReason: "completed" | "budget" | "attempt-limit" | "provider";
  attempts: Array<{
    attempt: number;
    elapsedMs: number;
    outcome: "completed" | "validation" | "schema" | "provider";
    sections: string[];
    issueCount?: number;
    status?: number;
    responseStatus?: string;
    inputTokens?: number;
    outputTokens?: number;
  }>;
}
