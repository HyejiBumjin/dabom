import type { SajuCanonical } from "@/lib/saju/types";

const ELEMENT_KOR: Record<string, string> = {
  wood: "목", fire: "화", earth: "토", metal: "금", water: "수",
};
const KOR_TO_ENG: Record<string, string> = {
  목: "wood", 화: "fire", 토: "earth", 금: "metal", 수: "water",
};

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}
function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") { const n = Number(v); return Number.isFinite(n) ? n : null; }
  return null;
}
function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(asString).filter(Boolean);
  const s = asString(v);
  return s ? [s] : [];
}

export interface DerivedSignals {
  selfStrength: "strong" | "mid" | "weak";
  strengthScore: number | null;

  dominantElement: string;
  dominantElementKor: string;
  weakElement: string;
  weakElementKor: string;
  balancePattern: "balanced" | "skewed" | "extreme";
  fiveDistribution: Array<[string, number]>;

  geok: string;
  yongshinPrimary: string;
  yongshinSecondary: string;

  dayHangul: string;
  dayHanja: string;
  yearHangul: string;
  monthHangul: string;
  hourHangul: string;
  dayStemRole: string;
  dayBranchRole: string;

  basePersonalityPattern: string;

  tensionCount: number;
  harmonyCount: number;
  relationTensionLevel: "low" | "mid" | "high";
  hasClash: boolean;
  hasPunishment: boolean;
  hasGongmang: boolean;

  currentDaewoon: string;

  luckyElement: string;
  luckyDirection: string;
  luckyNumbers: string;

  dayStemElement: string;
}

function pickDataRoot(baseData: Record<string, unknown>): Record<string, unknown> {
  const data = baseData.data;
  return data && typeof data === "object" ? (data as Record<string, unknown>) : baseData;
}

function parseFive(root: Record<string, unknown>) {
  const five = asRecord(root.five);
  const entries = Object.entries(five).reduce<Array<[string, number]>>((acc, [k, v]) => {
    const n = asNumber(v);
    if (n !== null) acc.push([k, n]);
    return acc;
  }, []);
  entries.sort((a, b) => b[1] - a[1]);
  return {
    entries,
    strongest: entries[0]?.[0] || "metal",
    weakest: entries[entries.length - 1]?.[0] || "earth",
  };
}

function parseStrength(root: Record<string, unknown>) {
  const raw = asString(root.strength).toLowerCase();
  const score = asNumber(root.strength_score);
  const normalized: "strong" | "mid" | "weak" = raw.includes("strong")
    ? "strong"
    : raw.includes("weak")
      ? "weak"
      : score !== null && score >= 0.55
        ? "strong"
        : "mid";
  return { normalized, score };
}

function parseYongshin(root: Record<string, unknown>) {
  const y = asRecord(root.yongshin);
  const primary = asString(y.primary_kor) || asString(y.primary) || asString(y.main_kor) || asString(y.main) || "목";
  const secondary = asString(y.secondary_kor) || asString(y.secondary) || asString(y.sub_kor) || asString(y.sub) || "화";
  return { primary, secondary };
}

function parseRelations(root: Record<string, unknown>) {
  const ui = asRecord(root.relations_ui);
  const br = asRecord(root.branch_relations);
  const bk = asRecord(root.branch_relations_kor);
  const tensionCount = asNumber(ui.tension_count) ?? asNumber(br.tension_count) ?? asNumber(bk.tension_count) ?? 0;
  const harmonyCount = asNumber(ui.harmony_count) ?? asNumber(br.harmony_count) ?? asNumber(bk.harmony_count) ?? 0;
  const text = JSON.stringify({ ui, br, bk });
  return {
    tensionCount,
    harmonyCount,
    hasClash: /충/.test(text),
    hasPunishment: /형|파/.test(text),
    hasGongmang: /공망/.test(text),
  };
}

function parsePillars(root: Record<string, unknown>) {
  const day = asRecord(root.day);
  const year = asRecord(root.year);
  const month = asRecord(root.month);
  const hour = asRecord(root.hour);
  return {
    dayHanja: asString(day.hanja),
    dayHangul: asString(day.hangul),
    yearHangul: asString(year.hangul),
    monthHangul: asString(month.hangul),
    hourHangul: asString(hour.hangul),
    dayStemRole: asString(day.stem_sipseong),
    dayBranchRole: asString(day.branch_sipseong),
    dayStemElement: asString(day.stem_element) || asString(day.stem_five) || "",
  };
}

function parseGeokguk(root: Record<string, unknown>): string {
  const g = asRecord(root.geokguk);
  return asString(g.geok_detail) || asString(g.name_kor) || asString(g.name) || asString(root.geokguk) || "균형형";
}

function parseLucky(root: Record<string, unknown>) {
  const l = asRecord(root.lucky);
  return {
    element: asString(l.element_kor) || asString(l.element) || "목",
    direction: asString(l.direction_kor) || asString(l.direction) || "동쪽",
    numbers: asStringArray(l.numbers).join(", ") || "3, 4",
  };
}

function parseBigLuck(root: Record<string, unknown>): string {
  const bigLuck = root.big_luck;
  if (Array.isArray(bigLuck) && bigLuck.length > 0) {
    const first = asRecord(bigLuck[0]);
    const from = asString(first.from_age) || asString(first.start_age);
    const to = asString(first.to_age) || asString(first.end_age);
    const label = asString(first.label) || asString(first.ganji) || asString(first.hangul);
    if (from && to) return `${from}~${to}세 ${label}`.trim();
    if (label) return label;
  }
  return asString(root.big_luck) || "현재 대운 전환기";
}

function inferDayStemElement(hangul: string): string {
  const map: Record<string, string> = {
    갑: "wood", 을: "wood", 병: "fire", 정: "fire",
    무: "earth", 기: "earth", 경: "metal", 신: "metal",
    임: "water", 계: "water",
  };
  const first = hangul.charAt(0);
  return map[first] || "";
}

function derivePersonalityPattern(strength: string, dominant: string, geok: string): string {
  if (strength === "strong" && (dominant === "metal" || dominant === "wood")) return "실행형";
  if (strength === "strong" && dominant === "fire") return "표현형";
  if (strength === "strong" && dominant === "earth") return "안정형";
  if (strength === "strong" && dominant === "water") return "분석형";
  if (strength === "weak" && dominant === "water") return "유연형";
  if (strength === "weak" && (dominant === "fire" || dominant === "wood")) return "감성형";
  if (geok.includes("식신") || geok.includes("상관")) return "창작형";
  if (geok.includes("편관") || geok.includes("정관")) return "관리형";
  if (geok.includes("편재") || geok.includes("정재")) return "현실형";
  return "균형형";
}

function deriveBalancePattern(entries: Array<[string, number]>): "balanced" | "skewed" | "extreme" {
  if (entries.length < 2) return "balanced";
  const max = entries[0][1];
  const min = entries[entries.length - 1][1];
  const range = max - min;
  if (range > 3) return "extreme";
  if (range > 1.5) return "skewed";
  return "balanced";
}

export function deriveSignals(canonical: SajuCanonical): DerivedSignals {
  const root = pickDataRoot(canonical.baseData);

  const five = parseFive(root);
  const strength = parseStrength(root);
  const yongshin = parseYongshin(root);
  const relation = parseRelations(root);
  const pillars = parsePillars(root);
  const geok = parseGeokguk(root);
  const lucky = parseLucky(root);
  const daewoon = parseBigLuck(root);

  const dominantElement = five.strongest;
  const weakElement = five.weakest;
  const dominantKor = ELEMENT_KOR[dominantElement] || dominantElement;
  const weakKor = ELEMENT_KOR[weakElement] || weakElement;

  const tensionLevel: "low" | "mid" | "high" =
    relation.tensionCount - relation.harmonyCount >= 2 ? "high"
      : relation.tensionCount > relation.harmonyCount ? "mid"
        : "low";

  let dayStemElement = pillars.dayStemElement;
  if (!dayStemElement && pillars.dayHangul) {
    dayStemElement = inferDayStemElement(pillars.dayHangul);
  }
  if (!dayStemElement) dayStemElement = dominantElement;

  return {
    selfStrength: strength.normalized,
    strengthScore: strength.score,
    dominantElement,
    dominantElementKor: dominantKor,
    weakElement,
    weakElementKor: weakKor,
    balancePattern: deriveBalancePattern(five.entries),
    fiveDistribution: five.entries,
    geok,
    yongshinPrimary: yongshin.primary,
    yongshinSecondary: yongshin.secondary,
    dayHangul: pillars.dayHangul,
    dayHanja: pillars.dayHanja,
    yearHangul: pillars.yearHangul,
    monthHangul: pillars.monthHangul,
    hourHangul: pillars.hourHangul,
    dayStemRole: pillars.dayStemRole,
    dayBranchRole: pillars.dayBranchRole,
    basePersonalityPattern: derivePersonalityPattern(strength.normalized, dominantElement, geok),
    tensionCount: relation.tensionCount,
    harmonyCount: relation.harmonyCount,
    relationTensionLevel: tensionLevel,
    hasClash: relation.hasClash,
    hasPunishment: relation.hasPunishment,
    hasGongmang: relation.hasGongmang,
    currentDaewoon: daewoon,
    luckyElement: lucky.element,
    luckyDirection: lucky.direction,
    luckyNumbers: lucky.numbers,
    dayStemElement,
  };
}

export { ELEMENT_KOR, KOR_TO_ENG };
