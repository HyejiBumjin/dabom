import type { SupabaseClient } from "@supabase/supabase-js";
import type { FortuneInput, FortuneResult } from "./types";
import type { SajuCanonical } from "@/lib/saju/types";
import { normalizeSajuInput, getSajuInputHash } from "@/lib/saju/normalize";
import { fetchAblecitySaju } from "@/lib/saju/ablecity";
import { mapAblecityToCanonical } from "@/lib/saju/map";
import { buildFortuneReportFromAblecity } from "./reportBuilder";
import { generateFortune } from "./engine";

interface BuildFortuneParams {
  input: FortuneInput;
  supabase: SupabaseClient;
}

function asCanonical(row: unknown): SajuCanonical | null {
  if (!row || typeof row !== "object") return null;
  const provider = (row as { provider?: unknown }).provider;
  const providerVersion = (row as { providerVersion?: unknown }).providerVersion;
  const normalizedInput = (row as { normalizedInput?: unknown }).normalizedInput;
  const baseData = (row as { baseData?: unknown }).baseData;
  if (provider !== "ablecity") return null;
  if (typeof providerVersion !== "string") return null;
  if (!normalizedInput || typeof normalizedInput !== "object") return null;
  if (!baseData || typeof baseData !== "object") return null;
  return {
    provider: "ablecity",
    providerVersion,
    normalizedInput: normalizedInput as SajuCanonical["normalizedInput"],
    baseData: baseData as Record<string, unknown>,
  };
}

export async function buildFortuneReport({ input, supabase }: BuildFortuneParams): Promise<FortuneResult> {
  try {
    const normalized = normalizeSajuInput(input);
    const inputHash = getSajuInputHash(normalized);

    console.info("[buildFortuneReport] testing mode -> always calling Ablecity");
    const raw = await fetchAblecitySaju(normalized);
    const canonical = mapAblecityToCanonical(normalized, raw);

    await supabase.from("saju_calculations").upsert(
      {
        input_hash: inputHash,
        normalized_input: normalized,
        provider: "ablecity",
        provider_version: canonical.providerVersion,
        canonical_json: canonical,
        provider_raw: raw,
      },
      {
        onConflict: "input_hash,provider",
        ignoreDuplicates: true,
      }
    );

    return buildFortuneReportFromAblecity(input, canonical, input.interests);
  } catch (error) {
    console.error("[buildFortuneReport] falling back to local engine", error);
    return generateFortune(input, input.interests);
  }
}
