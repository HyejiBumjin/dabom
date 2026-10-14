import { privateJson } from "@/lib/security/request";

/** Retired flow: never consult the database, provider, or LLM. */
export async function POST() {
  return privateJson({ error: "더 이상 제공하지 않는 경로야." }, 410);
}
