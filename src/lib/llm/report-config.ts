/** Defaults shared by report creation, rendering, and the development view. */
export const DEFAULT_REPORT_TONE = "genz" as const;
export const DEFAULT_REPORT_MODEL = "gpt-6-luna";

export function getConfiguredReportModel() {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_REPORT_MODEL;
}

/** Preserve the writing workload's reasoning budget for each model. */
export function getReportModelOptions(model: string) {
  if (model === "gpt-6.1-sol") {
    return { reasoning: { effort: "low" as const }, max_output_tokens: 8_000 };
  }
  if (model === "gpt-6-luna") {
    return { reasoning: { effort: "none" as const }, max_output_tokens: 4_800 };
  }
  return { max_output_tokens: 4_800 };
}
