import type { FortuneInput, FortuneResult } from "./types";
import type { SajuCanonical } from "@/lib/saju/types";
import { buildInterpretedReport } from "./buildReport";

export function buildFortuneReportFromAblecity(input: FortuneInput, canonical: SajuCanonical, interests?: string[]): FortuneResult {
  return buildInterpretedReport(input, canonical, interests);
}
