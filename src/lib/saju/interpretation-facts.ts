import type { Myeongsik, PillarName } from "@/lib/saju/myeongsik";

type Element = "wood" | "fire" | "earth" | "metal" | "water";

export interface InterpretationFact {
  id: string;
  category: "natal" | "element" | "fortune" | "relation";
  title: string;
  evidence: string[];
  description: string;
  /** A service-owned editorial lens. The writing model may not invent lenses beyond this. */
  writingGuidance?: string;
}

export interface InterpretationFacts {
  facts: InterpretationFact[];
}

const pillarLabels: Record<PillarName, string> = {
  year: "년주",
  month: "월주",
  day: "일주",
  hour: "시주",
};

const pillarOrder: PillarName[] = ["year", "month", "day", "hour"];

const elementLabels: Record<Element, string> = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};

const stemInfo: Record<string, { reading: string; element: Element }> = {
  "甲": { reading: "갑", element: "wood" },
  "乙": { reading: "을", element: "wood" },
  "丙": { reading: "병", element: "fire" },
  "丁": { reading: "정", element: "fire" },
  "戊": { reading: "무", element: "earth" },
  "己": { reading: "기", element: "earth" },
  "庚": { reading: "경", element: "metal" },
  "辛": { reading: "신", element: "metal" },
  "壬": { reading: "임", element: "water" },
  "癸": { reading: "계", element: "water" },
};

const yangStems = new Set(["甲", "丙", "戊", "庚", "壬"]);

const produces: Record<Element, Element> = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
const controls: Record<Element, Element> = { wood: "earth", fire: "metal", earth: "water", metal: "wood", water: "fire" };

const tenGodLabels: Record<string, string> = {
  "비견": "비견", "겁재": "겁재", "식신": "식신", "상관": "상관", "편재": "편재",
  "정재": "정재", "편관": "편관", "정관": "정관", "편인": "편인", "정인": "정인",
};

const branchInfo: Record<string, { reading: string; element: Element }> = {
  "子": { reading: "자", element: "water" },
  "丑": { reading: "축", element: "earth" },
  "寅": { reading: "인", element: "wood" },
  "卯": { reading: "묘", element: "wood" },
  "辰": { reading: "진", element: "earth" },
  "巳": { reading: "사", element: "fire" },
  "午": { reading: "오", element: "fire" },
  "未": { reading: "미", element: "earth" },
  "申": { reading: "신", element: "metal" },
  "酉": { reading: "유", element: "metal" },
  "戌": { reading: "술", element: "earth" },
  "亥": { reading: "해", element: "water" },
};

const clashPairs = [
  ["子", "午"],
  ["丑", "未"],
  ["寅", "申"],
  ["卯", "酉"],
  ["辰", "戌"],
  ["巳", "亥"],
] as const;

function isClash(left: string, right: string) {
  return clashPairs.some(([first, second]) => (left === first && right === second) || (left === second && right === first));
}

function elementRelation(from: Element, to: Element) {
  if (produces[from] === to) return { name: "상생", rule: `${elementLabels[from]}생${elementLabels[to]}` };
  if (produces[to] === from) return { name: "상생", rule: `${elementLabels[to]}생${elementLabels[from]}` };
  if (controls[from] === to) return { name: "상극", rule: `${elementLabels[from]}극${elementLabels[to]}` };
  if (controls[to] === from) return { name: "상극", rule: `${elementLabels[to]}극${elementLabels[from]}` };
  return null;
}

/** Determines the ten-god name from the day stem and a comparison stem. */
function calculateTenGod(dayStem: string, comparisonStem: string) {
  const day = stemInfo[dayStem];
  const comparison = stemInfo[comparisonStem];
  if (!day || !comparison) return null;
  const samePolarity = yangStems.has(dayStem) === yangStems.has(comparisonStem);

  if (day.element === comparison.element) return samePolarity ? "비견" : "겁재";
  if (produces[day.element] === comparison.element) return samePolarity ? "식신" : "상관";
  if (controls[day.element] === comparison.element) return samePolarity ? "편재" : "정재";
  if (controls[comparison.element] === day.element) return samePolarity ? "편관" : "정관";
  if (produces[comparison.element] === day.element) return samePolarity ? "편인" : "정인";
  return null;
}

function readStem(stem: string) {
  const info = stemInfo[stem];
  return info ? `${stem}(${info.reading}${elementLabels[info.element]})` : stem;
}

function readBranch(branch: string) {
  const info = branchInfo[branch];
  return info ? `${branch}(${info.reading})` : branch;
}

function readGanZhi(ganZhi: string) {
  const [stem, branch] = Array.from(ganZhi);
  return `${ganZhi}(${stemInfo[stem]?.reading ?? ""}${branchInfo[branch]?.reading ?? ""})`;
}

/**
 * Produces only reproducible source facts. It intentionally contains no good/bad
 * judgement or prediction; those are editorial choices for a later writing layer.
 */
export function deriveInterpretationFacts(myeongsik: Myeongsik): InterpretationFacts {
  const facts: InterpretationFact[] = [];
  const dayMaster = myeongsik.dayMaster;
  const dayMasterInfo = stemInfo[dayMaster];

  if (dayMasterInfo) {
    facts.push({
      id: "day-master",
      category: "natal",
      title: `${readStem(dayMaster)} 일간`,
      evidence: [`일간 ${readStem(dayMaster)}`, `일주 ${readGanZhi(myeongsik.pillars.day.ganZhi)}`],
      description: `이 명식의 일간은 ${readStem(dayMaster)}입니다. 이후의 해석 문장은 이 값을 기준으로 작성합니다.`,
      writingGuidance: "일간은 사주에서 나 자신을 보는 기준이라는 뜻까지만 설명한다. 금속의 물성이나 성격을 덧붙이지 않는다.",
    });
  }

  const counts: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  for (const name of pillarOrder) {
    const pillar = myeongsik.pillars[name];
    const stemElement = stemInfo[pillar.heavenlyStem]?.element;
    const branchElement = branchInfo[pillar.earthlyBranch]?.element;
    if (stemElement) counts[stemElement] += 1;
    if (branchElement) counts[branchElement] += 1;
  }
  const distribution = (Object.keys(elementLabels) as Element[])
    .map((element) => `${elementLabels[element]} ${counts[element]}`)
    .join(" · ");
  facts.push({
    id: "natal-element-count",
    category: "element",
    title: "원국 오행의 단순 분포",
    evidence: pillarOrder.map((name) => `${pillarLabels[name]} ${myeongsik.pillars[name].ganZhi}`),
    description: `원국의 천간·지지 8글자를 같은 비중으로 집계하면 ${distribution}입니다. 지장간과 계절의 세기는 이 단순 집계에 포함하지 않습니다.`,
    writingGuidance: "이 카드는 8글자의 단순 개수다. 강함·약함·부족·균형·성격이나 능력으로 해석하지 않는다.",
  });

  const targetYear = myeongsik.fortune.targetYear;
  const yearlyFortune = myeongsik.fortune.yearly.find((item) => item.year === targetYear);
  if (yearlyFortune) {
    const [stem, branch] = Array.from(yearlyFortune.ganZhi);
    const stemElement = stemInfo[stem] ? elementLabels[stemInfo[stem].element] : "확인 불가";
    const branchElement = branchInfo[branch] ? elementLabels[branchInfo[branch].element] : "확인 불가";
    facts.push({
      id: "target-year",
      category: "fortune",
      title: `${targetYear}년 세운 ${readGanZhi(yearlyFortune.ganZhi)}`,
      evidence: [`${targetYear}년 세운 ${yearlyFortune.ganZhi}`, `천간 ${readStem(stem)}`, `지지 ${readBranch(branch)}`],
      description: `${targetYear}년 세운은 ${readGanZhi(yearlyFortune.ganZhi)}입니다. 천간은 ${stemElement}, 지지는 ${branchElement}에 해당합니다.`,
      writingGuidance: "세운은 해당 연도에 들어오는 간지라는 뜻까지만 설명한다. 화 기운만으로 계절·건강·성공 여부를 예측하지 않는다.",
    });

    if (dayMasterInfo && stemInfo[stem]) {
      const relation = elementRelation(stemInfo[stem].element, dayMasterInfo.element);
      if (relation) {
        facts.push({
          id: "yearly-day-master-element-relation",
          category: "fortune",
          title: `${targetYear}년 ${elementLabels[stemInfo[stem].element]}와 일간 ${elementLabels[dayMasterInfo.element]}의 ${relation.rule}`,
          evidence: [`일간 ${readStem(dayMaster)} = ${elementLabels[dayMasterInfo.element]}`, `${targetYear}년 세운 천간 ${readStem(stem)} = ${elementLabels[stemInfo[stem].element]}`, `오행 ${relation.name} 규칙: ${relation.rule}`],
          description: `${targetYear}년 세운 천간의 ${elementLabels[stemInfo[stem].element]}와 일간의 ${elementLabels[dayMasterInfo.element]}은 오행 ${relation.name} 규칙에서 ${relation.rule} 관계입니다.`,
          writingGuidance: relation.rule === "화극금" ? "화극금은 단단한 금속을 다듬는 과정에 비유할 수 있다. 외부 기준·피드백·마감 앞에서 내 기준을 정교하게 만드는 흐름으로만 가능성을 표현하고, 특정 사건이나 결과를 단정하지 않는다." : undefined,
        });
      }

      const tenGod = calculateTenGod(dayMaster, stem);
      if (tenGod) {
        facts.push({
          id: "yearly-stem-ten-god",
          category: "fortune",
          title: `${targetYear}년 세운 천간 ${readStem(stem)}의 ${tenGodLabels[tenGod]}`,
          evidence: [`일간 ${readStem(dayMaster)}`, `${targetYear}년 세운 천간 ${readStem(stem)}`, `십신 계산 결과 ${tenGod}`],
          description: `${targetYear}년 세운 천간 ${stem}은 일간 ${dayMaster}을 기준으로 ${tenGod}에 해당합니다.`,
          writingGuidance: tenGod === "정관" ? "정관은 전통적으로 기준·책임·공식적인 역할을 살피는 십신이다. 승진·합격·직장 변화를 단정하지 말고, 기준을 정하고 결과물을 정리하는 행동 제안으로만 풀어낸다." : undefined,
        });
      }
    }
  }

  const activeDaYun = myeongsik.fortune.daYun.find((period) => period.startYear <= targetYear && targetYear <= period.endYear);
  if (activeDaYun) {
    facts.push({
      id: "active-da-yun",
      category: "fortune",
      title: `현재 대운 ${readGanZhi(activeDaYun.ganZhi)}`,
      evidence: [`대운 ${activeDaYun.ganZhi}`, `${activeDaYun.startYear}–${activeDaYun.endYear}`],
      description: `${targetYear}년은 ${readGanZhi(activeDaYun.ganZhi)} 대운(${activeDaYun.startYear}–${activeDaYun.endYear}) 구간에 있습니다.`,
      writingGuidance: "대운은 10년 단위의 흐름 표기다. 제공된 기간과 간지 외의 변화를 예측하지 않는다.",
    });
    const daYunStem = Array.from(activeDaYun.ganZhi)[0];
    const tenGod = calculateTenGod(dayMaster, daYunStem);
    if (tenGod) {
      facts.push({
        id: "da-yun-stem-ten-god",
        category: "fortune",
        title: `현재 대운 천간 ${readStem(daYunStem)}의 ${tenGodLabels[tenGod]}`,
        evidence: [`일간 ${readStem(dayMaster)}`, `현재 대운 천간 ${readStem(daYunStem)}`, `십신 계산 결과 ${tenGod}`],
        description: `현재 대운 천간 ${daYunStem}은 일간 ${dayMaster}을 기준으로 ${tenGod}에 해당합니다.`,
        writingGuidance: tenGod === "정재" ? "정재는 전통적으로 일상의 자원·계획·관리라는 키워드로 살핀다. 수입이나 재산 증가를 단정하지 말고, 예산·일정·우선순위를 정리하는 행동 제안으로만 풀어낸다." : undefined,
      });
    }
  }

  const natalBranches = pillarOrder.map((name) => ({ name, branch: myeongsik.pillars[name].earthlyBranch }));
  const relationshipSources = [
    ...(yearlyFortune ? [{ label: `${targetYear}년 세운`, ganZhi: yearlyFortune.ganZhi }] : []),
    ...myeongsik.fortune.monthly.map((item) => ({ label: `${item.ordinal}월 월운`, ganZhi: item.ganZhi })),
  ];
  for (const source of relationshipSources) {
    const branch = Array.from(source.ganZhi)[1];
    for (const natal of natalBranches) {
      if (isClash(branch, natal.branch)) {
        facts.push({
          id: `clash-${source.label}-${natal.name}`,
          category: "relation",
          title: `${source.label}의 ${readBranch(branch)}와 ${pillarLabels[natal.name]}의 ${readBranch(natal.branch)} 충`,
          evidence: [`${source.label} ${source.ganZhi}`, `${pillarLabels[natal.name]} 지지 ${natal.branch}`, "지지 충 규칙: 子–午 · 丑–未 · 寅–申 · 卯–酉 · 辰–戌 · 巳–亥"],
          description: `${source.label} 지지 ${branch}와 ${pillarLabels[natal.name]} 지지 ${natal.branch}는 지지 충 규칙에 해당합니다. 이 카드는 관계의 계산 결과만 표시하며, 길흉 판단은 포함하지 않습니다.`,
          writingGuidance: "지지 충은 기존 리듬을 점검하고 조정할 필요가 생기는 때라는 비유로만 풀 수 있다. 이직·이별·사고처럼 특정 사건을 예고하거나 단정하지 않는다.",
        });
      }
      if (branch === natal.branch) {
        facts.push({
          id: `overlap-${source.label}-${natal.name}`,
          category: "relation",
          title: `${source.label}과 ${pillarLabels[natal.name]}의 ${readBranch(branch)} 겹침`,
          evidence: [`${source.label} ${source.ganZhi}`, `${pillarLabels[natal.name]} 지지 ${natal.branch}`],
          description: `${source.label} 지지와 ${pillarLabels[natal.name]} 지지가 모두 ${branch}로 같습니다. 이 카드는 같은 지지가 겹친다는 계산 결과만 표시합니다.`,
          writingGuidance: "같은 지지의 겹침은 이미 신경 쓰던 주제를 다시 살피는 흐름이라는 비유로만 풀 수 있다. 좋은 일이나 나쁜 일을 예고하지 않는다.",
        });
      }
    }
  }

  return { facts };
}
