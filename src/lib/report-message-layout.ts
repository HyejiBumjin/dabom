const closingQuotes = new Set(["’", "”", "'", '"']);
const openingQuotes: Record<string, string> = { "‘": "’", "“": "”", "'": "'", '"': '"', "(": ")" };

/** Keep quotes, decimal numbers and reaction emoji with their sentence. */
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
    if (next && !/\s|\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(next)) continue;
    // Emoji after punctuation belong to the preceding message, including ZWJ
    // sequences and skin tones. Nothing is inserted into the stored prose.
    const reaction = block.slice(end).match(/^\s*(?:[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\uFE0F\u200D\u20E3]+\s*)+/u);
    if (reaction) end += reaction[0].length;
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
