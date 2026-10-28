import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MessageReport } from "../src/components/MessageReport";
import type { ReportContent } from "../src/lib/llm/types";
import { reportTopicParagraphs } from "../src/lib/report-message-layout";
import { explanationFirstReportText, splitReportTermAnnotations } from "../src/lib/report-term-annotations";

let passed = 0;
function check(name: string, run: () => void) { run(); passed++; console.log(`PASS ${name}`); }

check("legacy glosses precede technical labels and retain natural noun particles", () => {
  assert.equal(explanationFirstReportText("갑목(큰 나무처럼 곧게 뻗는 기질)이라 기준이 있어."), "큰 나무처럼 곧게 뻗는 기질 (갑목)이라 기준이 있어.");
  assert.equal(explanationFirstReportText("겁재(각자의 몫을 나누는 기능)라 구분해."), "각자의 몫을 나누는 기능 (겁재)이라 구분해.");
  assert.equal(explanationFirstReportText("편재(여러 자원을 연결하는 기능)는 선택지를 더해."), "여러 자원을 연결하는 기능 (편재)은 선택지를 더해.");
});
check("explanation-first text, ordinary asides and emoticons remain intact", () => {
  const text = "큰 나무처럼 곧게 뻗는 기질 (갑목)이야. ( •ω• ) 함께 정해(약속이 있다면).";
  assert.equal(explanationFirstReportText(text), text);
  const spans = splitReportTermAnnotations(text);
  assert.deepEqual(spans.filter(part => part.isTerm).map(part => part.text), ["(갑목)"]);
  assert.equal(spans.map(part => part.text).join(""), text);
  assert.equal(explanationFirstReportText("갑목(기질(큰 나무))"), "갑목(기질(큰 나무))");
});
check("identical adjacent labels collapse without rewriting meaning or particles", () => {
  for (const [text, expected] of [
    ["큰 나무의 기운을 뜻하는 갑목 (갑목)이 있어.", "큰 나무의 기운을 뜻하는 갑목이 있어."],
    ["2026년을 가리키는 이름인 병오 (병오)를 읽어.", "2026년을 가리키는 이름인 병오를 읽어."],
    ["각자의 몫을 나누는 겁재 (겁재)는 이런 뜻이야.", "각자의 몫을 나누는 겁재는 이런 뜻이야."],
    ["겁재(겁재)（겁재）는 이어져.", "겁재는 이어져."],
  ]) {
    const formatted = explanationFirstReportText(text);
    assert.equal(formatted, expected);
    assert.equal(explanationFirstReportText(formatted), formatted);
  }
  for (const text of ["친구(친구)는 소중해.", "갑목(정관)", "(갑목)과 (갑목)", "갑목 ( •ω• )"]) assert.equal(explanationFirstReportText(text), text);
});
check("self-referential definitions are left for editorial repair, never inverted into duplicates", () => {
  for (const text of ["갑목(큰 나무의 기운을 뜻하는 갑목)", "병오(2026년을 가리키는 이름인 병오)", "겁재(경쟁과 몫을 살피는 겁재)"]) {
    assert.equal(explanationFirstReportText(text), text);
  }
  assert.equal(explanationFirstReportText("충(서로 충돌하는 관계)은 이 뜻이야."), "서로 충돌하는 관계 (충)는 이 뜻이야.");
});
check("untrusted metadata cannot create annotation regexes or HTML", () => {
  const terms = [".*", "<script>", "(갑목)"];
  const text = "(일반 메모) ( •ω• ) <script>alert(1)</script>";
  assert(!splitReportTermAnnotations(text, terms).some(part => part.isTerm));
  assert.equal(explanationFirstReportText(text, terms), text);
});
check("a long topic is never split into sentence-sized bubbles", () => {
  const text = "일에서는 완성할 범위를 정하는 일이 중심이야. 새 아이디어가 생기면 지금 마무리할 일과 구분하는 기준이 생기지. 이 기준은 함께 일할 때도 이어져. 역할과 완료 조건을 연결해서 설명하면 대화의 중심이 흐트러지지 않아.";
  assert.deepEqual(reportTopicParagraphs(text), [text]);
});
check("older short lines join in order within at most three internal paragraphs", () => {
  const lines = Array.from({ length: 7 }, (_, index) => `기존 설명 ${index + 1}은 그대로 남아.`);
  const paragraphs = reportTopicParagraphs(lines.join("\n\n"));
  assert.equal(paragraphs.length, 3);
  assert.equal(paragraphs.join(" "), lines.join(" "));
});
check("six sections render six topic bubbles and muted term labels", () => {
  const content: ReportContent = {
    paragraphs: ["갑목(큰 나무처럼 곧게 뻗는 기질)이라 기준이 있어.\n\n그 기준을 설명해.\n\n뜻을 이어가.\n\n이야기를 마무리해.", "올해의 설명이야.", "관계의 설명이야.", "일의 설명이야.", "마음의 설명이야.", "올해의 마무리야."],
    meta: { charCount: 0, beats: [], termsUsed: [] },
  };
  const html = renderToStaticMarkup(createElement(MessageReport, { content }));
  assert.equal((html.match(/data-report-message="true"/gu) ?? []).length, 6);
  assert(html.includes('class="retro-term-note">(갑목)</span>'));
  assert(html.indexOf("큰 나무처럼 곧게 뻗는 기질") < html.indexOf("(갑목)"));
});
check("legacy missing terminology still renders and model text remains escaped", () => {
  const content = { paragraphs: ['갑목(큰 나무처럼 곧게 뻗는 기질) <img src=x onerror="alert(1)">'], meta: { presentation: "message" } } as ReportContent;
  const html = renderToStaticMarkup(createElement(MessageReport, { content }));
  assert(html.includes('class="retro-term-note">(갑목)</span>'));
  assert(html.includes("&lt;img"));
  assert(!html.includes("<img src=x"));
});

console.log(`${passed} presentation checks passed; no API or database calls.`);
