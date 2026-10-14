/* eslint-disable @typescript-eslint/no-require-imports -- Shared Node/Next.js database factory and deployment tooling. */
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { X509Certificate } = require("node:crypto");

// Public CA downloaded from the project's authenticated Supabase settings.
const SUPABASE_CA_FINGERPRINT = "80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA";

function databasePoolConfig(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error("Database connection is not configured");
  const url = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("Invalid database connection");
  const ca = readFileSync(join(process.cwd(), "prisma", "certs", "supabase-ca.crt"), "utf8");
  const certificate = new X509Certificate(ca);
  if (!certificate.ca || certificate.fingerprint256 !== SUPABASE_CA_FINGERPRINT || Date.parse(certificate.validTo) <= Date.now()) throw new Error("Trusted database CA is missing or expired");
  const limit = url.searchParams.get("connection_limit");
  const timeout = url.searchParams.get("connect_timeout");
  const schema = url.searchParams.get("schema") || "public";
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) throw new Error("Invalid database schema");
  const max = limit === null ? 10 : Number(limit);
  const seconds = timeout === null ? 5 : Number(timeout);
  if (!Number.isSafeInteger(max) || max < 1 || max > 100 || !Number.isFinite(seconds) || seconds <= 0 || seconds > 60) throw new Error("Invalid database pool configuration");
  // node-postgres URI SSL options can replace the explicit ssl object. Strip
  // them before passing an immutable TLS policy to the official adapter.
  for (const key of ["ssl", "sslmode", "sslcert", "sslrootcert", "sslkey", "sslidentity", "sslpassword", "sslaccept", "sslnegotiation", "uselibpqcompat", "channel_binding", "schema", "connection_limit", "connect_timeout", "pgbouncer"]) url.searchParams.delete(key);
  return {
    schema,
    config: {
      connectionString: url.toString(), max, connectionTimeoutMillis: seconds * 1000,
      enableChannelBinding: true,
      ssl: { ca, rejectUnauthorized: true, servername: url.hostname, minVersion: "TLSv1.2" },
    },
  };
}

function createPrismaClient(options = {}) {
  // Preserve Prisma's lazy connection behavior for static builds and mocks.
  const getAdapter = () => {
    const { config, schema } = databasePoolConfig(options.datasourceUrl);
    return new PrismaPg(config, { schema });
  };
  return new PrismaClient({ adapter: {
    provider: "postgres", adapterName: "@prisma/adapter-pg",
    connect: () => getAdapter().connect(),
    connectToShadowDb: () => getAdapter().connectToShadowDb(),
  } });
}

module.exports = { createPrismaClient, databasePoolConfig, SUPABASE_CA_FINGERPRINT };
