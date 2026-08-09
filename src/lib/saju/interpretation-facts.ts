import type { Myeongsik, PillarName } from "@/lib/saju/myeongsik";

type Element = "wood" | "fire" | "earth" | "metal" | "water";

export interface InterpretationFact {
  id: string;
  category: "natal" | "element" | "fortune" | "relation";
  title: string;
  evidence: string[];
  description: string;
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
    });
  }

  const activeDaYun = myeongsik.fortune.daYun.find((period) => period.startYear <= targetYear && targetYear <= period.endYear);
  if (activeDaYun) {
    facts.push({
      id: "active-da-yun",
      category: "fortune",
      title: `현재 대운 ${readGanZhi(activeDaYun.ganZhi)}`,
      evidence: [`대운 ${activeDaYun.ganZhi}`, `${activeDaYun.startYear}–${activeDaYun.endYear}`],
      description: `${targetYear}년은 ${readGanZhi(activeDaYun.ganZhi)} 대운(${activeDaYun.startYear}–${activeDaYun.endYear}) 구간에 있습니다.`,
    });
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
        });
      }
      if (branch === natal.branch) {
        facts.push({
          id: `overlap-${source.label}-${natal.name}`,
          category: "relation",
          title: `${source.label}과 ${pillarLabels[natal.name]}의 ${readBranch(branch)} 겹침`,
          evidence: [`${source.label} ${source.ganZhi}`, `${pillarLabels[natal.name]} 지지 ${natal.branch}`],
          description: `${source.label} 지지와 ${pillarLabels[natal.name]} 지지가 모두 ${branch}로 같습니다. 이 카드는 같은 지지가 겹친다는 계산 결과만 표시합니다.`,
        });
      }
    }
  }

  return { facts };
}
