import { privateJson } from "@/lib/security/request";

export async function GET() {
  return privateJson({ error: "더 이상 제공하지 않는 경로야." }, 410);
}
