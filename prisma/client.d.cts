import type { PrismaClient } from "@prisma/client";
import type { PrismaPg } from "@prisma/adapter-pg";

export function createPrismaClient(options?: { datasourceUrl?: string }): PrismaClient;
export function databasePoolConfig(connectionString?: string): {
  schema: string;
  config: ConstructorParameters<typeof PrismaPg>[0] & {
    connectionString: string;
    ssl: { ca: string; rejectUnauthorized: true; servername: string; minVersion: "TLSv1.2" };
    enableChannelBinding: true;
  };
};
export const SUPABASE_CA_FINGERPRINT: string;
