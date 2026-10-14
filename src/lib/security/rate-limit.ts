import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { RequestSecurityError } from "./request";

/** Shared Postgres counter: works across serverless instances and concurrent requests. */
export async function enforceAccountRateLimit(accountId: string, scope: string, limit: number, windowMs: number, db: Pick<typeof prisma, "$queryRaw"> = prisma) {
  const bucket = Math.floor(Date.now() / windowMs);
  const key = createHash("sha256").update(`${accountId}:${scope}:${bucket}`).digest("hex");
  const resetAt = new Date((bucket + 1) * windowMs);
  const rows = await db.$queryRaw<Array<{ hits: number }>>`
    INSERT INTO "SecurityRateLimit" ("key", "hits", "resetAt") VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET "hits" = "SecurityRateLimit"."hits" + 1
    WHERE "SecurityRateLimit"."hits" < ${limit}
    RETURNING "hits"
  `;
  if (!rows.length) throw new RequestSecurityError(429, "요청이 많아. 잠시 뒤 다시 시도해줘.");
}
