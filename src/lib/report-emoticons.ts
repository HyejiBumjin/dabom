/** Shared by generation and display, including reports saved with older emoji. */
export const REPORT_EMOTICONS = {
  playful: "( •̀_•́ )",
  smile: "( ˶ᵔ ᵕ ᵔ˶ )",
  calm: "( ˘͈ ᵕ ˘͈ )",
  tired: "( -_- )",
  sparkle: "✧",
  heart: "♡",
  closing: "(ฅ•ω•ฅ)♡",
} as const;

export const REPORT_EMOTICON_INSTRUCTIONS = `컬러 이모지는 쓰지 않는다. 문자로 된 표정과 작은 별·하트만 전체 리포트에 3~5개 사용한다. 허용 표정: 장난 ${REPORT_EMOTICONS.playful}, 미소 ${REPORT_EMOTICONS.smile}, 다정함 ${REPORT_EMOTICONS.calm}, 가벼운 피곤함 ${REPORT_EMOTICONS.tired}, 별 ${REPORT_EMOTICONS.sparkle}, 하트 ${REPORT_EMOTICONS.heart}. 문맥에 맞는 것만 골라 한 메시지에 최대 하나, 같은 표정은 반복하지 않는다. 주의·위험·손실을 설명하는 메시지에는 장식을 넣지 않는다. summary의 마지막 인사 끝에는 ${REPORT_EMOTICONS.closing}를 한 번 붙인다. 이 고양이 표정도 전체 3~5개에 포함한다. 이모티콘은 앞 문장에 붙이며 별도 메시지로 보내지 않는다. 수를 채우려고 해석 문장을 늘리지 않는다.`;

const emoticons = new Set<string>(Object.values(REPORT_EMOTICONS));
const escapePattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const emoticonPattern = [...emoticons].sort((a, b) => b.length - a.length).map(escapePattern).join("|");
// Match whole emoji sequences so modifiers, ZWJ and flag tags cannot remain.
const emojiPattern = String.raw`(?:[#*0-9]\uFE0F?\u20E3|\p{Regional_Indicator}+|\p{Extended_Pictographic}[\uFE0E\uFE0F\p{Emoji_Modifier}]*(?:\u200D\p{Extended_Pictographic}[\uFE0E\uFE0F\p{Emoji_Modifier}]*)*[\u{E0020}-\u{E007F}]*)`;
const decorationPattern = `${emoticonPattern}|${emojiPattern}`;

/** Also used by the sentence splitter: a reaction belongs to the preceding line. */
export function reportReactionPrefix(text: string) {
  return text.match(new RegExp(`^\\s*(?:(?:${decorationPattern})\\s*)+`, "u"))?.[0] ?? "";
}

export function splitReportEmoticons(text: string) {
  return text.split(new RegExp(`(${emoticonPattern})`, "u")).filter(Boolean)
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
  if (/[🫠😵😮]/u.test(emoji)) return REPORT_EMOTICONS.tired;
  if (/[❤💛🤍💜💙💚🧡🩷💕💖💗]/u.test(emoji)) return REPORT_EMOTICONS.heart;
  if (/[✨⭐🌟]/u.test(emoji)) return REPORT_EMOTICONS.sparkle;
  return "";
}

const caution = /주의|조심|위험|경고|사고|질병|이별|손실/u;
const cleanSpacing = (text: string) => text.replace(/[^\S\n]+/gu, " ").replace(/ +([.!?。！？])/gu, "$1").trim();

/** Cosmetic and idempotent: preserve prose, never retry an LLM for decoration. */
export function formatReportEmoticons(paragraphs: string[]) {
  const lastIndex = paragraphs.findLastIndex(paragraph => stripReportDecorations(paragraph).trim());
  const seen = new Set<string>();
  let count = 0;
  return paragraphs.map((paragraph, index) => {
    const lines = paragraph.replace(new RegExp(emojiPattern, "gu"), textReaction).split("\n");
    const lastLine = lines.findLastIndex(line => stripReportDecorations(line).trim());
    return lines.map((line, lineIndex) => {
      const isClosing = index === lastIndex && lineIndex === lastLine;
      const hasProse = /[가-힣A-Za-z0-9]/u.test(stripReportDecorations(line));
      let usedInLine = false;
      const text = cleanSpacing(line.replace(new RegExp(emoticonPattern, "gu"), token => {
        if (isClosing || !hasProse || caution.test(line) || token === REPORT_EMOTICONS.closing || usedInLine || seen.has(token) || count >= 4) return "";
        seen.add(token);
        count += 1;
        usedInLine = true;
        return token;
      }));
      return isClosing && hasProse && !caution.test(text) ? `${text} ${REPORT_EMOTICONS.closing}` : text;
    }).join("\n").trim();
  });
}
