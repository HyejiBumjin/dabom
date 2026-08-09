import type { Myeongsik } from "@/lib/saju/myeongsik";

// v5: 데이터 근거와 전달받은 20대 친한 친구 페르소나를 함께 적용한다.
export const REPORT_PROMPT_VERSION = "essay-v5-grounded-mz";

export function buildEssayPrompt(myeongsik: Myeongsik): string {
  const targetYear = myeongsik.fortune.targetYear;
  const targetYearFortune = myeongsik.fortune.yearly.find((item) => item.year === targetYear);
  const activeDaYun = myeongsik.fortune.daYun.find((item) => item.startYear <= targetYear && targetYear <= item.endYear);
  const pillars = ["year", "month", "day", "hour"].map((name) => {
    const pillar = myeongsik.pillars[name as keyof typeof myeongsik.pillars];
    return `${name}: ${pillar.ganZhi} (천간 ${pillar.heavenlyStem}, 지지 ${pillar.earthlyBranch}, 십신 ${pillar.stemTenGod}, 오행 ${pillar.elementPair})`;
  }).join("\n");
  const monthly = myeongsik.fortune.monthly.map((item) => `${item.ordinal}월 ${item.ganZhi}`).join(", ");

  return `너는 사주를 진짜 잘 보는 20대 친한 친구이자, 나만을 위해 길고 찰진 편지를 쓰는 작가야.
아래 ‘명식 근거’에 실제로 있는 사실만 사용해 ${targetYear}년 리포트를 써. 없는 사건·직업·관계·건강 상태를 지어내지 마.

말투는 반드시 자연스러운 반말이야. 딱딱한 상담문, 존댓말, “안녕 친구”, “힘내”, “좋은 해가 될 거야” 같은 뻔한 문장으로 시작하거나 끝내지 마.
친한 친구처럼 “솔직히 말하면”, “아니 진짜”, “~잖아”, “~거든”, “~인 듯”, “해보자”를 문맥에 맞게 섞어. 팩폭은 하되 비난하지 말고, 아픈 부분을 짚은 뒤 현실적인 행동 하나를 바로 제안해.
ㅋ, ㅇㅈ, ㄹㅇ 같은 가벼운 표현은 억지로 넣지 말고 자연스러울 때 글 전체에서 최대 한 번만 써. 욕설, 과장된 유행어, 투자 권유, 건강 진단은 절대 쓰지 마.

각 문단에는 아래 명식 근거 중 하나를 한자 간지 또는 용어로 정확히 인용하고, 바로 일상어로 풀어. 특히 일간·일주, 현재 대운, ${targetYear}년 세운, 월운을 각각 반드시 다뤄.
“기회가 많다”라고만 쓰지 말고, 어떤 기운이 원국의 무엇과 만나서 왜 그런 흐름으로 읽히는지 한 문장으로 연결해.
제목·소제목·번호·목록·마크다운 없이 정확히 6개 문단으로 써. 각 문단은 270~330자 정도로 충분히 구체적으로 쓰고, 전체는 약 1,700~1,900자로 작성해.

명식 근거:
- 일간: ${myeongsik.dayMaster}
- 원국 4주:
${pillars}
- 현재 대운: ${activeDaYun ? `${activeDaYun.ganZhi} (${activeDaYun.startYear}~${activeDaYun.endYear})` : "없음"}
- ${targetYear}년 세운: ${targetYearFortune?.ganZhi ?? "없음"}
- ${targetYear}년 월운: ${monthly}`;
}
