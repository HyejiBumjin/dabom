import { env } from "@/lib/env";
import type { NormalizedSajuInput } from "./types";

export interface AblecitySajuResponse {
  [key: string]: unknown;
}

function normalizeGender(gender?: string): string {
  const value = (gender || "").toLowerCase();
  if (value === "m" || value === "male" || value === "남성") return "male";
  if (value === "f" || value === "female" || value === "여성") return "female";
  return value || "male";
}

function normalizeBirth(input: NormalizedSajuInput): string {
  const date = input.birthDate;
  const rawTime = (input.birthTime || "").trim();
  const time = !rawTime || rawTime === "모름" ? "00:00:00" : `${rawTime}:00`;
  return `${date}T${time}`;
}

export async function fetchAblecitySaju(input: NormalizedSajuInput): Promise<AblecitySajuResponse> {
  if (!env.ABLECITY_API_URL || !env.ABLECITY_API_KEY) {
    throw new Error("Ablecity not configured");
  }

  const controller = new AbortController();
  const timeoutMs = parseInt(env.ABLECITY_TIMEOUT_MS || "10000", 10) || 10000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = new URL(env.ABLECITY_API_URL);
    url.searchParams.set("birth", normalizeBirth(input));
    url.searchParams.set("gender", normalizeGender(input.gender));
    url.searchParams.set("city", env.ABLECITY_CITY);
    console.info("[Ablecity] request", {
      url: url.toString(),
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      gender: input.gender,
    });

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.ABLECITY_API_KEY}`,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as AblecitySajuResponse;
    if (!res.ok) {
      throw new Error(`Ablecity request failed (${res.status}): ${JSON.stringify(data)}`);
    }
    console.info("[Ablecity] response ok", { status: res.status });

    return data;
  } finally {
    clearTimeout(timeout);
  }
}
