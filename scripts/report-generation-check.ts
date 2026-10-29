import { PROFILE_NOTICE_VERSION, profileNoticeText } from "../src/lib/privacy/profile-use";
const privacyNotice = { version: PROFILE_NOTICE_VERSION, self: true as const, text: profileNoticeText, acceptedAt: new Date().toISOString() };
import fs from "node:fs";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup as renderStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Responses } from "openai/resources/responses/responses";
import { firebaseStore as store } from "../src/lib/firebase/store";
import { generateReport } from "../src/lib/llm/report-generator";
import { ANNUAL_OPENING, containsReaderName, countReportCharacters, FORMAL_REPORT_ENDING, hasInlineTermExplanation, hasReportTimingTerm, MESSAGE_CLOSING_LENGTH, normalizeReportParagraph, repairRepeatedAnnualOpenings, REPORT_PARAGRAPH_LENGTHS } from "../src/lib/llm/report-rules";
import { splitReportMessages } from "../src/lib/report-message-layout";
import { formatReportEmoticons, MAX_REPORT_EMOTICONS, REPORT_EMOTICONS, REPORT_EMOTICON_INSTRUCTIONS, REPORT_EMOTICON_RANGE, splitReportEmoticons, stripReportDecorations } from "../src/lib/report-emoticons";
import { DEFAULT_REPORT_MODEL, DEFAULT_REPORT_TONE, getConfiguredReportModel } from "../src/lib/llm/report-config";
import { PUBLIC_REPORT_FAILURE_MESSAGE } from "../src/lib/llm/report-messages";
import { KoreanPolicyAdapter } from "../src/lib/saju/korean-policy-adapter";
import { GENZ_REPORT_PROMPT_VERSION, REPORT_PROMPT_VERSION, WARM_REPORT_PROMPT_VERSION, REPORT_PLAIN_LANGUAGE_INSTRUCTIONS, REPORT_TEXT_INTEGRITY_INSTRUCTIONS, getReportPrompt, getStoredReportTone } from "../src/lib/prompts/v6";
import { buildReportRenderPayload, type ReportTone } from "../src/lib/saju/report-payload";
import { EssayReportView } from "../src/components/EssayReportView";
import type { ReportContent } from "../src/lib/llm/types";
import { ReportAccessError } from "../src/lib/report-access-error";

// Every DB method is mocked; the driver must never borrow real credentials.
process.env.DATABASE_URL = "postgresql://USER:PASSWORD@127.0.0.1:1/synthetic";

type Draft = { sections: Array<{ section_id: string; paragraph: string }> };
const mockRouter = { bfcacheId: "report-check", back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} };
const renderToStaticMarkup = (element: Parameters<typeof renderStaticMarkup>[0]) => renderStaticMarkup(createElement(AppRouterContext.Provider, { value: mockRouter }, element));
type Update = { status?: string; content?: ReportContent; lastError?: string | null };
type RenderRequest = { model: string; reasoning?: { effort: string }; max_output_tokens: number; input: Array<{ content: string }>; text: { format: { schema: { properties: { sections: { items: { properties: { section_id: { enum: string[] } } } } } } } } };

const fixture = JSON.parse(fs.readFileSync("scripts/fixtures/report-style-draft.json", "utf8")) as { paragraphs: string[] };
fixture.paragraphs[2] = fixture.paragraphs[2].replace("중요하단다", "중요하거든");
fixture.paragraphs = formatReportEmoticons(fixture.paragraphs);
const ids = ["essence", "yearly", "relation", "career", "mental", "summary"];
const valid: Draft = { sections: fixture.paragraphs.map((paragraph, index) => ({ section_id: ids[index], paragraph })) };
const myeongsik = new KoreanPolicyAdapter().calculate({ birthDate: "1995-05-20", birthTime: "20:20", gender: "female", calendar: "solar" });
const readerName = "김가람";
const updates: Update[] = [];
const requests: RenderRequest[] = [];
const claims: Array<{ promptVersion: string; model: string }> = [];
const warnings: unknown[][] = [];
let source = structuredClone(valid);
let stored: ReportContent | null = null;
let reply: (requested: string[], attempt: number) => Draft;
let advanceTime = false;
let timeOffset = 0;
let claimCount = 1;
let completedAtStart = false;
let invalidCalculation = false;
let storedPromptVersion = REPORT_PROMPT_VERSION;
let storedModel = DEFAULT_REPORT_MODEL;
let tests = 0;

const originals = { create: Responses.prototype.create, find: store.getReportWithAccess, claim: store.claimReport, update: store.updateReport, now: Date.now, warn: console.warn, apiKey: process.env.OPENAI_API_KEY, findProfile: store.getProfile, upsertReport: store.ensureReport, nodeEnv: process.env.NODE_ENV, queryRaw: store.consumeRateLimit };
const testEnvironment = process.env as Record<string, string | undefined>;

async function scenario(name: string, options: { change?: (draft: Draft) => void; response?: typeof reply; resume?: boolean; timeout?: boolean; claim?: number; alreadyComplete?: boolean; invalidCalculation?: boolean; tone?: ReportTone; model?: string; storedPromptVersion?: string; storedModel?: string } = {}) {
  const voiceFixture = structuredClone(valid);
  if (options.tone === "genz" || getStoredReportTone(options.storedPromptVersion) === "genz") {
    voiceFixture.sections[2].paragraph = voiceFixture.sections[2].paragraph.replace("중요하단다", "중요하거든");
  }
  source = structuredClone(voiceFixture);
  options.change?.(source);
  updates.length = 0;
  requests.length = 0;
  claims.length = 0;
  warnings.length = 0;
  timeOffset = 0;
  stored = options.resume ? { paragraphs: source.sections.map(section => section.paragraph), meta: { charCount: 0, beats: [], termsUsed: [] } } : null;
  advanceTime = options.timeout ?? false;
  claimCount = options.claim ?? 1;
  completedAtStart = options.alreadyComplete ?? false;
  invalidCalculation = options.invalidCalculation ?? false;
  storedPromptVersion = options.storedPromptVersion ?? REPORT_PROMPT_VERSION;
  storedModel = options.storedModel ?? DEFAULT_REPORT_MODEL;
  reply = options.response ?? ((requested, attempt) => ({ sections: (attempt === 1 ? source : voiceFixture).sections.filter(section => requested.includes(section.section_id)) }));
  await generateReport(`check-${name}`, { tone: options.tone, model: options.model });
  tests += 1;
  return updates.at(-1);
}

async function main() {
  // Every API and database method below is stubbed in this process. This check
  // never calls a model, writes a real report, or needs production credentials.
  process.env.OPENAI_API_KEY = "test-key-no-network";
  testEnvironment.NODE_ENV = "development";
  try {
    Date.now = () => originals.now() + timeOffset;
    console.warn = (...args: unknown[]) => { warnings.push(args); };
    // Legacy documents can retain removed fields; they must never steer new reports.
    store.getReportWithAccess = (async () => ({ id: "fixture", userId: "fixture-owner", order: null, status: completedAtStart ? "COMPLETED" : stored ? "FAILED" : "PENDING", content: stored, promptVersion: storedPromptVersion, model: storedModel, focusTopics: ["money", "relationships"], sajuProfile: { userId: "fixture-owner", name: readerName, relationship: "SELF", privacyNotice, birthDate: new Date("1995-05-20T00:00:00Z"), isLunar: false, isLeapMonth: false, focusTopics: ["mind"], myeongsik: invalidCalculation ? {} : myeongsik } })) as unknown as typeof originals.find;
    store.claimReport = (async (_id: string, data: { promptVersion: string; model: string }) => { claims.push(data); return claimCount ? "fixture-lease" : null; }) as unknown as typeof originals.claim;
    store.updateReport = (async (_id: string, _lease: string, data: Update) => { updates.push(structuredClone(data)); }) as unknown as typeof originals.update;
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

    result = await scenario("small-length-deviation", { change: draft => { draft.sections[4].paragraph = "마음이 바빠질 때는 내 생각과 남의 의견을 따로 놓는 게 도움이 돼. 스스로 생각해서 선택하는 힘 (비견)은 태어난 사주에서 읽는 또 하나의 바탕이야. 정관으로 읽은 올해의 요구를 받아들일 때도, 누구의 의견이든 전부 내 답으로 바꿀 필요는 없거든. 사실이 달라진 건지 서로 좋아하는 방식이 다른 건지 구별하면 내 판단을 지킬 수 있어."; }, response: repeatResponse });
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
      ["missing-natal-mental-evidence", (draft: Draft) => { draft.sections[4].paragraph = draft.sections[4].paragraph.replaceAll("비견", "생각"); }],
      ["missing-month", (draft: Draft) => { draft.sections[2].paragraph = draft.sections[2].paragraph.replaceAll("11월 7일~12월 7일", "가을"); }],
      ["wrong-period-day", (draft: Draft) => { draft.sections[2].paragraph = draft.sections[2].paragraph.replaceAll("2월 4일~3월 5일", "2월 5일~3월 5일"); }],
      ["wrong-period-year", (draft: Draft) => { draft.sections[2].paragraph = draft.sections[2].paragraph.replaceAll("2월 4일~3월 5일", "2027년 2월 4일~3월 5일"); }],
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

    const corruptSummary = (draft: Draft) => { draft.sections[5].paragraph += " 배운 방법을 কাজে 연결하는 힘이 있어."; };
    result = await scenario("mixed-language-targeted-repair", { change: corruptSummary });
    assert.equal(result?.status, "COMPLETED");
    assert.equal(requests.length, 2);
    assert.deepEqual(requests[1].text.format.schema.properties.sections.items.properties.section_id.enum, ["summary"]);
    assert.deepEqual(result.content?.paragraphs.slice(0, 5), fixture.paragraphs.slice(0, 5));
    assert(!result.content?.paragraphs.join("").includes("কাজে"));
    assert(requests[0].input[0].content.includes(REPORT_TEXT_INTEGRITY_INSTRUCTIONS));
    assert(requests[1].input.at(-1)?.content.includes(REPORT_TEXT_INTEGRITY_INSTRUCTIONS));

    result = await scenario("mixed-language-cannot-publish-through-style-fallback", { change: corruptSummary, response: repeatResponse });
    assert.equal(result?.status, "FAILED");
    assert.equal(requests.length, 5, "Mixed text retries must stay bounded");
    assert(!updates.some(update => update.status === "COMPLETED" || update.content), "Corrupt prose was preserved as a usable draft");

    result = await scenario("provider-fails-without-draft", { response: () => { throw new Error("Simulated provider failure"); } });
    assert.equal(result?.status, "FAILED");
    assert.equal(requests.length, 5);
    assert(!updates.some(update => update.content));

    result = await scenario("resume-without-model-call", { resume: true });
    assert.equal(result?.status, "COMPLETED");
    assert.equal(requests.length, 0);
    assert(result.content?.paragraphs.every(paragraph => !containsReaderName(paragraph, readerName)));

    const warmPayload = buildReportRenderPayload(myeongsik, "warm");
    const defaultPayload = buildReportRenderPayload(myeongsik);
    assert.equal(defaultPayload.payload.style.tone, DEFAULT_REPORT_TONE);
    assert.equal(getReportPrompt().version, REPORT_PROMPT_VERSION);
    assert.equal(getReportPrompt().tone, "genz");
    const genzPayload = buildReportRenderPayload(myeongsik, "genz");
    assert.deepEqual(genzPayload.reportFacts, warmPayload.reportFacts);
    assert.deepEqual(genzPayload.payload.sections.map((section, index) => ({ ...section, paragraph_length: warmPayload.payload.sections[index].paragraph_length, editorial_focus: section.id === "summary" ? warmPayload.payload.sections[index].editorial_focus : section.editorial_focus })), warmPayload.payload.sections);
    assert.equal(warmPayload.payload.style.tone, "warm");
    assert.equal(genzPayload.payload.style.tone, "genz");
    assert.equal(getStoredReportTone("essay-v22-annual-story-genz-tone-test"), "genz");
    assert(genzPayload.payload.terminology.some(entry => entry.term === "정관" && entry.meaning.includes("약속")));
    assert(!genzPayload.payload.terminology.some(entry => entry.term === "식신"), "Unrelated ten-god interpretation leaked into the glossary");
    assert(genzPayload.payload.terminology.every(entry => !/↔|원국 일지|F-/u.test(entry.meaning)));
    tests += 1;

    const approvedPeriod = "2월 4일~3월 5일";
    for (const spelling of ["2월4일~3월5일", "2월 4일부터 3월 5일까지", "2월 4일에서 3월 5일까지", "2026년 2월 4일 – 3월 5일"]) {
      assert(hasReportTimingTerm(`눈여겨볼 구간은 ${spelling}이야.`, approvedPeriod, 2026), spelling);
      tests += 1;
    }
    for (const wrongPeriod of ["2월~3월", "2월 5일~3월 5일", "2월 4일~3월 6일", "12월 4일~3월 5일", "2027년 2월 4일~3월 5일"]) {
      assert(!hasReportTimingTerm(wrongPeriod, approvedPeriod, 2026), wrongPeriod);
      tests += 1;
    }
    assert(hasReportTimingTerm("12월 7일부터 2027년 1월 5일까지", "12월 7일~2027년 1월 5일", 2026));
    assert(!hasReportTimingTerm("12월 7일부터 1월 5일까지", "12월 7일~2027년 1월 5일", 2026));
    assert(hasReportTimingTerm("2027년 1월 5일 – 2월 4일", "2027년 1월 5일~2월 4일", 2026));
    assert(!hasReportTimingTerm("1월 5일~2월 4일", "2027년 1월 5일~2월 4일", 2026));
    assert(!hasReportTimingTerm("11월과 12월", "1월", 2026));
    tests += 1;
    result = await scenario("equivalent-period-spelling", { change: draft => {
      draft.sections[2].paragraph = draft.sections[2].paragraph.replace("2월 4일~3월 5일", "2월4일부터 3월5일까지");
    } });
    assert.equal(result?.status, "COMPLETED");
    assert.equal(requests.length, 1, "Equivalent date typography caused a paid retry");

    for (const context of [warmPayload, genzPayload]) {
      assert.deepEqual(context.payload.sections.map(section => section.id), ids, "Comprehensive reports must keep every domain");
      assert(!Object.hasOwn(context.payload, "reader_preferences"));
      for (const section of context.payload.sections) {
        assert(!Object.hasOwn(section, "focus_topics"));
        const expected = context.payload.style.tone === "genz" && section.id === "summary"
          ? MESSAGE_CLOSING_LENGTH
          : REPORT_PARAGRAPH_LENGTHS[section.id as keyof typeof REPORT_PARAGRAPH_LENGTHS];
        assert.deepEqual(section.paragraph_length, expected, "Comprehensive section length was reweighted");
      }
      assert(!getReportPrompt(context.payload.style.tone).instructions.includes("[Reader interests]"));
      tests += 1;
    }
    result = await scenario("legacy-preferences-do-not-steer-new-report");
    assert.equal(result?.status, "COMPLETED");
    const comprehensiveEvidence = JSON.parse(requests[0].input[1].content);
    assert(!/reader_preferences|focus_topics|focusTopics/u.test(requests[0].input[1].content));
    assert.deepEqual(comprehensiveEvidence.sections.map((section: { paragraph_length: unknown }) => section.paragraph_length), genzPayload.payload.sections.map(section => section.paragraph_length));

    for (const [tone, version] of [["warm", "essay-v23-annual-story-reader-focus"], ["genz", "essay-v28-genz-reader-focus-reactions"], ["warm", "essay-v24-annual-story-comprehensive"], ["genz", "essay-v29-genz-comprehensive-reactions"], ["warm", "essay-v25-annual-story-grounded-detail"], ["genz", "essay-v30-genz-grounded-detail-reactions"], ["warm", "essay-v27-annual-story-opening-flow"], ["genz", "essay-v32-genz-opening-flow"], ["warm", "essay-v28-annual-story-plain-language"], ["genz", "essay-v33-genz-plain-language"], ["warm", "essay-v29-annual-story-everyday-explanation"], ["genz", "essay-v34-genz-everyday-explanation"]] as const) {
      result = await scenario(`unfinished-${tone}-preferences-upgrade`, { tone, resume: true, storedPromptVersion: version });
      assert.equal(result?.status, "COMPLETED");
      assert(requests.length >= 1, "An old unfinished draft bypassed updated interpretation/date rules");
      assert.deepEqual(requests[0].text.format.schema.properties.sections.items.properties.section_id.enum, ids);
      assert.equal(claims[0].promptVersion, getReportPrompt(tone).version);

      await scenario(`completed-${tone}-preferences-preserved`, { tone, resume: true, alreadyComplete: true, storedPromptVersion: version });
      assert.equal(requests.length, 0);
      assert.equal(claims.length, 0);
      assert.equal(updates.length, 0, "An existing completed report was changed during migration");
    }

    result = await scenario("genz-explicit-preview", { tone: "genz", model: "gpt-5.4", resume: true, storedPromptVersion: WARM_REPORT_PROMPT_VERSION });
    assert.equal(result?.status, "COMPLETED");
    assert.equal(requests.length, 1, "A warm stored draft was reused for a Gen Z request");
    assert(requests[0].input[0].content.includes("[Friendly message]"));
    assert(!requests[0].input[0].content.includes("[Tone and endings]"), "Warm tone instructions still compete with the Gen Z experiment");
    assert.equal(JSON.parse(requests[0].input[1].content).style.tone, "genz");
    assert.equal(claims[0].promptVersion, GENZ_REPORT_PROMPT_VERSION);
    assert.equal(requests[0].model, "gpt-5.4");
    assert.equal(claims[0].model, "gpt-5.4");
    assert.equal(requests[0].reasoning, undefined);
    assert.equal(requests[0].max_output_tokens, 4_800);
    assert(JSON.parse(requests[0].input[1].content).terminology.some((entry: { term: string }) => entry.term === "대운"));
    assert(result.content!.meta.termsUsed.every(entry => !/↔|F-/u.test(entry.gloss)));

    for (const text of ["내 표현과 결과물을 밖으로 꺼내는 힘 (식신)이 들어와.", "준비한 걸 밖으로 보여 주는 힘（식신）이 이어져.", "내 표현을 밖으로 꺼내는 기운이거든 (식신).", "맡은 역할을 판단하는 기준 (정관), 준비한 걸 밖으로 보여 주는 힘 (식신)을 함께 읽어."]) assert(hasInlineTermExplanation(text, "식신"), text);
    for (const text of [
      "식신(내 표현과 결과물을 밖으로 꺼내는 힘)이 들어와.",
      "식신은 쉽게 말하면 준비한 걸 밖으로 보여 주는 힘이야.",
      "식신이 들어와서 주목을 받네.",
      "내 표현과 결과물을 밖으로 꺼내는 힘이야.\n\n(식신)이 들어와.",
      "내 표현과 결과물을 밖으로 꺼내는 힘이야. 그 힘 (식신)이 들어와.",
      "좋은 힘 (식신)이 들어와.",
      "( ˶ᵔ ᵕ ᵔ˶ ) (식신)이 들어와.",
      "내 표현과 결과물을 밖으로 꺼내는 힘 (식신♡)이 들어와.",
      "내 표현과 결과물을 밖으로 꺼내는 힘 (식신·상관)이 들어와.",
      "정관과 같은 역할을 설명하는 힘 (식신)이 들어와.",
      "식신이 먼저 와. 내 표현과 결과물을 밖으로 꺼내는 힘 (식신)이야.",
    ]) assert(!hasInlineTermExplanation(text, "식신"), text);
    for (const [text, term] of [["10년 동안의 큰 흐름 (대운)", "대운"], ["차이를 보는 눈 (신금)", "신금"], ["내 몫을 지키는 힘 (겁재)", "겁재"]]) {
      assert(hasInlineTermExplanation(text, term), `A short everyday explanation was rejected: ${text}`);
    }
    assert(!hasInlineTermExplanation("병오 세운에 식신, 쉽게 말하면 내 결과물이 나가는 기운이 들어와.", "세운"));
    assert(hasInlineTermExplanation("2026년 (병오)에 말과 결과물이 눈에 띄네.", "병오"));
    assert(!hasInlineTermExplanation("2026년 병오에 말과 결과물이 눈에 띄네.", "병오"));
    tests += 1;

    result = await scenario("explanation-first-opening", { change: draft => {
      draft.sections[0].paragraph = draft.sections[0].paragraph.replace("너는 예리하게 디테일을 감지해 그 완벽성을 추구하는 성향이 있어. 사람들은 이를 작은 차이를 예민하게 읽는 보석의 기질 (신금)이라 부르지.", "너는 작은 차이를 예민하게 읽는 보석의 기질 (신금)을 지녀서, 디테일을 놓치지 않고 세밀한 기준을 다듬는 성향이 있어. 같은 일을 해도 작은 차이를 하나씩 살피는 쪽이지.");
    } });
    assert.equal(result?.status, "COMPLETED");
    assert.equal(requests.length, 1, "Explained parenthetical term in the first sentence caused a paid retry");
    assert(result.content!.paragraphs[0].split(/[.!?]/u)[0].includes("(신금)"));

    result = await scenario("short-plain-gloss-avoids-retry", { change: draft => {
      draft.sections[0].paragraph = draft.sections[0].paragraph.replace("작은 차이를 예민하게 읽는 보석의 기질 (신금)", "차이를 보는 눈 (신금)");
    } });
    assert.equal(result?.status, "COMPLETED");
    assert.equal(requests.length, 1, "A short everyday definition caused a paid retry");
    assert(result.content!.paragraphs[0].includes("차이를 보는 눈 (신금)"));

    const removeFirstGloss = (draft: Draft) => { draft.sections[0].paragraph = draft.sections[0].paragraph.replace("작은 차이를 예민하게 읽는 보석의 기질 (신금)", "신금"); };
    result = await scenario("first-term-gloss-repair", { change: removeFirstGloss });
    assert.equal(result?.status, "COMPLETED");
    assert.equal(requests.length, 2);
    assert(requests[1].input.at(-1)?.content.includes("전문 용어 '신금'"));
    assert(hasInlineTermExplanation(result.content!.paragraphs[0], "신금"));

    const termFirstGloss = (draft: Draft) => { draft.sections[0].paragraph = draft.sections[0].paragraph.replace("작은 차이를 예민하게 읽는 보석의 기질 (신금)", "신금(작은 차이를 예민하게 읽는 보석의 기질)"); };
    result = await scenario("term-first-style-repair", { change: termFirstGloss });
    assert.equal(result?.status, "COMPLETED");
    assert.equal(requests.length, 2);
    assert(hasInlineTermExplanation(result.content!.paragraphs[0], "신금"));
    const repairInstructions = requests[1].input.at(-1)!.content;
    assert(repairInstructions.includes("큰 주제인 section 하나를 하나의 긴 메시지"));
    assert(!/50~100|두 번째 문장 이후|용어 바로 뒤에/u.test(repairInstructions));
    result = await scenario("term-first-style-fallback", { change: termFirstGloss, response: repeatResponse });
    assert.equal(result?.status, "COMPLETED", "A glossary order preference blocked a paid report");
    assert.equal(requests.length, 2);
    assert.equal(result.lastError, null);

    result = await scenario("gloss-style-failure-still-publishes", { change: removeFirstGloss, response: repeatResponse });
    assert.equal(result?.status, "COMPLETED");
    assert.equal(requests.length, 2, "A missing glossary caused unbounded retries");
    assert.equal(result.lastError, null);

    const decoratedMessage = "첫 문장이야 👩🏽‍💻\r\n\r\n  다음   말도 이어져 🙂 ";
    assert.equal(normalizeReportParagraph(decoratedMessage), "첫 문장이야 👩🏽‍💻\n\n다음 말도 이어져 🙂");
    assert.equal(countReportCharacters(decoratedMessage), countReportCharacters("첫 문장이야 다음 말도 이어져"));
    assert.equal(countReportCharacters("🫠".repeat(200)), 0);
    for (const sentence of ["중요하다.", "영향을 준다 🙂", "흐름이 바뀐다.🫠", "고민이 이어진다\n다음 문장", "기준이다."]) assert(FORMAL_REPORT_ENDING.test(sentence), sentence);
    for (const sentence of ["중요해.", "영향을 주거든 🙂", "흐름이 바뀌네.", "다정하게 이어져.", "친구보다 먼저 눈치채지."]) assert(!FORMAL_REPORT_ENDING.test(sentence), sentence);
    tests += 1;

    result = await scenario("message-converts-emoji-and-preserves-breaks", { tone: "genz", change: draft => {
      draft.sections[0].paragraph = draft.sections[0].paragraph.replace(". ", ". 🙂\n\n");
    } });
    assert.equal(result?.status, "COMPLETED");
    assert.equal(result.content?.meta.presentation, "message");
    assert(result.content?.paragraphs[0].includes(`${REPORT_EMOTICONS.smile}\n\n`));
    assert(!result.content?.paragraphs.join("").includes("🙂"));
    assert.equal(requests.length, 1, "Decoration changes must not trigger another paid request");
    assert(requests[0].input[0].content.includes(REPORT_EMOTICON_INSTRUCTIONS));
    assert(requests[0].input[1].content.includes(`특수문자 표정·별·하트만 전체 ${REPORT_EMOTICON_RANGE}개`));

    result = await scenario("message-repairs-formal-ending", { tone: "genz", change: draft => { draft.sections[3].paragraph += " 기준이 중요하다."; } });
    assert.equal(result?.status, "COMPLETED");
    assert.equal(requests.length, 2);
    assert(requests[1].input.at(-1)?.content.includes("끝나는 서술체"));
    assert(!FORMAL_REPORT_ENDING.test(result.content!.paragraphs[3]));

    result = await scenario("emoticon-cannot-hide-formal-ending", { tone: "genz", change: draft => { draft.sections[3].paragraph += ` 기준이 중요하다 ${REPORT_EMOTICONS.playful}`; } });
    assert.equal(result?.status, "COMPLETED");
    assert.equal(requests.length, 2);
    assert(requests[1].input.at(-1)?.content.includes(REPORT_EMOTICON_INSTRUCTIONS));
    assert(!FORMAL_REPORT_ENDING.test(stripReportDecorations(result.content!.paragraphs[3])));

    result = await scenario("emoji-cannot-replace-evidence", { tone: "genz", change: draft => { draft.sections[0].paragraph = "🫠".repeat(200); }, response: requested => ({ sections: source.sections.filter(section => requested.includes(section.section_id)) }) });
    assert.equal(result?.status, "FAILED");

    result = await scenario("text-emoticons-cannot-replace-evidence", { tone: "genz", change: draft => { draft.sections[0].paragraph = REPORT_EMOTICONS.playful.repeat(200); }, response: repeatResponse });
    assert.equal(result?.status, "FAILED");
    assert.equal(countReportCharacters(Object.values(REPORT_EMOTICONS).join(" ").repeat(20)), 0);

    result = await scenario("genz-repair-keeps-voice", { tone: "genz", change: draft => { draft.sections[0].paragraph = draft.sections[0].paragraph.replace(/정관|병오/gu, "역할"); } });
    assert.equal(result?.status, "COMPLETED");
    assert.equal(requests.length, 2);
    assert(requests[0].input[0].content.includes(REPORT_PLAIN_LANGUAGE_INSTRUCTIONS));
    assert(requests[1].input.at(-1)?.content.includes(REPORT_PLAIN_LANGUAGE_INSTRUCTIONS), "Partial repairs lost the plain-language instructions");
    assert(requests[1].input.at(-1)?.content.includes("쉽고 다정한 친구의 말투를 유지"));
    for (const request of requests) {
      const prompt = request.input.map(message => message.content).join("\n");
      assert(!/최소 세 문단에|팩폭을 살리고|킹받는 팩폭을 원한다/u.test(prompt), "Old joke requirements still compete with readable prose");
    }

    for (const [name, text] of [
      ["duplicate-term", "이어서 대운 (대운)을 읽어."],
      ["abstract-explanation", "기존 조건과 새 요구를 조정하는 관계를 읽어."],
      ["calculation-disclaimer", "날짜의 관계만으로 실제 사건을 단정할 수는 없어."],
    ]) {
      const addIssue = (draft: Draft) => { draft.sections[3].paragraph += " " + text; };
      result = await scenario(`readability-${name}-repair`, { change: addIssue });
      assert.equal(result?.status, "COMPLETED");
      assert.equal(requests.length, 2);
      assert.deepEqual(requests[1].text.format.schema.properties.sections.items.properties.section_id.enum, ["career"]);
      assert(!result.content!.paragraphs[3].includes(text));
      assert(requests[1].input.at(-1)?.content.includes(REPORT_PLAIN_LANGUAGE_INSTRUCTIONS));

      result = await scenario(`readability-${name}-bounded-fallback`, { change: addIssue, response: repeatResponse });
      assert.equal(result?.status, "COMPLETED", "Readability preferences blocked a content-validated report");
      assert.equal(requests.length, 2, "Readability caused unbounded paid retries");
      assert.equal(result.lastError, null);
    }

    result = await scenario("annual-summary-retains-only-year-during-opening-repair", { change: draft => {
      draft.sections[5].paragraph = draft.sections[5].paragraph.replace(/^[^\n]+/u, "올해는 맡은 일을 해내면서 네가 지킬 약속을 차근차근 정하는 해야.");
    }, response: repeatResponse });
    assert.equal(result?.status, "COMPLETED");
    assert(result.content!.paragraphs[5].includes("올해"), "Opening cleanup removed the closing's only annual context");
    assert.equal(requests.length, 2);

    const removeAnnualClosing = (draft: Draft) => { draft.sections[5].paragraph = draft.sections[5].paragraph.replaceAll("올해", "이 흐름"); };
    result = await scenario("annual-summary-is-repaired", { change: removeAnnualClosing });
    assert.equal(result?.status, "COMPLETED");
    assert.equal(requests.length, 2);
    assert.deepEqual(requests[1].text.format.schema.properties.sections.items.properties.section_id.enum, ["summary"]);
    assert.deepEqual(result.content!.paragraphs.slice(0, 5), fixture.paragraphs.slice(0, 5));
    assert(result.content!.paragraphs[5].split("\n\n")[0].includes("올해"));

    result = await scenario("annual-summary-style-failure-still-publishes", { change: removeAnnualClosing, response: repeatResponse });
    assert.equal(result?.status, "COMPLETED");
    assert.equal(requests.length, 2, "A closing style preference blocked a usable customer report");
    assert.equal(result.lastError, null);

    result = await scenario("summary-two-paragraphs-one-message", { change: draft => {
      const paragraphs = draft.sections[5].paragraph.split("\n\n");
      draft.sections[5].paragraph = `${paragraphs[0]}\n\n${paragraphs.slice(1).join(" ")}`;
    } });
    assert.equal(result?.status, "COMPLETED");
    assert.equal(requests.length, 1, "A two-paragraph closing caused a paid retry");
    assert.equal(result.content!.paragraphs[5].split("\n\n").length, 2);

    result = await scenario("short-final-message-is-repaired", { change: draft => {
      const messages = draft.sections[5].paragraph.split("\n\n");
      messages[messages.length - 1] = "네 마음을 응원할게.";
      draft.sections[5].paragraph = messages.join("\n\n");
    } });
    assert.equal(result?.status, "COMPLETED");
    assert.equal(requests.length, 2);
    assert(countReportCharacters(result.content!.paragraphs[5].split("\n\n").at(-1)!) >= 40);
    assert.deepEqual(result.content!.paragraphs.slice(0, 5), fixture.paragraphs.slice(0, 5));

    result = await scenario("luna-keeps-model-on-repair", { model: "gpt-6-luna", change: draft => { draft.sections[0].paragraph = draft.sections[0].paragraph.replace(/정관|병오/gu, "역할"); } });
    assert.equal(result?.status, "COMPLETED");
    assert.equal(requests.length, 2);
    assert.equal(claims[0].model, "gpt-6-luna");
    for (const request of requests) {
      assert.equal(request.model, "gpt-6-luna", "The repair silently changed the chosen model");
      assert.deepEqual(request.reasoning, { effort: "none" });
      assert.equal(request.max_output_tokens, 4_800);
      assert.deepEqual(JSON.parse(request.input[1].content).sections, JSON.parse(JSON.stringify(genzPayload.payload.sections)));
    }

    result = await scenario("sol61-trial-keeps-model-on-repair", { model: "gpt-6.1-sol", change: draft => { draft.sections[0].paragraph = draft.sections[0].paragraph.replace(/정관|병오/gu, "역할"); } });
    assert.equal(result?.status, "COMPLETED");
    assert.equal(requests.length, 2);
    assert.equal(claims[0].model, "gpt-6.1-sol");
    for (const request of requests) {
      assert.equal(request.model, "gpt-6.1-sol", "The repair silently changed the chosen model");
      assert.deepEqual(request.reasoning, { effort: "low" });
      assert.equal(request.max_output_tokens, 8_000);
      assert.deepEqual(JSON.parse(request.input[1].content).sections, JSON.parse(JSON.stringify(genzPayload.payload.sections)));
    }

    result = await scenario("genz-retry-retains-tone", { storedPromptVersion: GENZ_REPORT_PROMPT_VERSION, storedModel: "gpt-5.4" });
    assert.equal(result?.status, "COMPLETED");
    assert(requests[0].input[0].content.includes("[Friendly message]"));
    assert.equal(claims[0].promptVersion, GENZ_REPORT_PROMPT_VERSION);
    assert.equal(requests[0].model, "gpt-5.4");
    assert.equal(claims[0].model, "gpt-5.4");

    result = await scenario("genz-stored-draft-recovery", { storedPromptVersion: GENZ_REPORT_PROMPT_VERSION, resume: true });
    assert.equal(result?.status, "COMPLETED");
    assert.equal(requests.length, 0);
    assert.equal(claims[0].promptVersion, GENZ_REPORT_PROMPT_VERSION);

    result = await scenario("warm-explicit-comparison", { tone: "warm", storedModel: "gpt-5.4" });
    assert.equal(result?.status, "COMPLETED");
    assert(!requests[0].input[0].content.includes("[Friendly message]"));
    assert.equal(JSON.parse(requests[0].input[1].content).style.tone, "warm");
    assert.equal(claims[0].promptVersion, WARM_REPORT_PROMPT_VERSION);
    assert.equal(requests[0].model, getConfiguredReportModel());
    assert.equal(result.content?.meta.presentation, "letter");

    result = await scenario("default-upgrades-old-unfinished-letter", { resume: true, storedPromptVersion: WARM_REPORT_PROMPT_VERSION, storedModel: "gpt-4o" });
    assert.equal(result?.status, "COMPLETED");
    assert.equal(requests.length, 1, "A legacy letter draft bypassed the new default renderer");
    assert.equal(JSON.parse(requests[0].input[1].content).style.tone, "genz");
    assert.equal(requests[0].model, getConfiguredReportModel());
    assert.equal(claims[0].promptVersion, REPORT_PROMPT_VERSION);
    assert.equal(result.content?.meta.presentation, "message");

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

    // The ordinary customer creation endpoint must use the approved version
    // and model without a tone option or a special preview product.
    const creations: Array<{ promptVersion: string; model: string; productCode: string }> = [];
    // Route checks now use a verified synthetic owner. Authentication/IDOR itself
    // is exercised separately in security-check.ts, including anonymous denial.
    const require = createRequire(import.meta.url);
    const accountPath = require.resolve("../src/lib/saju/account");
    require(accountPath);
    require.cache[accountPath]!.exports = { ...require(accountPath), getSajuAccount: async () => ({ id: "reader-account" }) };
    const { GET } = require("../src/app/api/saju/reports/[reportId]/route") as typeof import("../src/app/api/saju/reports/[reportId]/route");
    const { POST } = require("../src/app/api/saju/reports/[reportId]/generate/route") as typeof import("../src/app/api/saju/reports/[reportId]/generate/route");
    const { POST: createReport } = require("../src/app/api/saju/profiles/[profileId]/reports/route") as typeof import("../src/app/api/saju/profiles/[profileId]/reports/route");
    store.consumeRateLimit = (async () => true) as never;
    store.getProfile = (async () => ({ id: "profile-fixture", userId: "reader-account", relationship: "SELF", privacyNotice, birthDate: new Date("1995-05-20T00:00:00Z"), isLunar: false, isLeapMonth: false })) as unknown as typeof originals.findProfile;
    store.getReportWithAccess = (async () => null) as unknown as typeof originals.find;
    store.ensureReport = (async (_uid: string, _id: string, metadata: typeof creations[number]) => { creations.push(metadata); return { id: "default-message-report" }; }) as unknown as typeof originals.upsertReport;
    const createdResponse = await createReport(new Request("http://localhost/api/saju/profiles/profile-fixture/reports", { method: "POST" }), { params: Promise.resolve({ profileId: "profile-fixture" }) });
    assert.equal(createdResponse.status, 201);
    assert.equal((await createdResponse.json()).reportId, "default-message-report");
    assert.equal(creations[0].promptVersion, REPORT_PROMPT_VERSION);
    assert.equal(creations[0].model, getConfiguredReportModel());
    assert.equal(creations[0].productCode, "yearly_2026");
    store.getReportWithAccess = (async () => ({ id: "issued-report", status: "COMPLETED", sajuProfile: { userId: "reader-account" }, order: null })) as unknown as typeof originals.find;
    const existingResponse = await createReport(new Request("http://localhost/api/saju/profiles/profile-fixture/reports", { method: "POST" }), { params: Promise.resolve({ profileId: "profile-fixture" }) });
    assert.equal(existingResponse.status, 200);
    assert.deepEqual(await existingResponse.json(), { reportId: "issued-report", existing: true });
    assert.equal(creations.length, 1, "An already issued report was overwritten");
    tests += 2;

    for (const status of ["FAILED", "GENERATING", "COMPLETED"]) {
      store.getReportWithAccess = (async () => ({ id: "fixture", status, content: null, sajuProfile: { userId: "reader-account" }, order: null, lastError: "career: internal validator details and provider configuration" })) as unknown as typeof originals.find;
      const response = await GET(new Request("http://localhost/api/saju/reports/fixture"), { params: Promise.resolve({ reportId: "fixture" }) });
      const body = await response.json();
      assert.equal(body.lastError, status === "FAILED" ? PUBLIC_REPORT_FAILURE_MESSAGE : null);
      assert(!JSON.stringify(body).includes("career:"));
      tests += 1;
    }

    // A completed request is idempotent; failed generation is not reported as a
    // successful HTTP request, and provider details stay private.
    store.getReportWithAccess = (async () => ({ id: "fixture", status: "COMPLETED", sajuProfile: { userId: "reader-account" }, order: null })) as unknown as typeof originals.find;
    let generationResponse = await POST(new Request("http://localhost/api/saju/reports/fixture/generate", { method: "POST" }), { params: Promise.resolve({ reportId: "fixture" }) });
    assert.equal(generationResponse.status, 200);
    assert.equal((await generationResponse.json()).status, "COMPLETED");
    store.getReportWithAccess = (async () => ({ id: "fixture", userId: "reader-account", status: "FAILED", content: null, sajuProfile: { userId: "reader-account", name: readerName, relationship: "SELF", privacyNotice, birthDate: new Date("1995-05-20T00:00:00Z"), isLunar: false, isLeapMonth: false, myeongsik: {} }, order: null })) as unknown as typeof originals.find;
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
    queryClient.getQueryCache().find({ queryKey: ["saju-report", "cached-report"] })!.setState({ status: "error", error: new ReportAccessError(503, 30, "PAYMENT_VERIFICATION_REQUIRED"), fetchStatus: "idle" });
    const heldHtml = renderToStaticMarkup(createElement(QueryClientProvider, { client: queryClient }, createElement(EssayReportView, { reportId: "cached-report" })));
    assert(!heldHtml.includes("너는 예리하게 디테일을 감지해"), "Payment hold exposed cached report");
    assert(heldHtml.includes("다시 결제할 필요는 없어"));
    tests += 1;
    queryClient.clear();
    for (const status of [401, 403, 404]) {
      queryClient.setQueryData(["saju-report", "revoked-report"], { id: "revoked-report", status: "COMPLETED", content: { paragraphs: ["private-revoked-content"] }, lastError: null });
      queryClient.getQueryCache().find({ queryKey: ["saju-report", "revoked-report"] })!.setState({ status: "error", error: new ReportAccessError(status), fetchStatus: "idle" });
      const revokedHtml = renderToStaticMarkup(createElement(QueryClientProvider, { client: queryClient }, createElement(EssayReportView, { reportId: "revoked-report" })));
      assert(!revokedHtml.includes("private-revoked-content"), `Authorization ${status} failure exposed cached content`);
      queryClient.clear();
      tests += 1;
    }
    tests += 3;
    const messageParagraphs = [...fixture.paragraphs];
    messageParagraphs[0] = messageParagraphs[0].replace(". ", ". 🙂\n\n");
    queryClient.setQueryData(["saju-report", "message-report"], { id: "message-report", status: "COMPLETED", content: { paragraphs: messageParagraphs, meta: { presentation: "message" } }, lastError: null });
    const messageHtml = renderToStaticMarkup(createElement(QueryClientProvider, { client: queryClient }, createElement(EssayReportView, { reportId: "message-report" })));
    assert(messageHtml.includes('data-report-presentation="message"'));
    assert(messageHtml.includes("다봄"));
    assert(!messageHtml.includes("🙂"));
    assert(messageHtml.includes(REPORT_EMOTICONS.smile));
    assert(messageHtml.includes('class="retro-emoticon"'));
    assert(messageParagraphs[0].includes("🙂"), "Display formatting rewrote the stored report");
    assert.equal((messageHtml.match(/<div\b[^>]*\sdata-report-message=/gu) ?? []).length, messageParagraphs.length, "Each topic must render as one complete message");
    const messages = messageParagraphs.flatMap(splitReportMessages);
    assert.equal(messages.join("").replace(/\s/gu, ""), messageParagraphs.join("").replace(/\s/gu, ""), "Message layout changed the report's words");
    assert(messageHtml.includes(stripReportDecorations(messages.at(-1)!).trim()), "The closing message was lost");
    assert(!messageHtml.includes("section_id"));
    queryClient.clear();
    tests += 1;
    const trickyMessage = "자료에 ‘왜 지금 바꾸지?’라고 적혀 있어. 비용은 3.5만 원이야. 👩🏽‍💻 숫자보다 남길 결과를 먼저 보게 되거든. 같은 얘기를 다시 늘리면 서로 피곤해지지. 다음 선택은 기준이 선명한 쪽이 편해.";
    const shortMessages = splitReportMessages(trickyMessage);
    assert(shortMessages.length > 1);
    assert(shortMessages.some(message => message.includes("‘왜 지금 바꾸지?’라고 적혀 있어.")), "A quoted question was broken in half");
    assert(shortMessages.some(message => message.includes("3.5만 원이야. 👩🏽‍💻")), "A decimal or reaction emoji was separated from its sentence");
    assert.equal(shortMessages.join("").replace(/\s/gu, ""), trickyMessage.replace(/\s/gu, ""));
    tests += 1;

    const decoratedParagraphs = [
      "세심하게 보는 눈이 있어. 😅\n\n익숙한 장면도 새로 보이네. 🙂",
      "손실을 조심해야 하는 조건이야. ✨",
      "차분하게 기준을 고르는 편이야. 😌\n\n검수팀도 퇴근은 필요하거든. 🫠",
      "다음 선택에도 네 기준이 남아. 💜\n\n웃긴 부분은 이미 눈치챘지. 😅",
      "올해는 역할을 선명하게 고르는 해네.\n\n네 마음을 응원할게. 💛",
    ];
    const decoratedOriginal = [...decoratedParagraphs];
    const formatted = formatReportEmoticons(decoratedParagraphs);
    const reactions = formatted.flatMap(splitReportEmoticons).filter(part => part.isEmoticon).map(part => part.text);
    assert.equal(reactions.length, 6);
    assert.equal(new Set(reactions).size, reactions.length);
    assert.equal(formatted[1], "손실을 조심해야 하는 조건이야.");
    assert(formatted.at(-1)!.endsWith(REPORT_EMOTICONS.closing));
    assert.deepEqual(formatReportEmoticons(formatted), formatted, "Formatting changed after a second render");
    assert.deepEqual(decoratedParagraphs, decoratedOriginal);
    const allReactions = Object.values(REPORT_EMOTICONS).filter(token => token !== REPORT_EMOTICONS.closing);
    const richParagraphs = Array.from({ length: 5 }, (_, index) => `기준이 선명해지는 지점이야. ${allReactions[index * 2]}\n\n다른 선택의 의미도 이어져. ${allReactions[index * 2 + 1]}`);
    richParagraphs.push("네 기준이 남아 있길 바라는 마음이야.");
    const richFormatted = formatReportEmoticons(richParagraphs);
    assert.equal(richFormatted.flatMap(splitReportEmoticons).filter(part => part.isEmoticon).length, MAX_REPORT_EMOTICONS);
    assert(richFormatted.every(paragraph => splitReportEmoticons(paragraph).filter(part => part.isEmoticon).length <= 2));
    assert.deepEqual(formatReportEmoticons(richFormatted), richFormatted);
    assert.equal(stripReportDecorations(richFormatted.join("")).replace(/\s/gu, ""), stripReportDecorations(richParagraphs.join("")).replace(/\s/gu, ""));
    assert.equal(formatted.map(stripReportDecorations).join("").replace(/\s/gu, ""), decoratedOriginal.map(stripReportDecorations).join("").replace(/\s/gu, ""), "Decoration styling changed the interpretation");
    assert.equal(stripReportDecorations("2026년 1️⃣월 3.5만 원 👩🏽‍💻 🇰🇷 ❤️"), "2026년 1월 3.5만 원   ");
    assert(!/[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}\uFE0F\u200D\u20E3]/u.test(formatReportEmoticons(["2026년 1️⃣월 3.5만 원 👩🏽‍💻 🇰🇷 ❤️"])[0]));
    const longSentence = "익숙한 기준을 돌아보면서 내가 맡은 일과 다른 사람에게 맡길 일을 천천히 구분하는 쪽이야. ".repeat(3);
    for (const reaction of Object.values(REPORT_EMOTICONS)) {
      const withReaction = `${longSentence.trim()} ${reaction} 다음 말은 다른 의미로 이어지네.`;
      const split = splitReportMessages(withReaction);
      assert(split.some(message => message.includes(`쪽이야. ${reaction}`)), `Reaction detached from its preceding sentence: ${reaction}`);
      assert(!split.some(message => message.startsWith(reaction)), `Reaction started the next message: ${reaction}`);
      assert.equal(split.join("").replace(/\s/gu, ""), withReaction.replace(/\s/gu, ""));
    }
    tests += 4;
    console.log(`PASS: ${tests} report recovery checks; repeat openings repaired, style-only failures/timeouts publish a validated draft, missing evidence and private data stay blocked, internal errors hidden in API and UI.`);
  } finally {
    Responses.prototype.create = originals.create;
    store.getReportWithAccess = originals.find;
    store.claimReport = originals.claim;
    store.updateReport = originals.update;
    store.getProfile = originals.findProfile;
    store.ensureReport = originals.upsertReport;
    if (originals.nodeEnv === undefined) delete testEnvironment.NODE_ENV;
    else testEnvironment.NODE_ENV = originals.nodeEnv;
    Date.now = originals.now;
    console.warn = originals.warn;
    store.consumeRateLimit = originals.queryRaw;
    if (originals.apiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originals.apiKey;
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
