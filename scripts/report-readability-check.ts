import assert from "node:assert/strict";
import { REPORT_EMOTICONS } from "../src/lib/report-emoticons";
import { getReportReadabilityIssues, getUnexpectedReportCharacters, hasInlineTermExplanation, hasReportTerm } from "../src/lib/llm/report-rules";

// Pure prose checks. No API, database, credentials or generated personal data.
let checks = 0;
function check(name: string, run: () => void) {
  run();
  checks += 1;
  console.log(`PASS ${name}`);
}

check("observed adjacent labels and self-referential glosses receive one correction", () => {
  for (const paragraph of [
    "큰 나무의 기운을 뜻하는 갑목 (갑목)이 있어.",
    "2026년을 가리키는 이름인 병오 (병오)를 읽어.",
    "각자의 몫을 나누는 겁재 (겁재)를 읽어.",
    "갑목(큰 나무의 기운을 뜻하는 갑목)이라 부르지.",
    "서로 연결되는 합（ 합 ）을 말해.",
    "차이를 보는 눈 (신금)이야. 이어서 신금 (신금)을 다시 써도 잡아.",
  ]) {
    const issues = getReportReadabilityIssues(paragraph);
    assert.equal(issues.length, 1, paragraph);
    assert(issues[0].includes("괄호 안팎에서 반복"));
  }
});

check("only the observed abstract formulations receive targeted feedback", () => {
  for (const paragraph of [
    "기존 조건과 새 요구를 조정하는 관계라는 뜻이야.",
    "경쟁과 몫을 살피는 겁재를 읽어.",
    "이 기능이 더해져 선택이 달라져.",
    "타고난 기질이 작동해 반응이 생겨.",
  ]) {
    const issues = getReportReadabilityIssues(paragraph);
    assert.equal(issues.length, 1, paragraph);
    assert(issues[0].includes("생활에서 무슨 뜻"));
  }
});

check("calculation disclaimers are caught without requesting certain predictions", () => {
  for (const paragraph of [
    "날짜의 관계만으로 실제 사건을 단정할 수는 없으니 조심해야 해.",
    "사주만으로 결과를 확정할 수 없어.",
    "합과 충으로 실제 사건을 예측할 수는 없어.",
    "관계만으로 실제 사건을 단정할 수는 없다는 뜻이야.",
  ]) {
    const issues = getReportReadabilityIssues(paragraph);
    assert.equal(issues.length, 1, paragraph);
    assert(issues[0].includes("작성자용 설명"));
    assert(issues[0].includes("결과를 확정하는 문장으로 바꾸지"));
  }
});

check("ordinary relationships, conditional advice and short clear glosses stay valid", () => {
  for (const paragraph of [
    "관계에서는 서로 맡을 일과 약속 날짜를 같이 정하면 편해.",
    "새 요구가 생기면 기존 조건부터 확인하고 바꿀 일을 정해.",
    "사람마다 사정이 다르니 상대 마음을 단정할 수는 없어.",
    "이 한 번의 답장으로 두 사람의 관계를 단정할 수는 없어.",
    "계산을 마친 뒤 이번 달에 쓸 돈을 나눠 두면 편해.",
    "차이를 보는 눈 (신금)을 지녔어. 내 몫을 지키는 힘 (겁재)도 읽혀.",
    "2026년 (병오)의 이야기야. ( •ω• )",
    "서로 다른 생각을 맞춰 가는 관계 (합)로 읽어.",
    "충(서로 충돌하는 관계)을 뜻해. 합(합리적인 선택)이란 문구도 중복 이름은 아니야.",
    "친구(친구)라는 일반 단어를 명리 용어로 오인하지 않아.",
  ]) assert.deepEqual(getReportReadabilityIssues(paragraph), [], paragraph);
});

check("feedback stays bounded to three categories even in repetitive prose", () => {
  const paragraph = "갑목 (갑목). 기존 조건과 새 요구를 조정하는 관계. 날짜의 관계만으로 실제 사건을 단정할 수는 없으니.".repeat(20);
  const original = paragraph;
  const issues = getReportReadabilityIssues(paragraph);
  assert.equal(issues.length, 3);
  assert.equal(new Set(issues).size, 3);
  assert.equal(paragraph, original);
  assert.deepEqual(getReportReadabilityIssues(paragraph), issues);
});

check("ordinary forms of 세우다 are not mistaken for annual fortune terms", () => {
  for (const paragraph of [
    "만약 함께 계획을 세운다면, 각자 맡을 일을 나눠.",
    "계획을 세운 뒤에는 맡은 일을 확인해.",
    "계획을 함께 세운 후에 정해.",
    "기준을 다시 세운 다음에 살펴.",
    "목표를 세운 뒤에 할 일을 골라.",
    "계획을 세운다고 마음먹었어.",
  ]) {
    assert.equal(hasReportTerm(paragraph, "세운"), false, paragraph);
    assert.equal(hasInlineTermExplanation(paragraph, "세운"), false, paragraph);
    assert.deepEqual(getReportReadabilityIssues(paragraph), [], paragraph);
  }
});

check("real annual fortune terms remain visible after an ordinary verb", () => {
  for (const paragraph of [
    "올해의 세운은 새로 맡는 일을 살펴.",
    "세운의 흐름을 읽어.",
    "세운에서 읽히는 내용을 살펴.",
    "한 해 동안의 운을 읽는 말 (세운)이야.",
    "계획을 세운 뒤에는 세운의 흐름을 살펴.",
    "계획을 세운다면, 한 해 동안의 운을 읽는 말 (세운)도 확인해.",
  ]) assert.equal(hasReportTerm(paragraph, "세운"), true, paragraph);
});

check("inline explanations start at the real term instead of an earlier ordinary verb", () => {
  for (const paragraph of [
    "계획을 세운 뒤에는 올해를 살펴. 한 해 동안의 운을 읽는 말 (세운)이야.",
    "계획을 세운 뒤에 살필 한 해 동안의 운을 읽는 말 (세운)이야.",
    "계획을 세운다면, 한 해 동안의 운을 읽는 말 (세운)도 확인해.",
    "계획을 세운 뒤에 할 일을 확인해.\n한 해 동안의 운을 읽는 말 (세운)이야.",
    "한 해 동안의 운을 읽는 말 (세운)이야. 계획을 세운 뒤에 확인해.",
  ]) assert.equal(hasInlineTermExplanation(paragraph, "세운"), true, paragraph);
  assert.equal(hasInlineTermExplanation("계획을 세운 뒤 세운을 살펴. 한 해 동안의 운을 읽는 말 (세운)이야.", "세운"), false);
  assert.equal(hasInlineTermExplanation("계획을 세운 뒤\n세운을 살펴.\n한 해 동안의 운을 읽는 말 (세운)이야.", "세운"), false);
});

check("the narrow verb exception keeps duplicate-term feedback and other terms unchanged", () => {
  assert.equal(getReportReadabilityIssues("한 해 동안의 운을 읽는 세운 (세운)이야.").length, 1);
  assert.equal(hasReportTerm("일을 익히며 내놓는 힘 (식신)이야.", "식신"), true);
  assert.equal(hasReportTerm("충분히 살펴보고 합리적으로 정해.", "충"), false);
  assert.equal(hasReportTerm("충분히 살펴보고 합리적으로 정해.", "합"), false);
});

check("mixed-language prose and broken replacement glyphs cannot pass as Korean", () => {
  for (const text of [
    "배운 방법을 কাজে 연결하는 힘이 있어.",
    "일을 работа처럼 설명해.",
    "이야기에 こんにちは가 섞였어.",
    "배운 방법을 � 연결해.",
  ]) assert(getUnexpectedReportCharacters(text).length > 0, text);
  assert.deepEqual(getUnexpectedReportCharacters("কাজে".repeat(40)), getUnexpectedReportCharacters("কাজে"));
});

check("approved special faces, Korean and ordinary abbreviations stay readable", () => {
  for (const face of Object.values(REPORT_EMOTICONS)) {
    assert.deepEqual(getUnexpectedReportCharacters(`올해 AI 도구를 배워. ${face}`), [], face);
    assert.deepEqual(getUnexpectedReportCharacters(`올해 AI 도구를 배워. ${face.replace(/[()]/gu, "").trim()}`), [], face);
  }
  for (const text of ["차근차근 배워. ˘͈ ᵕ ˘͈", "차근차근 배워. ( ˘͈ ᵕ ˘͈ )", "2026년, 배운 방법을 일에 활용해. ㅋㅋ", "한글을 바르게 써.".normalize("NFD")]) {
    assert.deepEqual(getUnexpectedReportCharacters(text), [], text);
  }
});

console.log(`${checks} text quality groups passed; no API or database calls.`);
