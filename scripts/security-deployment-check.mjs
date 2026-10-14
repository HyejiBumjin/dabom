import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const target = new URL(process.env.SECURITY_DEPLOYMENT_URL);
assert.ok(target.protocol === "https:" && (target.hostname === "dabom-letter.com" || /^dabom-[a-z0-9]+-bjhj\.vercel\.app$/.test(target.hostname)), "Only the dabom deployment is tested");
let passed = 0;
function verify(name, condition) { assert.ok(condition, name); passed++; console.log(`PASS ${name}`); }

function request(path, { method = "GET", body, headers = {} } = {}) {
  const args = ["curl", path, "--deployment", target.origin, "--", "--silent", "--show-error", "--include", "--max-time", "30", "--request", method];
  for (const [key,value] of Object.entries(headers)) args.push("--header", `${key}: ${value}`);
  if (body !== undefined) args.push("--data-raw", body);
  const result = spawnSync("vercel", args, { encoding: "utf8", maxBuffer: 4 * 1024 * 1024, timeout: 45000 });
  assert.equal(result.status, 0, `Transport failed: ${method} ${path}`);
  let raw = result.stdout.trimStart();
  let status, parsed;
  do {
    const separator = raw.indexOf("\r\n\r\n") >= 0 ? "\r\n\r\n" : "\n\n";
    const end = raw.indexOf(separator);
    assert.ok(end >= 0, "HTTP response headers required");
    const lines = raw.slice(0,end).split(/\r?\n/);
    status = Number(lines.shift()?.match(/^HTTP\/\S+\s+(\d{3})/)?.[1]);
    parsed = new Headers();
    for (const line of lines) {
      const colon = line.indexOf(":");
      if (colon > 0) parsed.append(line.slice(0,colon),line.slice(colon+1).trim());
    }
    raw = raw.slice(end+separator.length);
  } while (/^HTTP\//.test(raw));
  // Never emit cookies, platform bypass credentials, headers or raw content.
  assert.ok(!/postgresql:\/\/|OPENAI_API_KEY|PrismaClientKnownRequestError/.test(raw), "Internal details leaked");
  return { status, headers: parsed, body: raw };
}
function check(path, status, options) {
  const response = request(path,options);
  verify(`${options?.method || "GET"} ${path}: ${response.status}`, (Array.isArray(status) ? status : [status]).includes(response.status));
  return response;
}

try {
  const home=check("/",200);
  verify("retro home renders",home.body.includes("retro-window"));
  for (const [key,value] of [["x-content-type-options","nosniff"],["x-frame-options","DENY"],["referrer-policy","no-referrer"]]) verify(key,home.headers.get(key)===value);
  verify("minimal CSP",home.headers.get("content-security-policy")?.includes("frame-ancestors 'none'"));
  verify("HSTS",Number(home.headers.get("strict-transport-security")?.match(/max-age=(\d+)/)?.[1])>=31536000);
  verify("framework header suppressed",!home.headers.has("x-powered-by"));
  check("/login",200);
  const api = [["GET","/api/auth/account"],["POST","/api/saju/profiles"],["POST","/api/saju/profiles/security-deployment-probe/reports"],["GET","/api/saju/reports/security-deployment-probe"],["POST","/api/saju/reports/security-deployment-probe/generate"],["POST","/api/saju/payments/prepare"],["POST","/api/saju/payments/confirm"]];
  for (const [method,path] of api) {
    const options={method,headers:{"content-type":"application/json"},...(method==="POST"?{body:"{}"}:{})};
    const response=check(path,401,options);
    verify(`private cache ${path}`,/private/.test(response.headers.get("cache-control")) && /no-store/.test(response.headers.get("cache-control")));
    if(method==="POST") check(path,403,{...options,headers:{...options.headers,origin:"https://evil.invalid"}});
  }
  for(const path of ["/saju","/saju/library","/saju/profiles/security-deployment-probe","/saju/reports/security-deployment-probe","/saju/profiles/security-deployment-probe/checkout"]) {
    const r=check(path,307);
    verify(`login gate ${path}`,new URL(r.headers.get("location"),target).pathname==="/login");
  }
  for(const path of ["/api/payments/prepare","/api/payments/confirm","/api/reports/create","/api/letters/create","/api/saju/test"]) check(path,410,{method:"POST",headers:{"content-type":"application/json"},body:"{}"});
  check("/api/reports/00000000-0000-4000-8000-000000000000",410);
  for(const path of ["/.env.local","/.git/config","/prisma/schema.prisma","/preview/report","/design/report-essay","/saju/preview/library","/gift/security-deployment-probe","/checkout/success"]) check(path,404);
  check("/api/saju/payments/webhook",503,{method:"POST",headers:{"content-type":"application/json"},body:'{"type":"Transaction.Paid","data":{"paymentId":"forged","storeId":"forged"}}'});
  const callback=check("/api/auth/callback?next=%2F%2Fevil.invalid",307,{headers:{"x-forwarded-host":"evil.invalid","x-forwarded-proto":"https"}});
  verify("callback fixed to owned origin",new URL(callback.headers.get("location")).origin==="https://dabom-letter.com");
  const login=check("/api/auth/login?next=%2Fsaju%2Flibrary",307);
  const provider=new URL(login.headers.get("location"));
  const redirect=new URL(provider.searchParams.get("redirect_to"));
  verify("Kakao OAuth configured",provider.hostname.endsWith(".supabase.co") && provider.searchParams.get("provider")==="kakao");
  verify("OAuth return uses owned domain",redirect.origin==="https://dabom-letter.com" && redirect.pathname==="/api/auth/callback");
  verify("PKCE cookie Secure",/;\s*Secure/i.test(login.headers.get("set-cookie") || ""));
  verify("PKCE cookie SameSite=Lax",/;\s*SameSite=lax/i.test(login.headers.get("set-cookie") || ""));
  console.log(`\n${passed} PASS; anonymous/synthetic requests only, no user login, customer rows, real payments or LLM calls`);
} catch(error) {
  console.error(error instanceof assert.AssertionError ? error.message : "Deployment verification failed; sensitive details withheld");
  process.exitCode=1;
}
