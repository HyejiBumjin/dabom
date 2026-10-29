import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
const require = createRequire(import.meta.url);
const testEnv = process.env as Record<string, string | undefined>;
testEnv.NODE_ENV = "production"; testEnv.NEXT_PUBLIC_APP_URL = "https://dabom.test";
const authPath = require.resolve("../src/lib/firebase/auth"); require(authPath);
let identity: {id:string} | null = null;
require.cache[authPath]!.exports = { ...require(authPath), getFirebaseAccount: async () => identity };
const limitsPath = require.resolve("../src/lib/security/rate-limit"); require(limitsPath);
let limited = false;
const { RequestSecurityError } = require("../src/lib/security/request");
require.cache[limitsPath]!.exports = { enforceAccountRateLimit: async () => { if (limited) throw new RequestSecurityError(429, "limited"); } };
const servicePath = require.resolve("../src/lib/privacy/service-request"); const service = require(servicePath);
let created = 0;
require.cache[servicePath]!.exports = { ...service, createServiceRequest: async (_store: unknown, uid: string, data: {orderId?:string}) => { assert.equal(uid,"verified-owner"); if(data.orderId) throw new Error("ORDER_NOT_FOUND"); created++; return "support_fixture"; } };
const { POST } = require("../src/app/api/support/requests/route");
const body = {kind:"ACCOUNT_DELETE",requestKey:randomUUID(),deletionAcknowledged:true};
function request(value: unknown=body, origin="https://dabom.test",type="application/json") { return new Request("https://dabom.test/api/support/requests",{method:"POST",headers:{origin,"content-type":type},body:JSON.stringify(value)}); }
let passed=0; const check=(name:string,ok:unknown)=>{assert.ok(ok,name);passed++;console.log(`PASS ${name}`);};
async function main(){
check("anonymous request rejected",(await POST(request())).status===401);
identity={id:"verified-owner"};
check("cross-site request rejected",(await POST(request(body,"https://evil.test"))).status===403);
check("simple form CSRF rejected",(await POST(request(body,"https://dabom.test","text/plain"))).status===415);
for(const input of [{...body,userId:"victim"},{...body,deletionAcknowledged:false},{...body,kind:"ERASE_NOW"},{...body,requestKey:"../x"}]) check("forged or incomplete input rejected",(await POST(request(input))).status===400);
check("oversized body rejected",(await POST(request({...body,extra:"x".repeat(9000)}))).status===413);
limited=true;check("quota applied before request creation",(await POST(request())).status===429);limited=false;
check("unknown/foreign order gets generic not-found",(await POST(request({kind:"REFUND",requestKey:randomUUID(),orderId:"saju_other"}))).status===404);
check("rejected requests never create a ticket",created===0);
const response=await POST(request());check("authenticated explicit request accepted",response.status===201&&created===1);
check("receipt response is private and no-store",response.headers.get("cache-control")==="private, no-store");
check("response only exposes a receipt number",JSON.stringify(await response.json())==='{"requestId":"support_fixture"}');
check("processing-stop requests are accepted separately from deletion", (await POST(request({kind:"PRIVACY_STOP",requestKey:randomUUID()}))).status===201);
check("processing-stop cannot smuggle a third party identity", (await POST(request({kind:"PRIVACY_STOP",requestKey:randomUUID(),userId:"victim"}))).status===400);
console.log(`Support endpoint: ${passed} passed; no customer data, mail, deletion or payment calls.`);
}
main().catch(e=>{console.error(e);process.exitCode=1});
