import type { Myeongsik, PillarName } from "@/lib/saju/myeongsik";

type Element = "wood" | "fire" | "earth" | "metal" | "water";

export interface SajuBlueprintCard {
  id: string;
  title: string;
  evidence: string[];
  interpretation: string;
  writingDirection: string;
}

export interface SajuInterpretationBlueprint {
  cards: SajuBlueprintCard[];
}

const pillarLabels: Record<PillarName, string> = { year: "년주", month: "월주", day: "일주", hour: "시주" };
const pillarOrder: PillarName[] = ["year", "month", "day", "hour"];
const elementKorean: Record<Element, string> = { wood: "목", fire: "화", earth: "토", metal: "금", water: "수" };
const stem: Record<string, { reading: string; element: Element; yang: boolean }> = {
  甲: { reading: "갑", element: "wood", yang: true }, 乙: { reading: "을", element: "wood", yang: false },
  丙: { reading: "병", element: "fire", yang: true }, 丁: { reading: "정", element: "fire", yang: false },
  戊: { reading: "무", element: "earth", yang: true }, 己: { reading: "기", element: "earth", yang: false },
  庚: { reading: "경", element: "metal", yang: true }, 辛: { reading: "신", element: "metal", yang: false },
  壬: { reading: "임", element: "water", yang: true }, 癸: { reading: "계", element: "water", yang: false },
};
const branch: Record<string, { reading: string; element: Element; season: "spring" | "summer" | "autumn" | "winter" | "transition" }> = {
  子: { reading: "자", element: "water", season: "winter" }, 丑: { reading: "축", element: "earth", season: "transition" },
  寅: { reading: "인", element: "wood", season: "spring" }, 卯: { reading: "묘", element: "wood", season: "spring" },
  辰: { reading: "진", element: "earth", season: "transition" }, 巳: { reading: "사", element: "fire", season: "summer" },
  午: { reading: "오", element: "fire", season: "summer" }, 未: { reading: "미", element: "earth", season: "transition" },
  申: { reading: "신", element: "metal", season: "autumn" }, 酉: { reading: "유", element: "metal", season: "autumn" },
  戌: { reading: "술", element: "earth", season: "transition" }, 亥: { reading: "해", element: "water", season: "winter" },
};
const produces: Record<Element, Element> = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
const controls: Record<Element, Element> = { wood: "earth", fire: "metal", earth: "water", metal: "wood", water: "fire" };
const tenGodKorean: Record<string, string> = { 比肩: "비견", 劫财: "겁재", 食神: "식신", 伤官: "상관", 偏财: "편재", 正财: "정재", 偏官: "편관", 七杀: "칠살", 正官: "정관", 偏印: "편인", 正印: "정인" };

function readStem(value: string) { return stem[value] ? `${value}(${stem[value].reading}${elementKorean[stem[value].element]})` : value; }
function readBranch(value: string) { return branch[value] ? `${value}(${branch[value].reading})` : value; }

function tenGod(dayStem: string, compareStem: string) {
  const day = stem[dayStem];
  const compare = stem[compareStem];
  if (!day || !compare) return null;
  const samePolarity = day.yang === compare.yang;
  if (day.element === compare.element) return samePolarity ? "비견" : "겁재";
  if (produces[day.element] === compare.element) return samePolarity ? "식신" : "상관";
  if (controls[day.element] === compare.element) return samePolarity ? "편재" : "정재";
  if (controls[compare.element] === day.element) return samePolarity ? "편관" : "정관";
  if (produces[compare.element] === day.element) return samePolarity ? "편인" : "정인";
  return null;
}

function findActiveDaYun(myeongsik: Myeongsik) {
  return myeongsik.fortune.daYun.find((period) => period.startYear <= myeongsik.fortune.targetYear && myeongsik.fortune.targetYear <= period.endYear);
}

/**
 * Service-owned analysis outline. It deliberately uses traceable traditional terms
 * and turns them into bounded editorial directions before any LLM sees the data.
 */
export function deriveSajuInterpretationBlueprint(myeongsik: Myeongsik): SajuInterpretationBlueprint {
  const cards: SajuBlueprintCard[] = [];
  const dayStem = myeongsik.dayMaster;
  const day = stem[dayStem];
  const monthBranch = myeongsik.pillars.month.earthlyBranch;
  const month = branch[monthBranch];
  if (!day || !month) return { cards };

  const seasonalRelation = controls[month.element] === day.element ? "극" : produces[month.element] === day.element ? "생" : month.element === day.element ? "같은 오행" : "다른 오행";
  cards.push({
    id: "seasonal-frame",
    title: `월령: ${readBranch(monthBranch)}의 ${elementKorean[month.element]} 기운`,
    evidence: [`월지 ${readBranch(monthBranch)}`, `일간 ${readStem(dayStem)}`, `월지 ${elementKorean[month.element]} → 일간 ${elementKorean[day.element]}: ${seasonalRelation} 관계`],
    interpretation: `사주는 태어난 달의 지지인 월령을 먼저 본다. 이 명식은 ${monthBranch}월의 ${elementKorean[month.element]} 기운 위에 ${readStem(dayStem)} 일간이 놓여 있으며, 월령과 일간은 ${seasonalRelation} 관계다.`,
    writingDirection: seasonalRelation === "극" ? "이 명식의 출발점을 ‘내 기준을 지키려는 힘과 바깥의 기준이 만나는 자리’로 풀어낸다. 타고난 성격을 단정하지 말고, 기준을 세우고 조율하는 장면으로만 구체화한다." : "월령과 일간의 관계를 일상에서 힘을 쓰는 방식의 비유로만 풀어낸다.",
  });

  const supportPillars = pillarOrder.filter((name) => {
    const pillar = myeongsik.pillars[name];
    return stem[pillar.heavenlyStem]?.element === day.element || produces[stem[pillar.heavenlyStem]?.element as Element] === day.element || branch[pillar.earthlyBranch]?.element === day.element || produces[branch[pillar.earthlyBranch]?.element as Element] === day.element;
  });
  cards.push({
    id: "supporting-letters",
    title: "일간을 돕는 금·토 글자",
    evidence: supportPillars.map((name) => `${pillarLabels[name]} ${myeongsik.pillars[name].ganZhi}`),
    interpretation: `원국에는 일간과 같은 금, 또는 금을 생하는 토가 ${supportPillars.map((name) => `${pillarLabels[name]}의 ${myeongsik.pillars[name].ganZhi}`).join(" · ")}에 보인다. 월령만으로 단정하지 않고, 이런 보조 글자도 함께 본다.`,
    writingDirection: "‘한쪽으로 몰아붙이기보다 이미 가진 기준과 준비를 다시 꺼내 쓰는 방식’으로 풀어낸다. 강하다·약하다·균형이라는 판정은 하지 않는다.",
  });

  const tenGods = new Map<string, string[]>();
  for (const name of pillarOrder) {
    const pillar = myeongsik.pillars[name];
    const visible = tenGodKorean[pillar.stemTenGod] ?? tenGod(dayStem, pillar.heavenlyStem);
    if (visible && visible !== "일간") tenGods.set(visible, [...(tenGods.get(visible) ?? []), `${pillarLabels[name]} 천간 ${pillar.heavenlyStem}`]);
    pillar.hiddenStems.forEach((hidden) => {
      const god = tenGod(dayStem, hidden);
      if (god) tenGods.set(god, [...(tenGods.get(god) ?? []), `${pillarLabels[name]} 지장간 ${hidden}`]);
    });
  }
  const structuralGods = ["정인", "정관", "정재", "상관"].filter((god) => tenGods.has(god));
  cards.push({
    id: "ten-god-structure",
    title: `원국의 핵심 십신: ${structuralGods.join(" · ")}`,
    evidence: structuralGods.flatMap((god) => (tenGods.get(god) ?? []).map((source) => `${god} · ${source}`)),
    interpretation: "십신은 일간을 기준으로 다른 글자가 어떤 역할을 하는지 나타내는 표기다. 이 명식에는 정인·정관·정재·상관이 함께 드러난다.",
    writingDirection: "정인은 배우고 정리하는 기반, 정관은 기준과 책임, 정재는 일상의 자원과 계획, 상관은 표현과 결과물이라는 뜻을 처음 한 번씩 쉽게 풀어낸다. 네 요소를 한 가지 성격 진단으로 뭉개지 말고 ‘준비→표현→기준→관리’의 흐름으로 서술한다.",
  });

  const targetYear = myeongsik.fortune.targetYear;
  const yearly = myeongsik.fortune.yearly.find((item) => item.year === targetYear);
  if (yearly) {
    const [yearStem, yearBranch] = [...yearly.ganZhi];
    const yearGod = tenGod(dayStem, yearStem);
    cards.push({
      id: "yearly-overlay",
      title: `${targetYear}년 ${yearly.ganZhi} 세운의 ${yearGod ?? "관계 미확인"}`,
      evidence: [`세운 ${yearly.ganZhi}(${stem[yearStem]?.reading ?? ""}${branch[yearBranch]?.reading ?? ""})`, `세운 천간 ${readStem(yearStem)}`, `일간 기준 십신 ${yearGod ?? "미확인"}`, `${elementKorean[stem[yearStem]?.element ?? day.element]}극${elementKorean[day.element]} 관계`],
      interpretation: `${targetYear}년 세운은 ${yearly.ganZhi}이고, 천간 ${yearStem}은 일간 ${dayStem} 기준 ${yearGod}이다. 세운 천간의 ${elementKorean[stem[yearStem]?.element ?? day.element]}와 일간의 ${elementKorean[day.element]}은 오행에서 ${elementKorean[stem[yearStem]?.element ?? day.element]}극${elementKorean[day.element]} 관계다.`,
      writingDirection: yearGod === "정관" ? "2026년의 핵심 문장을 ‘기준을 높이고 결과물을 제출하는 해’로 둔다. 취업·승진·합격은 예측하지 말고, 피드백·마감·공식적인 약속을 정리하는 실제 행동으로 풀어낸다." : "세운의 십신과 오행 관계를 제공된 뜻 안에서만 풀어낸다.",
    });
  }

  const daYun = findActiveDaYun(myeongsik);
  if (daYun) {
    const daYunStem = [...daYun.ganZhi][0];
    const daYunGod = tenGod(dayStem, daYunStem);
    cards.push({
      id: "da-yun-frame",
      title: `현재 ${daYun.ganZhi} 대운의 ${daYunGod ?? "관계 미확인"}`,
      evidence: [`${daYun.startYear}–${daYun.endYear} 대운 ${daYun.ganZhi}`, `대운 천간 ${readStem(daYunStem)}`, `일간 기준 십신 ${daYunGod ?? "미확인"}`],
      interpretation: `${targetYear}년은 ${daYun.ganZhi} 대운 구간이며, 천간 ${daYunStem}은 일간 기준 ${daYunGod}이다.`,
      writingDirection: daYunGod === "정재" ? "10년의 바탕은 ‘생활 자원과 우선순위를 계획으로 바꾸는 흐름’으로만 풀어낸다. 자산 증가를 단정하지 말고, 예산·일정·반복 가능한 루틴이라는 장면을 쓴다." : "대운을 10년의 배경으로만 사용한다.",
    });
  }

  const monthly = myeongsik.fortune.monthly.filter((item) => [3, 4, 9, 10].includes(item.ordinal));
  const natalBranches = pillarOrder.map((name) => ({ name, branch: myeongsik.pillars[name].earthlyBranch }));
  const clashes: Array<{ ordinal: number; ganZhi: string; against: string }> = [];
  const clashSet = new Set(["子午", "午子", "丑未", "未丑", "寅申", "申寅", "卯酉", "酉卯", "辰戌", "戌辰", "巳亥", "亥巳"]);
  for (const monthFortune of monthly) for (const natal of natalBranches) if (clashSet.has(`${[...monthFortune.ganZhi][1]}${natal.branch}`)) clashes.push({ ordinal: monthFortune.ordinal, ganZhi: monthFortune.ganZhi, against: `${pillarLabels[natal.name]} ${natal.branch}` });
  if (clashes.length) cards.push({
    id: "monthly-checkpoints",
    title: "2026년 점검이 필요한 월운",
    evidence: clashes.map((item) => `${item.ordinal}월 ${item.ganZhi} ↔ ${item.against} 충`),
    interpretation: `월운에서는 ${clashes.map((item) => `${item.ordinal}월 ${item.ganZhi}`).join(" · ")}에 원국 지지와 충이 보인다. 충은 해당 달의 기존 리듬을 확인하고 조정하는 관계로만 사용한다.`,
    writingDirection: "3·4·10월은 일정과 대화, 진행 중인 일을 재점검하는 달로 제안한다. 사건·이별·사고를 예고하지 않는다. 9월의 같은 지지 겹침은 이미 해오던 일을 다시 정리하는 장면으로 쓴다.",
  });

  return { cards };
}
