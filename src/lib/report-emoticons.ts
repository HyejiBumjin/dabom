/** Shared by generation and display, including reports saved with older emoji. */
export const REPORT_EMOTICONS = {
  playful: "(๑>ᴗ<๑)",
  smile: "( ˶ᵔ ᵕ ᵔ˶ )",
  calm: "(๑•ᴗ•๑)",
  gentle: "(｡•ㅅ•｡)",
  curious: "( •ω• )",
  nod: "(｡•ᴗ-)✧",
  cozy: "(っ˘ω˘ς )",
  delighted: "(ﾉ´ヮ`)ﾉ*:･ﾟ✧",
  sparkle: "✧",
  heart: "♡",
  closing: "(ฅ•ω•ฅ)♡",
} as const;

export const REPORT_EMOTICON_RANGE = "7~9";
export const MAX_REPORT_EMOTICONS = 9;

export const REPORT_EMOTICON_INSTRUCTIONS = `컬러 이모지는 쓰지 않는다. 귀엽고 다정한 문자 표정과 작은 별·하트만 전체 리포트에 ${REPORT_EMOTICON_RANGE}개 사용한다. 허용 표정: 장난 ${REPORT_EMOTICONS.playful}, 미소 ${REPORT_EMOTICONS.smile}, 다정함 ${REPORT_EMOTICONS.calm}, 몽글한 공감 ${REPORT_EMOTICONS.gentle}, 호기심 ${REPORT_EMOTICONS.curious}, 끄덕임 ${REPORT_EMOTICONS.nod}, 포근함 ${REPORT_EMOTICONS.cozy}, 반가움 ${REPORT_EMOTICONS.delighted}, 별 ${REPORT_EMOTICONS.sparkle}, 하트 ${REPORT_EMOTICONS.heart}. 무표정·피곤함·짜증·비꼬는 느낌의 표정은 쓰지 않는다. 표정은 이 목록의 괄호와 글자를 그대로 사용하고 결합 악센트나 다른 장식을 덧붙이지 않는다. 친구가 말끝에 반응을 붙이듯 농담·공감·강조의 감정에 맞춰 고른다. 앞부분에 몰아넣지 않고 전체 흐름에 분산한다. 한 문장에 최대 하나, 한 section(주제 말풍선) 안의 서로 다른 문장에 최대 두 개를 붙이며 같은 표정은 반복하지 않는다. 주의·위험·손실을 설명하는 문장에는 장식을 넣지 않는다. summary의 마지막 인사 끝에는 ${REPORT_EMOTICONS.closing}를 한 번 붙인다. 이 고양이 표정도 전체 ${REPORT_EMOTICON_RANGE}개와 section당 두 개에 포함한다. 이모티콘은 앞 문장에 붙이며 별도 메시지로 보내지 않는다. 수를 채우려고 해석 문장을 늘리지 않는다.`;

const emoticons = new Set<string>(Object.values(REPORT_EMOTICONS));
const escapePattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const emoticonPattern = [...emoticons].sort((a, b) => b.length - a.length).map(escapePattern).join("|");
// Models sometimes omit the outer parentheses or spaces. Match only complete
// known faces; never strip combining marks from Korean or other ordinary text.
const legacyEmoticons = [
  { source: "( -_- )", replacement: REPORT_EMOTICONS.gentle },
  { source: "( ^‿^ )", replacement: REPORT_EMOTICONS.calm },
  { source: "( •_• )", replacement: REPORT_EMOTICONS.playful },
  { source: "( ˘͈ ᵕ ˘͈ )", replacement: REPORT_EMOTICONS.calm },
  { source: "( •̀_•́ )", replacement: REPORT_EMOTICONS.playful },
  { source: "(｡•̀ᴗ-)✧", replacement: REPORT_EMOTICONS.nod },
];
const inputFaces = [
  ...[...emoticons].map(source => ({ source, replacement: source })),
  ...legacyEmoticons,
].sort((a, b) => b.source.length - a.source.length).map(face => {
  const wrapped = face.source.match(/^\(\s*(.*?)\s*\)(.*)$/u);
  const body = escapePattern(wrapped ? wrapped[1] : face.source).replace(/ +/gu, "[ \\t]*");
  const pattern = wrapped ? `(?:\\([ \\t]*${body}[ \\t]*\\)|${body})${escapePattern(wrapped[2])}` : body;
  return { ...face, pattern, match: new RegExp(`^(?:${pattern})$`, "u") };
});
const emoticonInputPattern = inputFaces.map(face => face.pattern).join("|");

/** Replace known old/unstyled faces without changing the message or its count. */
export function normalizeReportEmoticonGlyphs(text: string) {
  return text.replace(new RegExp(emoticonInputPattern, "gu"), token => inputFaces.find(face => face.match.test(token))!.replacement);
}

// Match whole emoji sequences so modifiers, ZWJ and flag tags cannot remain.
const emojiPattern = String.raw`(?:[#*0-9]\uFE0F?\u20E3|\p{Regional_Indicator}+|\p{Extended_Pictographic}[\uFE0E\uFE0F\p{Emoji_Modifier}]*(?:\u200D\p{Extended_Pictographic}[\uFE0E\uFE0F\p{Emoji_Modifier}]*)*[\u{E0020}-\u{E007F}]*)`;
const decorationPattern = `${emoticonInputPattern}|${emojiPattern}`;

/** Also used by the sentence splitter: a reaction belongs to the preceding line. */
export function reportReactionPrefix(text: string) {
  return text.match(new RegExp(`^\\s*(?:(?:${decorationPattern})\\s*)+`, "u"))?.[0] ?? "";
}

export function splitReportEmoticons(text: string) {
  return normalizeReportEmoticonGlyphs(text).split(new RegExp(`(${emoticonPattern})`, "u")).filter(Boolean)
    .map(part => ({ text: part, isEmoticon: emoticons.has(part) }));
}

/** Decorations must not satisfy minimum evidence length or hide a prose ending. */
export function stripReportDecorations(text: string) {
  return text.replace(new RegExp(decorationPattern, "gu"), token => /\u20E3/u.test(token) ? token[0] : "")
    .replace(/[\p{Emoji_Modifier}\uFE0E\uFE0F\u200D\u20E3]/gu, "");
}

function textReaction(emoji: string) {
  if (/\u20E3/u.test(emoji)) return emoji[0];
  if (/[😅😂🤣😏😉]/u.test(emoji)) return REPORT_EMOTICONS.playful;
  if (/[🙂😊😄😃😀😁]/u.test(emoji)) return REPORT_EMOTICONS.smile;
  if (/[😌🥹🥰🤗]/u.test(emoji)) return REPORT_EMOTICONS.calm;
  if (/[🫠😵😮]/u.test(emoji)) return REPORT_EMOTICONS.gentle;
  if (/[❤💛🤍💜💙💚🧡🩷💕💖💗]/u.test(emoji)) return REPORT_EMOTICONS.heart;
  if (/[✨⭐🌟]/u.test(emoji)) return REPORT_EMOTICONS.sparkle;
  return "";
}

const caution = /주의|조심|위험|경고|사고|질병|이별|손실/u;
const cleanSpacing = (text: string) => text.replace(/[^\S\n]+/gu, " ").replace(/ +([.!?。！？])/gu, "$1").trim();
const hasProse = (text: string) => /[가-힣A-Za-z0-9]/u.test(stripReportDecorations(text));
const openingQuotes: Record<string, string> = { "‘": "’", "“": "”", "'": "'", '"': '"', "(": ")" };
const closingQuotes = new Set(["’", "”", "'", '"']);

/** Keep reactions after punctuation with that sentence, without rewriting it. */
function reactionSentences(line: string): string[] {
  const sentences: string[] = [];
  const pending: string[] = [];
  const decoration = new RegExp(decorationPattern, "uy");
  let start = 0;
  for (let index = 0; index < line.length; index += 1) {
    decoration.lastIndex = index;
    const token = decoration.exec(line);
    if (token) { index += token[0].length - 1; continue; }
    const character = line[index];
    if (pending.at(-1) === character) pending.pop();
    else if (openingQuotes[character]) pending.push(openingQuotes[character]);
    if (pending.length || !/[.!?。！？]/u.test(character)) continue;
    if (/\d/u.test(line[index - 1] ?? "") && /\d/u.test(line[index + 1] ?? "")) continue;
    let end = index + 1;
    while (/[.!?。！？]/u.test(line[end] ?? "") || closingQuotes.has(line[end])) end += 1;
    const reaction = reportReactionPrefix(line.slice(end));
    // A quoted word or abbreviation immediately followed by prose continues.
    if (line[end] && !/\s/u.test(line[end]) && !reaction) continue;
    end += reaction.length;
    sentences.push(line.slice(start, end));
    start = end;
    index = end - 1;
  }
  if (start < line.length) sentences.push(line.slice(start));
  return sentences;
}

/** Cosmetic and idempotent: preserve prose, never retry an LLM for decoration. */
export function formatReportEmoticons(paragraphs: string[]) {
  const normalized = paragraphs.map(normalizeReportEmoticonGlyphs);
  const lastIndex = normalized.findLastIndex(hasProse);
  const seen = new Set<string>();
  let count = 0;
  return normalized.map((paragraph, index) => {
    let sectionCount = 0;
    const lines = paragraph.replace(new RegExp(emojiPattern, "gu"), textReaction).split("\n");
    const lastLine = lines.findLastIndex(hasProse);
    return lines.map((line, lineIndex) => {
      const sentences = reactionSentences(line);
      const lastSentence = sentences.findLastIndex(hasProse);
      return cleanSpacing(sentences.map((sentence, sentenceIndex) => {
        const isClosing = index === lastIndex && lineIndex === lastLine && sentenceIndex === lastSentence;
        const prose = hasProse(sentence);
        let usedInSentence = false;
        const text = sentence.replace(new RegExp(emoticonPattern, "gu"), token => {
          if (isClosing || !prose || caution.test(sentence) || token === REPORT_EMOTICONS.closing || usedInSentence || seen.has(token) || count >= MAX_REPORT_EMOTICONS - 1 || sectionCount >= (index === lastIndex ? 1 : 2)) return "";
          seen.add(token);
          count += 1;
          sectionCount += 1;
          usedInSentence = true;
          return token;
        });
        return isClosing && prose && !caution.test(text) ? `${text.trimEnd()} ${REPORT_EMOTICONS.closing}${text.match(/\s*$/u)![0]}` : text;
      }).join(""));
    }).join("\n").trim();
  });
}
