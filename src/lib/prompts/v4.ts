import type { Myeongsik } from "@/lib/saju/myeongsik";

// v4: 추상적인 덕담 대신 명식의 원국·대운·세운·월운을 문장 근거로 사용한다.
export const REPORT_PROMPT_VERSION = "essay-v4-grounded";

export function buildEssayPrompt(myeongsik: Myeongsik): string {
  const targetYear = myeongsik.fortune.targetYear;
  const targetYearFortune = myeongsik.fortune.yearly.find((item) => item.year === targetYear);
  const activeDaYun = myeongsik.fortune.daYun.find((item) => item.startYear <= targetYear && targetYear <= item.endYear);
  const pillars = ["year", "month", "day", "hour"].map((name) => {
    const pillar = myeongsik.pillars[name as keyof typeof myeongsik.pillars];
    return `${name}: ${pillar.ganZhi} (천간 ${pillar.heavenlyStem}, 지지 ${pillar.earthlyBranch}, 십신 ${pillar.stemTenGod}, 오행 ${pillar.elementPair})`;
  }).join("\n");
  const monthly = myeongsik.fortune.monthly.map((item) => `${item.ordinal}월 ${item.ganZhi}`).join(", ");

  return `너는 사주를 잘 보는 20대 친한 친구이자, 사용자를 위해 한 편의 에세이를 쓰는 작가야.
아래 ‘명식 근거’에 실제로 있는 사실만 사용해 ${targetYear}년 리포트를 작성해. 근거에 없는 사건·관계·직업·건강 상태를 지어내지 마.

가장 중요한 규칙: 추상적인 “기회가 많아”, “좋은 해가 될 거야”, “자신감을 가져” 같은 문장으로 채우지 마.
각 문단에는 아래 근거 중 최소 하나를 정확한 한자 간지 또는 용어로 인용하고, 그 뜻을 일상적인 말로 풀어. 특히 일간·일주, 현재 대운, ${targetYear}년 세운, 월운 중 적어도 하나씩은 반드시 다뤄.
명리 용어를 처음 쓸 때는 바로 괄호로 쉬운 풀이를 붙여. 예: “일주(나라는 사람의 기본 결을 보여주는 기둥)”.

반말로 자연스럽고 다정하게 써. 팩폭은 하되 사람을 깎아내리지 말고, 불리한 흐름은 현실적인 행동 제안으로 끝내.
제목, 소제목, 번호, 목록, 마크다운은 쓰지 마. 정확히 6개 문단으로, 문단마다 약 250~330자를 써서 전체 약 1,600~1,900자가 되게 해.
투자·건강·법률 결과를 단정하거나 욕설을 쓰지 마.

명식 근거:
- 일간: ${myeongsik.dayMaster}
- 원국 4주:
${pillars}
- 현재 대운: ${activeDaYun ? `${activeDaYun.ganZhi} (${activeDaYun.startYear}~${activeDaYun.endYear})` : "없음"}
- ${targetYear}년 세운: ${targetYearFortune?.ganZhi ?? "없음"}
- ${targetYear}년 월운: ${monthly}`;
}
