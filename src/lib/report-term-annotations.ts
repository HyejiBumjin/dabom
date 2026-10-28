/** Display-only annotations. Stored prose and calculation evidence are untouched. */
const COMMON_REPORT_TERMS = [
  "갑목", "을목", "병화", "정화", "무토", "기토", "경금", "신금", "임수", "계수",
  "비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인",
  "비겁", "식상", "재성", "관성", "인성", "일간", "원국", "세운", "대운", "월운",
  "화극금", "수극화", "병오", "갑신", "육합", "육충", "합", "충",
];

function reportTerms(terms: string[]) {
  // A term is short Korean text, never a regex or markup supplied by a model.
  return [...new Set([...COMMON_REPORT_TERMS, ...terms.filter(term => /^[가-힣]{1,8}$/u.test(term))])]
    .sort((left, right) => right.length - left.length);
}

function glossParticle(gloss: string, particle: string) {
  const last = gloss.trim().at(-1);
  if (!last || !/[가-힣]/u.test(last)) return particle;
  const finalConsonant = (last.charCodeAt(0) - 0xac00) % 28;
  if (particle === "은" || particle === "는") return finalConsonant ? "은" : "는";
  if (particle === "을" || particle === "를") return finalConsonant ? "을" : "를";
  if (particle === "과" || particle === "와") return finalConsonant ? "과" : "와";
  if (particle === "이라" || particle === "라") return finalConsonant ? "이라" : "라";
  if (particle === "으로" || particle === "로") return finalConsonant && finalConsonant !== 8 ? "으로" : "로";
  if (particle === "이" || particle === "가") return finalConsonant ? "이" : "가";
  return particle;
}

/** Adapt only an explicit legacy glossary pair; never invent a missing gloss. */
export function explanationFirstReportText(text: string, terms: string[] = []) {
  const labels = reportTerms(terms).join("|");
  // An identical adjacent label adds no meaning. Retain the original noun and
  // its particle instead of inventing a gloss or deleting surrounding prose.
  const duplicate = new RegExp(`(?<![\\p{L}\\p{N}])(${labels})(?:\\s*[（(]\\s*\\1\\s*[）)])+`, "gu");
  const deduplicated = text.replace(duplicate, "$1");
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(${labels})\\s*[（(]([^()（）\\n]{4,100})[）)](으로|이라|은|는|을|를|과|와|로|라|[이가](?=\\s|$))?`, "gu");
  return deduplicated.replace(pattern, (original: string, term: string, gloss: string, particle: string = "") => {
    // Ordinary asides, nested parentheses, and reactions aren't definitions.
    if (!/[가-힣]{2}/u.test(gloss) || /[<>.!?。！？]/u.test(gloss)) return original;
    const selfReference = new RegExp(`(?:^|[\\s\\p{P}])${term}(?=$|[\\s\\p{P}]|은|는|이|가|을|를|과|와|의|에|로|으로|이라|라는|도)`, "u");
    if (selfReference.test(gloss)) return original;
    return `${gloss.trim()} (${term})${glossParticle(gloss, particle)}`;
  });
}

/** Only a short technical label gets muted; emoticons and ordinary asides don't. */
export function splitReportTermAnnotations(text: string, terms: string[] = []) {
  const labels = reportTerms(terms).join("|");
  const pattern = new RegExp(`([（(]\\s*(?:${labels})\\s*[）)])`, "gu");
  const exact = new RegExp(`^[（(]\\s*(?:${labels})\\s*[）)]$`, "u");
  return text.split(pattern).filter(Boolean).map(part => ({
    text: part,
    isTerm: exact.test(part),
  }));
}
