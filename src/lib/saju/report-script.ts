import type { Myeongsik } from "@/lib/saju/myeongsik";
import { DAY_MASTER_SCRIPT, INTERACTION_SCRIPT, TEN_GOD_GROUP_SCRIPT } from "@/lib/saju/script-database";

type Element = "wood" | "fire" | "earth" | "metal" | "water";

export interface ReportScriptBit {
  bitIndex: 1 | 2 | 3 | 4 | 5 | 6;
  title: string;
  timeScope: string;
  sajuFact: string;
  mechanism: string;
  termTranslationGuide: string;
  factTranslation: string;
  concreteScene: string;
  emotionalDirection: string;
}

export interface ReportScript {
  userName: string;
  targetYear: number;
  bits: ReportScriptBit[];
}

const stem: Record<string, { reading: string; element: Element; yang: boolean }> = {
  甲: { reading: "갑", element: "wood", yang: true }, 乙: { reading: "을", element: "wood", yang: false },
  丙: { reading: "병", element: "fire", yang: true }, 丁: { reading: "정", element: "fire", yang: false },
  戊: { reading: "무", element: "earth", yang: true }, 己: { reading: "기", element: "earth", yang: false },
  庚: { reading: "경", element: "metal", yang: true }, 辛: { reading: "신", element: "metal", yang: false },
  壬: { reading: "임", element: "water", yang: true }, 癸: { reading: "계", element: "water", yang: false },
};
const branchReading: Record<string, string> = { 子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사", 午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해" };
const produces: Record<Element, Element> = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
const controls: Record<Element, Element> = { wood: "earth", fire: "metal", earth: "water", metal: "wood", water: "fire" };
const clashSet = new Set(["子午", "午子", "丑未", "未丑", "寅申", "申寅", "卯酉", "酉卯", "辰戌", "戌辰", "巳亥", "亥巳"]);
const combinationSet = new Set(["子丑", "丑子", "寅亥", "亥寅", "卯戌", "戌卯", "辰酉", "酉辰", "巳申", "申巳", "午未", "未午"]);
const hiddenStemsByBranch: Record<string, string[]> = {
  子: ["癸"], 丑: ["己", "癸", "辛"], 寅: ["甲", "丙", "戊"], 卯: ["乙"], 辰: ["戊", "乙", "癸"], 巳: ["丙", "戊", "庚"],
  午: ["丁", "己"], 未: ["己", "丁", "乙"], 申: ["庚", "壬", "戊"], 酉: ["辛"], 戌: ["戊", "辛", "丁"], 亥: ["壬", "甲"],
};
const elementKorean: Record<Element, string> = { wood: "목", fire: "화", earth: "토", metal: "금", water: "수" };

const temperamentByElement: Record<Element, { translation: string; scene: string }> = {
  metal: {
    translation: "대충 넘기기보다 완성도와 디테일을 먼저 보는 타입. 남들은 충분하다고 해도 너 혼자 한 번 더 확인하고, 결과물이 네 손을 떠난 뒤에도 찜찜한 부분을 곱씹기 쉽다.",
    scene: "카톡 안 읽은 숫자 1이나 앱 알림이 계속 눈에 밟혀서 결국 다 지우고, 이메일 전송 버튼을 누르기 전 문장과 첨부 파일을 여러 번 다시 보는 장면.",
  },
  wood: { translation: "새 방향과 가능성을 보면 가만히 있기보다 먼저 움직이고 싶어 하는 타입. 막힌 판을 그냥 두기보다 다음 선택지를 찾는다.", scene: "머릿속에 아이디어가 생기면 메모장에 계획을 쌓아 두고, 지금 하는 일이 답답하면 다음 스텝을 먼저 검색해 보는 장면." },
  fire: { translation: "반응과 표현이 빠르고, 마음이 움직이면 에너지를 바로 밖으로 쓰고 싶어 하는 타입. 재미와 납득이 있어야 오래 간다.", scene: "회의나 모임에서 분위기가 답답하면 먼저 말을 꺼내고, 하고 싶은 일이 생기면 주변 사람에게 바로 공유해 보는 장면." },
  earth: { translation: "눈앞의 일을 안정적으로 굴리고, 맡은 몫을 끝까지 책임지려는 타입. 급하게 판을 뒤집기보다 쌓아 둔 것을 믿는다.", scene: "할 일을 머릿속에 두기보다 체크리스트로 빼고, 사람들 사이에서 자연스럽게 실무를 정리하는 장면." },
  water: { translation: "흐름과 맥락을 빨리 읽고, 말하지 않은 기류까지 생각하는 타입. 혼자 충분히 생각한 뒤에야 움직이고 싶어 한다.", scene: "단톡방의 짧은 답장 하나도 분위기를 읽어 보고, 누워서도 낮에 했던 말을 다시 돌려보는 장면." },
};

const annualTranslation: Record<string, { translation: string; scene: string }> = {
  정관: { translation: "밖에서 요구하는 책임, 평가 기준, 공식적인 약속이 평소보다 또렷해지는 흐름.", scene: "내 일도 바쁜데 팀장·사수·클라이언트가 ‘이것도 맡아줄 수 있어?’ 하고 역할을 얹는 상황. 겉으론 네 하고 웃지만 속은 바빠지는 장면." },
  편관: { translation: "예상보다 강한 압박이나 까다로운 기준이 들어와, 억지로라도 속도를 올려야 하는 흐름.", scene: "갑자기 일정이 당겨지거나 피드백이 세게 들어와서, 평소보다 빠르게 판단해야 하는 장면." },
  정재: { translation: "일상의 자원과 우선순위를 현실적으로 관리해야 하는 흐름.", scene: "들어오는 돈보다 고정 지출과 일정부터 보게 되고, 이번 달에 남길 결과물을 계산하게 되는 장면." },
  편재: { translation: "예정 밖의 제안과 선택지가 늘어, 들어오는 것과 나가는 것을 같이 봐야 하는 흐름.", scene: "친구 약속, 협업 제안, 사고 싶은 물건이 한꺼번에 생겨서 무엇부터 잡을지 골라야 하는 장면." },
  식신: { translation: "내가 만든 것과 말한 것이 자연스럽게 밖으로 나가는 흐름.", scene: "준비해 둔 자료를 보여 주거나, 취미와 작업물을 누군가에게 공유하게 되는 장면." },
  상관: { translation: "답답한 방식에는 질문이 생기고, 내 방식으로 표현하고 싶어지는 흐름.", scene: "‘왜 꼭 이렇게 해야 하지?’라는 생각이 들어서 문서·발표·콘텐츠를 더 내 스타일로 고치고 싶은 장면." },
  비견: { translation: "내 페이스와 선택을 더 분명히 하고 싶어지는 흐름.", scene: "주변 의견은 많지만 결국 내 기준으로 하나를 고르고 싶어지는 장면." },
  겁재: { translation: "사람들과 속도나 몫을 나누는 과정에서 내 에너지가 새기 쉬운 흐름.", scene: "같이 하자는 일은 많은데 정작 내 할 일이 밀려, 부탁을 어디까지 받을지 선을 그어야 하는 장면." },
  정인: { translation: "배우고 정리한 것을 내 판단의 기반으로 쓰는 흐름.", scene: "새 자료를 찾기보다 이미 모아 둔 메모와 레퍼런스를 다시 펼쳐보는 장면." },
  편인: { translation: "익숙한 답보다 내게 맞는 방식과 휴식 리듬을 찾고 싶은 흐름.", scene: "남들 방식은 따라가기 싫어서 혼자 맞는 도구나 일하는 순서를 새로 바꾸는 장면." },
};

function calculateTenGod(dayStem: string, compareStem: string) {
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

function readGanZhi(ganZhi: string) {
  const [gan, zhi] = [...ganZhi];
  return `${ganZhi}(${stem[gan]?.reading ?? ""}${branchReading[zhi] ?? ""})`;
}

function activeDaYun(myeongsik: Myeongsik) {
  return myeongsik.fortune.daYun.find((period) => period.startYear <= myeongsik.fortune.targetYear && myeongsik.fortune.targetYear <= period.endYear);
}

function findMonthlyInteraction(myeongsik: Myeongsik, relation: Set<string>) {
  const natalBranches = Object.values(myeongsik.pillars).map((pillar) => pillar.earthlyBranch);
  return myeongsik.fortune.monthly
    .filter((item) => [3, 4, 9, 10].includes(item.ordinal))
    .flatMap((item) => {
      const monthBranch = [...item.ganZhi][1];
      const against = natalBranches.find((natalBranch) => relation.has(`${monthBranch}${natalBranch}`));
      return against ? [{ ...item, against }] : [];
    });
}

function careerMechanism(daYunGod: string, hiddenGods: string[], annualGod: string) {
  const hasAsset = daYunGod === "정재" || daYunGod === "편재";
  const hasPeer = hiddenGods.some((god) => god === "비견" || god === "겁재");
  if (hasAsset && hasPeer) return "재성의 실속 감각 위에 비겁의 경쟁·분산 기운이 함께 놓여 있다. 큰 요행이나 사람과 엮인 한 방을 좇으면 자원과 에너지가 새기 쉬워, 손에 남는 결과물을 고르는 쪽이 낫다.";
  if (hasAsset) return "재성이 대운의 앞에 있어, 들어오는 자원보다 무엇을 남기고 어디에 쓸지를 현실적으로 보게 만든다. 한 번의 화제성보다 지속 가능한 결과물에 힘이 실린다.";
  if (hiddenGods.some((god) => god === "정관" || god === "편관")) return "대운의 흐름에 책임과 평가의 기운이 함께 얹혀 있다. 맡은 일의 범위와 결과물이 분명할수록 커리어의 손맛이 난다.";
  return `${daYunGod} 대운의 10년 배경 위에 ${annualGod} 세운이 겹쳐 있다. 올해의 선택을 한 번에 결론내기보다, 이 10년 동안 남길 일의 방식과 결과물로 연결해 본다.`;
}

/** Builds the six detailed beats. GPT receives this result, not raw manseoryeok JSON. */
export function buildReportScript(myeongsik: Myeongsik, userName: string): ReportScript {
  const day = stem[myeongsik.dayMaster];
  const monthPillar = myeongsik.pillars.month;
  const yearly = myeongsik.fortune.yearly.find((item) => item.year === myeongsik.fortune.targetYear);
  const daYun = activeDaYun(myeongsik);
  if (!day || !yearly || !daYun) throw new Error("리포트 대본에 필요한 운세 데이터가 없습니다.");

  const [yearGan] = [...yearly.ganZhi];
  const annualGod = calculateTenGod(myeongsik.dayMaster, yearGan) ?? "정관";
  const annual = annualTranslation[annualGod] ?? annualTranslation.정관;
  const [daYunGan] = [...daYun.ganZhi];
  const daYunBranch = [...daYun.ganZhi][1];
  const daYunGod = calculateTenGod(myeongsik.dayMaster, daYunGan) ?? "정재";
  const daYunTranslation = annualTranslation[daYunGod] ?? annualTranslation.정재;
  const daYunHiddenStems = hiddenStemsByBranch[daYunBranch] ?? [];
  const daYunHiddenGods = daYunHiddenStems.reduce<string[]>((gods, hidden) => {
    const god = calculateTenGod(myeongsik.dayMaster, hidden);
    if (god) gods.push(god);
    return gods;
  }, []);
  const primaryHiddenStem = daYunHiddenStems[0];
  const primaryHiddenGod = primaryHiddenStem ? calculateTenGod(myeongsik.dayMaster, primaryHiddenStem) : null;
  const careerFact = `${daYunGan}${elementKorean[stem[daYunGan]?.element ?? day.element]}(${daYunGod}) + ${daYunBranch}${elementKorean[stem[primaryHiddenStem ?? daYunGan]?.element ?? day.element]}${primaryHiddenStem && primaryHiddenGod ? `(지장간 ${primaryHiddenStem}의 ${primaryHiddenGod})` : ""}`;
  const careerTimeScope = `${daYun.startYear}–${daYun.endYear}년 10년 대운 (${daYun.ganZhi} 대운)`;
  const careerMechanismText = careerMechanism(daYunGod, daYunHiddenGods, annualGod);
  const careerTermGuide = `${daYun.ganZhi} 대운은 ‘${daYunGod}의 방식으로 10년짜리 판을 운영하는 시간’으로 풀고, ${careerFact}의 관계는 ‘큰 한 방보다 알짜배기 실속과 결과물을 챙기는 판’처럼 현실 언어로 설명할 것.`;
  const temperament = temperamentByElement[day.element];
  const dayMasterScript = DAY_MASTER_SCRIPT[myeongsik.dayMaster] ?? {
    mechanism: "일간은 그 사람이 기본적으로 반응하고 힘을 쓰는 방식을 보여준다.",
    translation: temperament.translation,
    concreteScene: temperament.scene,
  };
  const godGroup: Record<string, keyof typeof TEN_GOD_GROUP_SCRIPT> = { 比肩: "비겁", 劫财: "비겁", 食神: "식상", 伤官: "식상", 偏财: "재성", 正财: "재성", 偏官: "관성", 七杀: "관성", 正官: "관성", 偏印: "인성", 正印: "인성" };
  const groupCounts = new Map<keyof typeof TEN_GOD_GROUP_SCRIPT, number>();
  for (const pillar of Object.values(myeongsik.pillars)) {
    const visible = godGroup[pillar.stemTenGod];
    if (visible) groupCounts.set(visible, (groupCounts.get(visible) ?? 0) + 1);
    pillar.hiddenTenGods.forEach((god) => { const group = godGroup[god]; if (group) groupCounts.set(group, (groupCounts.get(group) ?? 0) + 1); });
  }
  const dominantEntry = [...groupCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  // "과다" 대본은 지장간까지 세 번 이상 확인될 때만 사용한다.
  const dominantGroup = dominantEntry && dominantEntry[1] >= 3 ? dominantEntry[0] : null;
  const groupScript = dominantGroup ? TEN_GOD_GROUP_SCRIPT[dominantGroup] : null;
  const yearElement = stem[yearGan]?.element;
  const mentalInteraction = yearElement === "fire" && day.element === "metal"
    ? "화극금"
    : yearElement === "water" && day.element === "fire"
      ? "수극화"
      : null;
  const clashes = findMonthlyInteraction(myeongsik, clashSet);
  const combinations = findMonthlyInteraction(myeongsik, combinationSet);
  const relationshipInteraction = clashes.length ? "충" : combinations.length ? "합" : null;
  const relationshipMonths = relationshipInteraction === "충" ? clashes : combinations;
  const relationshipScript = relationshipInteraction ? INTERACTION_SCRIPT[relationshipInteraction] : null;

  return {
    userName,
    targetYear: myeongsik.fortune.targetYear,
    bits: [
      {
        bitIndex: 1,
        title: "본질과 성향",
        timeScope: "태어난 명식의 기본 성향",
        sajuFact: `${myeongsik.dayMaster}(일간), ${monthPillar.ganZhi}월, 월령 ${monthPillar.earthlyBranch}, 원국의 정인·정관·정재·상관`,
        mechanism: `${dayMasterScript.mechanism} 일간은 나의 기본 반응을, 월령은 그 반응이 가장 자주 쓰이는 계절의 배경을 보여준다. 원국의 십신은 그 성향이 일·관계에서 어떤 역할로 드러나는지 보태는 재료다.`,
        termTranslationGuide: `${myeongsik.dayMaster} 일간은 타고난 반응 방식으로, 월령 ${monthPillar.earthlyBranch}는 그 반응을 둘러싼 계절의 분위기로 쉬운 장면에 번역할 것.`,
        factTranslation: dayMasterScript.translation,
        concreteScene: dayMasterScript.concreteScene,
        emotionalDirection: "첫 문단은 ‘너 이런 타입이지?’ 하는 팩폭으로 시선을 붙잡고, 예민함을 흠으로 몰지 말고 왜 그럴 수 있는지 다정하게 풀어준다.",
      },
      {
        bitIndex: 2,
        title: `${myeongsik.fortune.targetYear}년 환경적 흐름`,
        timeScope: `${myeongsik.fortune.targetYear}년 세운 (${yearly.ganZhi})`,
        sajuFact: `${readGanZhi(yearly.ganZhi)} 세운, 천간 ${yearGan}의 ${annualGod}${mentalInteraction ? `, ${mentalInteraction}` : ""}`,
        mechanism: `${yearGan}의 ${annualGod} 기운이 올해 바깥에서 들어오는 역할·요구·선택의 색을 만든다.${mentalInteraction ? ` 일간과의 오행 관계는 ${mentalInteraction}로 작동해 압박과 자기검열을 키울 수 있다.` : ""}`,
        termTranslationGuide: `${yearly.ganZhi} 세운은 ‘올해 바깥 판의 분위기’, ${annualGod}은 ‘올해 특히 자주 마주치는 역할과 요구’로 풀 것.`,
        factTranslation: `${annual.translation}${groupScript ? ` ${groupScript.translation}` : ""}`,
        concreteScene: `${annual.scene}${groupScript ? ` ${groupScript.concreteScene}` : ""}`,
        emotionalDirection: "바깥 상황을 같이 욕해 주되, 억지로 다 참지 말고 네 몫의 선을 정하라고 말한다. 사건을 예언하지 않는다.",
      },
      {
        bitIndex: 3,
        title: "관계와 대인 리듬",
        timeScope: relationshipInteraction ? `${relationshipMonths.map((item) => `${myeongsik.fortune.targetYear}년 ${item.ordinal}월`).join(" · ")} 월운` : `${myeongsik.fortune.targetYear}년 3·4·9·10월 월운`,
        sajuFact: relationshipInteraction
          ? `2026년 월운 ${relationshipMonths.map((item) => `${item.ordinal}월 ${readGanZhi(item.ganZhi)} ↔ 원국 ${item.against}, ${relationshipInteraction}` ).join(" · ")}`
          : `2026년 월운 ${myeongsik.fortune.monthly.filter((item) => [3, 4, 9, 10].includes(item.ordinal)).map((item) => `${item.ordinal}월 ${readGanZhi(item.ganZhi)}`).join(" · ")}`,
        mechanism: relationshipScript?.mechanism ?? "월운은 한 해의 세부 리듬을 보여준다. 특정 달의 대화와 일정에서 감정 반응이 빨라질 수 있다는 정도로만 사용한다.",
        termTranslationGuide: relationshipInteraction ? `${relationshipInteraction}은 ‘관계가 끝난다’가 아니라 ‘익숙한 리듬이 흔들려 대화와 계획을 다시 보게 되는 달’로 번역할 것.` : "월운은 특정 사건 예고가 아니라, 일정과 관계의 반응 속도가 달라지는 배경으로만 풀 것.",
        factTranslation: relationshipScript?.translation ?? "익숙한 관계나 진행 중인 대화에서, 별일 아닌 말도 평소보다 걸리고 혼자 결론을 빨리 내리고 싶어질 수 있는 흐름.",
        concreteScene: relationshipScript?.concreteScene ?? "별것 아닌 한마디에 단톡방 알림을 꺼 두거나, 답장을 미루면서 마음속으로 혼자 손절 각을 재는 장면.",
        emotionalDirection: "‘네가 유난한 게 아니라 지금은 반응이 예민해질 수 있는 달’이라고 다독인다. 이별·다툼을 단정하지 않고, 바로 보내지 말고 한 박자 두는 실전 팁을 준다.",
      },
      {
        bitIndex: 4,
        title: "큰 틀의 커리어 및 재물운",
        timeScope: careerTimeScope,
        sajuFact: `${careerFact} + ${yearly.ganZhi} 세운의 ${annualGod}`,
        mechanism: careerMechanismText,
        termTranslationGuide: careerTermGuide,
        factTranslation: `10년의 바탕에서는 ${daYunTranslation.translation} 올해는 ${annual.translation}${groupScript ? ` 원국의 ${dominantGroup} 흐름도 ‘${groupScript.translation}’로 읽힌다.` : ""} 대박 한 번보다 눈에 보이는 결과물, 신뢰, 반복 가능한 실력이 더 중요해지는 조합.`,
        concreteScene: "변동 큰 투자로 한 방을 노리다가 자원과 마음이 같이 묶이기 쉬운 흐름. 차라리 확실하게 찍히는 월급, 연봉 협상, 자격증, 포트폴리오처럼 손에 남는 결과물로 실속을 차리는 장면.",
        emotionalDirection: "현실적인 이득을 챙기라고 직설적으로 말한다. 투자 수익이나 합격은 약속하지 않고, ‘뭘 남길지’가 보이는 선택을 추천한다.",
      },
      {
        bitIndex: 5,
        title: "주의할 멘탈 루틴",
        timeScope: `${myeongsik.fortune.targetYear}년 세운과 일간의 만남`,
        sajuFact: `${mentalInteraction ?? `${annualGod} 세운`} + ${myeongsik.dayMaster} 일간`,
        mechanism: mentalInteraction ? `${INTERACTION_SCRIPT[mentalInteraction].mechanism} 세운의 ${yearElement} 기운이 일간의 ${day.element} 기운을 제어하는 관계라, 바깥 압박이 자기검열이나 불안으로 안쪽에 쌓일 수 있다.` : "올해 들어오는 역할과 내 기준이 맞물리면서, 혼자 생각을 오래 끌기 쉬운 흐름이다.",
        termTranslationGuide: mentalInteraction ? `${mentalInteraction}은 건강·사건 예고가 아니라, ‘스스로를 너무 세게 몰아붙이는 밤의 패턴’으로 번역할 것.` : "멘탈 조언은 사주 용어를 바로 일상 장면으로 바꿔 설명할 것.",
        factTranslation: mentalInteraction ? INTERACTION_SCRIPT[mentalInteraction].translation : "바깥 요구와 내 기준 사이에서 혼자 과하게 계산하지 않도록 봐야 하는 흐름.",
        concreteScene: mentalInteraction ? INTERACTION_SCRIPT[mentalInteraction].concreteScene : "남들은 잘했다고 하는데 침대에 누워서 낮에 했던 말이나 보낸 메시지를 다시 떠올리며 이불 킥하는 장면.",
        emotionalDirection: "제발 너 자신에게만 엄격하게 굴지 말라고 진심으로 말한다. 뻔한 힐링 대신, ‘수정은 다음 날 오전에 한 번만’처럼 구체적이고 작은 멈춤 장치를 제안한다.",
      },
      {
        bitIndex: 6,
        title: "총평과 행동 가이드",
        timeScope: `${daYun.ganZhi} 대운 속 ${myeongsik.fortune.targetYear}년`,
        sajuFact: `${daYun.ganZhi} ${daYunGod} 대운 위의 ${yearly.ganZhi} ${annualGod} 세운`,
        mechanism: "10년짜리 대운의 배경 위에 올해 세운이 얹힌다. 올해의 선택은 즉시 결과를 단정하는 대신, 긴 흐름에서 무엇을 남길지로 정리한다.",
        termTranslationGuide: "대운은 긴 판, 세운은 올해의 분위기로 풀고 ‘운명’처럼 결론내리지 말 것.",
        factTranslation: "올해의 핵심은 더 많은 일을 벌이는 게 아니라, 이미 가진 준비를 결과물과 생활의 리듬으로 바꾸는 것.",
        concreteScene: "이번 주 할 일 중 남에게 보여 줄 것 하나, 돈이나 시간을 아낄 것 하나, 미뤄 둔 대화 하나만 골라서 끝내는 장면.",
        emotionalDirection: "쿨하게 응원하며 끝낸다. ‘너는 못하고 있는 게 아니라, 네 기준을 현실에 맞게 다듬는 중’이라는 한 줄을 남기되 운명처럼 단정하지 않는다.",
      },
    ],
  };
}
