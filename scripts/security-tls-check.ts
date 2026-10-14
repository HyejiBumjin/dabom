import assert from "node:assert/strict";
import { createServer } from "node:net";
import { rootCertificates, checkServerIdentity } from "node:tls";
import { inspect } from "node:util";
import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createPrismaClient, databasePoolConfig } from "../prisma/client.cjs";

loadEnvConfig(process.cwd());
let passed = 0;
function check(name: string, ok: unknown) { assert.ok(ok, name); passed++; console.log(`PASS ${name}`); }
async function certificateDenied(db: PrismaClient, pattern: RegExp) {
  try { await db.$queryRaw`SELECT 1`; return false; }
  catch (error) { return pattern.test(`${String(error)} ${inspect(error, { depth: 4 })}`); }
  finally { await db.$disconnect(); }
}

async function main() {
  const { config } = databasePoolConfig();
  check("TLS required with certificate verification", config.ssl.rejectUnauthorized === true && config.ssl.minVersion === "TLSv1.2");
  check("server hostname pinned to configured DB address", config.ssl.servername === new URL(process.env.DATABASE_URL!).hostname);
  check("SCRAM channel binding remains enabled", config.enableChannelBinding === true);
  check("URI cannot override explicit TLS policy", !new URL(config.connectionString).searchParams.has("sslmode"));
  for (const port of [6543,5432]) {
    const url = new URL(process.env.DATABASE_URL!); url.port=String(port);
    const db=createPrismaClient({datasourceUrl:url.toString()});
    try { await db.$queryRaw`SELECT 1`; check(`actual strict TLS query on pooler port ${port}`,true); }
    finally { await db.$disconnect(); }
  }
  const wrongCA = { ...config, ssl: { ...config.ssl, ca: rootCertificates[0] } };
  check("untrusted CA rejected before authentication", await certificateDenied(new PrismaClient({adapter:new PrismaPg(wrongCA)}), /certificate|issuer|self.?signed/i));
  const wrongName = { ...config, ssl: { ...config.ssl, checkServerIdentity: (_name: string, cert: Parameters<typeof checkServerIdentity>[1]) => checkServerIdentity("wrong.example.invalid", cert) } };
  check("wrong server hostname rejected", await certificateDenied(new PrismaClient({adapter:new PrismaPg(wrongName)}), /does not match|hostname|altname|altnames|IncorrectCertificateName/i));

  // A loopback-only fake PostgreSQL peer rejects SSL. Fail before sending any
  // startup message or credentials; no real account is involved.
  let bytes=0;
  const sockets = new Set<import("node:net").Socket>();
  const server=createServer(socket=>{
    sockets.add(socket);socket.on("close",()=>sockets.delete(socket));
    let negotiated=false;
    socket.on("data",data=>{bytes+=data.length;if(!negotiated){negotiated=true;socket.write("N");}});
  });
  await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));
  try {
    const port=(server.address() as import("node:net").AddressInfo).port;
    const db=createPrismaClient({datasourceUrl:`postgresql://USER:PASSWORD@127.0.0.1:${port}/synthetic?connect_timeout=2&connection_limit=1&sslmode=disable`});
    check("server refusing TLS rejected even with sslmode=disable in URI",await certificateDenied(db,/does not support SSL|SSL.*not|TLS/i));
    check("plaintext peer received only SSL negotiation, no credentials",bytes===8);
  } finally {
    for(const socket of sockets)socket.destroy();
    await new Promise<void>(resolve=>server.close(()=>resolve()));
  }
  console.log(`\n${passed} PASS; actual Prisma driver, trusted/untrusted CA, hostname and plaintext-downgrade checks; no customer rows`);
}
main().catch(()=>{console.error("Database TLS regression failed; credentials and customer details withheld");process.exitCode=1;});
