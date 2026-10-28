import assert from "node:assert/strict";
import { formatReportEmoticons, MAX_REPORT_EMOTICONS, normalizeReportEmoticonGlyphs, reportReactionPrefix, REPORT_EMOTICONS as faces, REPORT_EMOTICON_INSTRUCTIONS, splitReportEmoticons, stripReportDecorations } from "../src/lib/report-emoticons";

// Pure display/generation formatting: no API, model, browser, or database calls.
let checks = 0;
function check(name: string, run: () => void) {
  run();
  checks += 1;
  console.log(`PASS ${name}`);
}
const reactions = (text: string) => splitReportEmoticons(text).filter((part) => part.isEmoticon).map((part) => part.text);
const prose = (text: string) => stripReportDecorations(text).replace(/\s/gu, "");
const regularFaces = Object.values(faces).filter((face) => face !== faces.closing);

check("long one-line topics can retain two reactions in different sentences", () => {
  const input = [`세심하게 기준을 보는 편이야. ${faces.smile} 잘 맞는 선택도 빨리 알아채네. ${faces.calm}`, "올해도 네 속도를 지켜 가길 바라."];
  const result = formatReportEmoticons(input);
  assert.deepEqual(reactions(result[0]), [faces.smile, faces.calm]);
  assert.equal(prose(result[0]), prose(input[0]));
  assert(!result[0].includes("\n"), "formatting inserted new topic breaks");
});

check("a one-line summary retains its first reaction and one final closing cat", () => {
  const input = [`네 기준이 선명해지는 해네. ${faces.cozy} 네 선택이 마음에 오래 남길 바라. ${faces.heart}`];
  const result = formatReportEmoticons(input);
  assert.deepEqual(reactions(result[0]), [faces.cozy, faces.closing]);
  assert(result[0].endsWith(faces.closing));
  assert.equal(prose(result[0]), prose(input[0]));
});

check("six unbroken topics can retain nine globally unique reactions", () => {
  const input = Array.from({ length: 5 }, (_, index) => `기준이 선명해지는 순간이야. ${regularFaces[index * 2]} 다른 선택도 연결돼 있어. ${regularFaces[index * 2 + 1]}`);
  input.push("올해는 네 기준을 다듬는 해네. 네 마음이 편한 선택을 응원할게.");
  const result = formatReportEmoticons(input);
  const all = result.flatMap(reactions);
  assert.equal(all.length, MAX_REPORT_EMOTICONS);
  assert.equal(new Set(all).size, all.length);
  assert(result.every((section) => reactions(section).length <= 2));
  assert.equal(all.filter((face) => face === faces.closing).length, 1);
  assert.deepEqual(result.map(prose), input.map(prose));
  assert.deepEqual(formatReportEmoticons(result), result);
});

check("seven suitably placed reactions remain seven instead of collapsing by line", () => {
  const input = Array.from({ length: 5 }, (_, index) => `정리된 기준이 보여. ${regularFaces[index]} 다음 선택까지 이어지는 흐름이야.`);
  input.push(`너다운 기준을 지켜 가는 해네. ${faces.cozy} 오늘보다 편안하게 선택할 수 있길 바라.`);
  assert.equal(formatReportEmoticons(input).flatMap(reactions).length, 7);
});

check("multiple reactions around one sentence are reduced to one", () => {
  const result = formatReportEmoticons([`기준을 보는 감각이 좋아 ${faces.smile}. ${faces.calm} ${faces.playful} 같은 문장의 반응은 여기까지야.`, "네 선택을 응원할게."]);
  assert.deepEqual(reactions(result[0]), [faces.smile]);
});

check("warning sentences lose decoration while a separate warm sentence keeps it", () => {
  const result = formatReportEmoticons([`손실 위험은 조심해야 해. ${faces.sparkle} 확인할 기준이 선명해졌네. ${faces.nod}`, "마음이 편한 선택을 이어 가길 바라."]);
  assert.deepEqual(reactions(result[0]), [faces.nod]);
  assert(result[0].startsWith("손실 위험은 조심해야 해. 확인할 기준"));
  const warningOnly = formatReportEmoticons([`위험을 조심해야 해. ${faces.heart}`]);
  assert.equal(reactions(warningOnly[0]).length, 0, "a cautionary final sentence gained a closing decoration");
});

check("reaction punctuation, quoted questions, and decimals do not create extra slots", () => {
  const input = [`‘왜 지금 바꾸지?’라고 생각하며 3.5만 원의 쓰임을 적어 봐 ${faces.delighted} ${faces.smile}. 익숙한 기준도 선명해지네. ${faces.calm}`, "올해의 선택을 응원할게."];
  const result = formatReportEmoticons(input);
  assert.deepEqual(reactions(result[0]), [faces.delighted, faces.calm]);
  assert.equal(prose(result[0]), prose(input[0]));
});

check("internal paragraphs and sentence punctuation are preserved", () => {
  const input = [`‘이게 내 기준이네.’라고 느껴져. ${faces.curious}\n\n시간이 쌓이면 선택도 보이겠지! ${faces.nod}\n\n남긴 기록이 다음 선택으로 이어져.`, "네 속도로 올해를 보내길 바라."];
  const result = formatReportEmoticons(input);
  assert.deepEqual(reactions(result[0]), [faces.curious, faces.nod]);
  assert.equal(result[0].split("\n\n").length, 3);
  assert.equal(prose(result[0]), prose(input[0]));
});

check("duplicates and misplaced closing cats do not reappear after repeated formatting", () => {
  const input = [`기준이 보여. ${faces.smile} 네 선택도 보여. ${faces.smile} ${faces.closing}`, `${faces.closing}\n\n네 속도로 골라 가길 바라. ${faces.heart}`];
  const original = structuredClone(input);
  const result = formatReportEmoticons(input);
  assert.deepEqual(result.flatMap(reactions), [faces.smile, faces.closing]);
  assert.deepEqual(formatReportEmoticons(result), result);
  assert.deepEqual(input, original);
});

check("complex emoji sequences convert or disappear as a whole without prose changes", () => {
  const input = ["2026년 1️⃣월에도 3.5만 원의 쓰임을 기억해. 👩🏽‍💻 🇰🇷 🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F} 다음 기준도 선명해. ❤️", "미소가 이어지길 바라. 🙂"];
  const result = formatReportEmoticons(input);
  assert(!/[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}\uFE0F\u200D\u20E3\u{E0020}-\u{E007F}]/u.test(result.join("")));
  assert.deepEqual(result.map(prose), input.map(prose));
  assert.deepEqual(formatReportEmoticons(result), result);
});

check("empty and decoration-only content cannot manufacture a prose closing", () => {
  assert.deepEqual(formatReportEmoticons(["", `${faces.smile}\n\n${faces.closing}`, "👩🏽‍💻"]), ["", "", ""]);
});

check("instructions apply the limit to sentences within a topic bubble", () => {
  assert(REPORT_EMOTICON_INSTRUCTIONS.includes("전체 리포트에 7~9개"));
  assert(REPORT_EMOTICON_INSTRUCTIONS.includes("한 문장에 최대 하나"));
  assert(REPORT_EMOTICON_INSTRUCTIONS.includes("section(주제 말풍선)"));
  assert(!REPORT_EMOTICON_INSTRUCTIONS.includes("한 메시지에 최대 하나"));
});

check("old calm faces render as the replacement with or without parentheses", () => {
  for (const oldFace of ["( ˘͈ ᵕ ˘͈ )", "˘͈ ᵕ ˘͈", "(˘͈ᵕ˘͈)", "˘͈ᵕ˘͈"]) {
    const input = [`네 판단을 믿어도 좋아. ${oldFace} 다음 선택도 천천히 해도 돼.`, "오늘도 편안하게 보내길 바라."];
    const result = formatReportEmoticons(input);
    assert.deepEqual(reactions(result[0]), [faces.calm]);
    assert(!result.join("").includes("\u0348"));
    assert.deepEqual(result.map(prose), input.map(prose));
    assert.deepEqual(formatReportEmoticons(result), result);
    assert.equal(normalizeReportEmoticonGlyphs(`앞 ${oldFace} 뒤`), `앞 ${faces.calm} 뒤`);
  }
});

check("known bare faces are decoration even when they use non-Korean glyphs", () => {
  for (const face of Object.values(faces)) {
    const bare = face.replace(/^\(\s*(.*?)\s*\)(.*)$/u, "$1$2");
    assert.equal(normalizeReportEmoticonGlyphs(bare), face);
    assert.equal(stripReportDecorations(bare), "");
    assert.deepEqual(reactions(bare), [face]);
    const prefix = ` ${bare} `;
    assert.equal(reportReactionPrefix(`${prefix}이어지는 말이야.`), prefix, "a sentence prefix must retain its original length");
  }
});

check("all allowed faces avoid combining marks without deleting marks from prose", () => {
  assert(Object.values(faces).every(face => !/\p{Mark}/u.test(face)));
  const input = "각 cafe\u0301 방법을 কাজে 연결해.";
  assert.equal(normalizeReportEmoticonGlyphs(input), input);
  assert.equal(stripReportDecorations(input), input);
  assert.equal(normalizeReportEmoticonGlyphs("( •̀_•́ ) (｡•̀ᴗ-)✧"), `${faces.playful} ${faces.nod}`);
  assert(!REPORT_EMOTICON_INSTRUCTIONS.includes("˘͈"));
});

check("old and new versions of one face share the same reaction budget", () => {
  const result = formatReportEmoticons([
    `네 판단을 믿어도 좋아. ˘͈ ᵕ ˘͈ 다음 선택도 괜찮아. ${faces.calm}`,
    "오늘도 편안하게 보내길 바라.",
  ]);
  assert.deepEqual(reactions(result[0]), [faces.calm]);
  assert.deepEqual(formatReportEmoticons(result), result);
});

console.log(`Report emoticon checks: ${checks} passed.`);
