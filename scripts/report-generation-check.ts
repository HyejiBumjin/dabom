import fs from "node:fs";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Responses } from "openai/resources/responses/responses";
import { prisma } from "../src/lib/db";
import { generateReport } from "../src/lib/llm/report-generator";
import { ANNUAL_OPENING, containsReaderName, repairRepeatedAnnualOpenings } from "../src/lib/llm/report-rules";
import { PUBLIC_REPORT_FAILURE_MESSAGE } from "../src/lib/llm/report-messages";
import { KoreanPolicyAdapter } from "../src/lib/saju/korean-policy-adapter";
import { GET } from "../src/app/api/saju/reports/[reportId]/route";
import { POST } from "../src/app/api/saju/reports/[reportId]/generate/route";
import { EssayReportView } from "../src/components/EssayReportView";
import type { ReportContent } from "../src/lib/llm/types";

type Draft = { sections: Array<{ section_id: string; paragraph: string }> };
type Update = { status?: string; content?: ReportContent; lastError?: string | null };
type RenderRequest = { input: Array<{ content: string }>; text: { format: { schema: { properties: { sections: { items: { properties: { section_id: { enum: string[] } } } } } } } } };

const fixture = JSON.parse(fs.readFileSync("scripts/fixtures/report-style-draft.json", "utf8")) as { paragraphs: string[] };
const ids = ["essence", "yearly", "relation", "career", "mental", "summary"];
const valid: Draft = { sections: fixture.paragraphs.map((paragraph, index) => ({ section_id: ids[index], paragraph })) };
const myeongsik = new KoreanPolicyAdapter().calculate({ birthDate: "1995-05-20", birthTime: "20:20", gender: "female", calendar: "solar" });
const readerName = "김가람";
const updates: Update[] = [];
const requests: RenderRequest[] = [];
const warnings: unknown[][] = [];
let source = structuredClone(valid);
let stored: ReportContent | null = null;
let reply: (requested: string[], attempt: number) => Draft;
let advanceTime = false;
let timeOffset = 0;
let claimCount = 1;
let completedAtStart = false;
let invalidCalculation = false;
let tests = 0;

const originals = { create: Responses.prototype.create, find: prisma.report.findUnique, claim: prisma.report.updateMany, update: prisma.report.update, now: Date.now, warn: console.warn, apiKey: process.env.OPENAI_API_KEY };

async function scenario(name: string, options: { change?: (draft: Draft) => void; response?: typeof reply; resume?: boolean; timeout?: boolean; claim?: number; alreadyComplete?: boolean; invalidCalculation?: boolean } = {}) {
  source = structuredClone(valid);
  options.change?.(source);
  updates.length = 0;
  requests.length = 0;
  warnings.length = 0;
  timeOffset = 0;
  stored = options.resume ? { paragraphs: source.sections.map(section => section.paragraph), meta: { charCount: 0, beats: [], termsUsed: [] } } : null;
  advanceTime = options.timeout ?? false;
  claimCount = options.claim ?? 1;
  completedAtStart = options.alreadyComplete ?? false;
  invalidCalculation = options.invalidCalculation ?? false;
  reply = options.response ?? ((requested, attempt) => ({ sections: (attempt === 1 ? source : valid).sections.filter(section => requested.includes(section.section_id)) }));
  await generateReport(`check-${name}`);
  tests += 1;
  return updates.at(-1);
}

async function main() {
  // Every API and database method below is stubbed in this process. This check
  // never calls a model, writes a real report, or needs production credentials.
  process.env.OPENAI_API_KEY = "test-key-no-network";
  try {
    Date.now = () => originals.now() + timeOffset;
    console.warn = (...args: unknown[]) => { warnings.push(args); };
    prisma.report.findUnique = (async () => ({ id: "fixture", status: completedAtStart ? "COMPLETED" : stored ? "FAILED" : "PENDING", content: stored, sajuProfile: { name: readerName, myeongsik: invalidCalculation ? {} : myeongsik } })) as unknown as typeof originals.find;
    prisma.report.updateMany = (async () => ({ count: claimCount })) as unknown as typeof originals.claim;
    prisma.report.update = (async (args: { data: Update }) => { updates.push(structuredClone(args.data)); return args.data; }) as unknown as typeof originals.update;
    Responses.prototype.create = (async (raw: unknown) => {
      const request = raw as RenderRequest;
      requests.push(request);
      assert(!JSON.stringify(request.input).includes(readerName), "Full name leaked to the model");
      assert(!JSON.stringify(request.input).includes(readerName.slice(1)), "Given name leaked to the model");
      const response = reply(request.text.format.schema.properties.sections.items.properties.section_id.enum, requests.length);
      if (advanceTime) timeOffset = 60_000;
      return { output_text: JSON.stringify(response) };
    }) as unknown as typeof originals.create;

    let result = await scenario("automatic-opening-repair", { change: draft => {
      for (const [index, prefix] of [[2, "올해에는 "], [3, "2026년은 "], [4, "이번 해에는 "], [5, "올 한 해의 "]] as const) draft.sections[index].paragraph = prefix + draft.sections[index].paragraph;
    } });
    assert.equal(result?.status, "COMPLETED");
    assert.equal(requests.length, 1);
    assert.deepEqual(result.content?.paragraphs, fixture.paragraphs);
    assert.equal(result.content?.paragraphs.filter(paragraph => ANNUAL_OPENING.test(paragraph)).length, 1);

    const uneditableOpening = (draft: Draft) => { draft.sections[3].paragraph = draft.sections[3].paragraph.replace(/^[^.]+\./u, "올해가 너에게 묻는 건 일과 자원을 어떻게 나눌지야."); };
    const repeatResponse = (requested: string[]) => ({ sections: source.sections.filter(section => requested.includes(section.section_id)) });
    result = await scenario("style-limit-fallback", { change: uneditableOpening, response: repeatResponse });
    assert.equal(result?.status, "COMPLETED");
    assert.equal(requests.length, 2);
    assert.equal(result.lastError, null);
    assert(updates.some(update => update.content && !update.status), "Usable draft wasn't persisted before the repair");
    assert.deepEqual(result.content?.paragraphs, source.sections.map(section => section.paragraph));
    assert.equal(warnings.length, 1);

    result = await scenario("repair-api-timeout", { change: uneditableOpening, response: (requested, attempt) => {
      if (attempt > 1) {
        assert(updates.some(update => update.content && !update.status));
        throw new Error("Simulated provider timeout");
      }
      return repeatResponse(requested);
    } });
    assert.equal(result?.status, "COMPLETED");
    assert.equal(requests.length, 2);

    result = await scenario("repair-time-budget", { change: uneditableOpening, response: repeatResponse, timeout: true });
    assert.equal(result?.status, "COMPLETED");
    assert.equal(requests.length, 1);

    result = await scenario("worse-rewrite-keeps-best", { change: uneditableOpening, response: (requested, attempt) => {
      const response = repeatResponse(requested);
      if (attempt > 1) response.sections = response.sections.map(section => ({ ...section, paragraph: section.paragraph + " 화이팅. 한번 해보자." }));
      return response;
    } });
    assert.equal(result?.status, "COMPLETED");
    assert.deepEqual(result.content?.paragraphs, source.sections.map(section => section.paragraph));

    result = await scenario("rewrite-drops-evidence", { change: uneditableOpening, response: (requested, attempt) => {
      const response = repeatResponse(requested);
      if (attempt > 1) response.sections = response.sections.map(section => ({ ...section, paragraph: section.paragraph.replace(/갑신|대운|정재/gu, "배경") }));
      return response;
    } });
    assert.equal(result?.status, "COMPLETED");
    assert.equal(requests.length, 2);
    assert.deepEqual(result.content?.paragraphs, source.sections.map(section => section.paragraph));

    result = await scenario("small-length-deviation", { change: draft => { draft.sections[4].paragraph = draft.sections[4].paragraph.replace("스스로에게 높은 기준을 설정하면서", "기준을 세우면서"); }, response: repeatResponse });
    assert.equal(result?.status, "COMPLETED");
    assert.equal(requests.length, 2);
    assert((result.content?.paragraphs[4].length ?? 0) < 200);

    result = await scenario("evidence-repair-preserves-other-paragraphs", { change: draft => { draft.sections[0].paragraph = draft.sections[0].paragraph.replace(/정관|병오/gu, "역할"); } });
    assert.equal(result?.status, "COMPLETED");
    assert.equal(requests.length, 2);
    assert.deepEqual(requests[1].text.format.schema.properties.sections.items.properties.section_id.enum, ["essence"]);
    assert.deepEqual(result.content?.paragraphs, fixture.paragraphs);

    for (const [name, change] of [
      ["missing-annual-evidence", (draft: Draft) => { draft.sections[0].paragraph = draft.sections[0].paragraph.replace(/정관|병오/gu, "역할"); }],
      ["missing-month", (draft: Draft) => { draft.sections[2].paragraph = draft.sections[2].paragraph.replaceAll("10월", "가을"); }],
      ["name-leak", (draft: Draft) => { draft.sections[0].paragraph = `${readerName}, ${draft.sections[0].paragraph}`; }],
      ["given-name-leak", (draft: Draft) => { draft.sections[0].paragraph = `${readerName.slice(1)}야, ${draft.sections[0].paragraph}`; }],
      ["hanja-leak", (draft: Draft) => { draft.sections[0].paragraph += " 辛"; }],
      ["incomplete-body", (draft: Draft) => { draft.sections[0].paragraph = "너는 신금이고 올해 정관의 영향을 받아."; }],
      ["missing-section", (draft: Draft) => { draft.sections.pop(); }],
    ] as const) {
      result = await scenario(name, { change, response: repeatResponse });
      assert.equal(result?.status, "FAILED", name);
      assert.equal(requests.length, 5, name);
      assert(!updates.some(update => update.status === "COMPLETED" || update.content), `${name}: invalid content published or saved as a usable draft`);
    }

    result = await scenario("provider-fails-without-draft", { response: () => { throw new Error("Simulated provider failure"); } });
    assert.equal(result?.status, "FAILED");
    assert.equal(requests.length, 5);
    assert(!updates.some(update => update.content));

    result = await scenario("resume-without-model-call", { resume: true });
    assert.equal(result?.status, "COMPLETED");
    assert.equal(requests.length, 0);
    assert(result.content?.paragraphs.every(paragraph => !containsReaderName(paragraph, readerName)));

    result = await scenario("invalid-calculation-exits-generating", { invalidCalculation: true });
    assert.equal(result?.status, "FAILED");
    assert.equal(requests.length, 0);
    await scenario("concurrent-claim", { claim: 0 });
    assert.equal(requests.length, 0);
    assert.equal(updates.length, 0);
    await scenario("completed-is-idempotent", { alreadyComplete: true });
    assert.equal(requests.length, 0);
    assert.equal(updates.length, 0);

    const guarded = repairRepeatedAnnualOpenings(["올해는 중심이 선명해져.", "올해는 다른 근거가 이어져.", "2025년은 별도의 시점이야."], [["올해"], ["올해"], []], 2026);
    assert.equal(guarded[1], "올해는 다른 근거가 이어져.", "Required year marker stripped");
    assert.equal(guarded[2], "2025년은 별도의 시점이야.", "Different year's facts stripped");
    tests += 1;

    for (const status of ["FAILED", "GENERATING", "COMPLETED"]) {
      prisma.report.findUnique = (async () => ({ id: "fixture", status, content: null, lastError: "career: internal validator details and provider configuration" })) as unknown as typeof originals.find;
      const response = await GET(new Request("http://localhost/api/saju/reports/fixture"), { params: Promise.resolve({ reportId: "fixture" }) });
      const body = await response.json();
      assert.equal(body.lastError, status === "FAILED" ? PUBLIC_REPORT_FAILURE_MESSAGE : null);
      assert(!JSON.stringify(body).includes("career:"));
      tests += 1;
    }

    // A completed request is idempotent; failed generation is not reported as a
    // successful HTTP request, and provider details stay private.
    prisma.report.findUnique = (async () => ({ id: "fixture", status: "COMPLETED" })) as unknown as typeof originals.find;
    let generationResponse = await POST(new Request("http://localhost/api/saju/reports/fixture/generate", { method: "POST" }), { params: Promise.resolve({ reportId: "fixture" }) });
    assert.equal(generationResponse.status, 200);
    assert.equal((await generationResponse.json()).status, "COMPLETED");
    prisma.report.findUnique = (async () => ({ id: "fixture", status: "FAILED", content: null, sajuProfile: { name: readerName, myeongsik: {} } })) as unknown as typeof originals.find;
    generationResponse = await POST(new Request("http://localhost/api/saju/reports/fixture/generate", { method: "POST" }), { params: Promise.resolve({ reportId: "fixture" }) });
    assert.equal(generationResponse.status, 503);
    assert.equal((await generationResponse.json()).error, PUBLIC_REPORT_FAILURE_MESSAGE);
    tests += 2;

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, retryOnMount: false, gcTime: 0 } } });
    queryClient.setQueryData(["saju-report", "fixture"], { id: "fixture", status: "FAILED", content: null, lastError: "career: internal validator details" });
    const failedHtml = renderToStaticMarkup(createElement(QueryClientProvider, { client: queryClient }, createElement(EssayReportView, { reportId: "fixture" })));
    assert(failedHtml.includes(PUBLIC_REPORT_FAILURE_MESSAGE));
    assert(!failedHtml.includes("career:"));
    queryClient.clear();
    queryClient.getQueryCache().build(queryClient, { queryKey: ["saju-report", "fetch-error"] }).setState({ status: "error", error: new Error("private transport details"), fetchStatus: "idle" });
    const errorHtml = renderToStaticMarkup(createElement(QueryClientProvider, { client: queryClient }, createElement(EssayReportView, { reportId: "fetch-error" })));
    assert(errorHtml.includes(PUBLIC_REPORT_FAILURE_MESSAGE), "Fetch failure got stuck on the loading screen");
    assert(errorHtml.includes("다시 시도하기"));
    assert(!errorHtml.includes("private transport details"));
    queryClient.clear();
    queryClient.setQueryData(["saju-report", "cached-report"], { id: "cached-report", status: "COMPLETED", content: { paragraphs: fixture.paragraphs }, lastError: null });
    queryClient.getQueryCache().find({ queryKey: ["saju-report", "cached-report"] })!.setState({ status: "error", error: new Error("Background fetch error"), fetchStatus: "idle" });
    const cachedHtml = renderToStaticMarkup(createElement(QueryClientProvider, { client: queryClient }, createElement(EssayReportView, { reportId: "cached-report" })));
    assert(cachedHtml.includes("너는 예리하게 디테일을 감지해"), "Published content disappeared on a background fetch failure");
    assert(!cachedHtml.includes(PUBLIC_REPORT_FAILURE_MESSAGE));
    queryClient.clear();
    tests += 3;
    console.log(`PASS: ${tests} report recovery checks; repeat openings repaired, style-only failures/timeouts publish a validated draft, missing evidence and private data stay blocked, internal errors hidden in API and UI.`);
  } finally {
    Responses.prototype.create = originals.create;
    prisma.report.findUnique = originals.find;
    prisma.report.updateMany = originals.claim;
    prisma.report.update = originals.update;
    Date.now = originals.now;
    console.warn = originals.warn;
    if (originals.apiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originals.apiKey;
    await prisma.$disconnect();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
