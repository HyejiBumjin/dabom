import type { NormalizedSajuInput, SajuCanonical } from "./types";
import type { AblecitySajuResponse } from "./ablecity";

export function mapAblecityToCanonical(
  input: NormalizedSajuInput,
  raw: AblecitySajuResponse
): SajuCanonical {
  const providerVersion =
    typeof raw.providerVersion === "string"
      ? raw.providerVersion
      : typeof raw.version === "string"
        ? raw.version
        : "unknown";

  return {
    provider: "ablecity",
    providerVersion,
    normalizedInput: input,
    baseData: raw,
  };
}
