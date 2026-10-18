import { reportReactionPrefix } from "./report-emoticons";

const closingQuotes = new Set(["’", "”", "'", '"']);
const openingQuotes: Record<string, string> = { "‘": "’", "“": "”", "'": "'", '"': '"', "(": ")" };

/** Keep quotes, decimal numbers and reactions with their sentence. */
function sentencesOf(block: string) {
  const sentences: string[] = [];
  const pending: string[] = [];
  let start = 0;
  for (let index = 0; index < block.length; index += 1) {
    const character = block[index];
    if (pending.at(-1) === character) pending.pop();
    else if (openingQuotes[character]) pending.push(openingQuotes[character]);
    if (pending.length || !/[.!?。！？]/u.test(character)) continue;
    if (/\d/u.test(block[index - 1] ?? "") && /\d/u.test(block[index + 1] ?? "")) continue;
    let end = index + 1;
    while (/[.!?。！？]/u.test(block[end] ?? "") || closingQuotes.has(block[end])) end += 1;
    const next = end < block.length ? String.fromCodePoint(block.codePointAt(end)!) : "";
    const reaction = reportReactionPrefix(block.slice(end));
    if (next && !/\s|\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(next) && !reaction) continue;
    end += reaction.length;
    sentences.push(block.slice(start, end).trim());
    start = end;
    index = end - 1;
  }
  const remainder = block.slice(start).trim();
  if (remainder) sentences.push(remainder);
  return sentences;
}

/** Older unbroken reports also get readable bubbles, without rewriting them. */
export function splitReportMessages(paragraph: string) {
  return paragraph.split(/\n+/u).flatMap(block => {
    const messages: string[] = [];
    let current = "";
    let count = 0;
    for (const sentence of sentencesOf(block.trim())) {
      const combined = current ? `${current} ${sentence}` : sentence;
      if (current && (count === 2 || [...combined].length > 120)) {
        messages.push(current);
        current = sentence;
        count = 1;
      } else {
        current = combined;
        count += 1;
      }
    }
    if (current) messages.push(current);
    return messages;
  });
}
