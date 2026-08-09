import type { Myeongsik } from "@/lib/saju/myeongsik";

// v6: 페르소나는 developer 지시문, 명식은 user 근거 데이터로 분리한다.
export const REPORT_PROMPT_VERSION = "essay-v6-persona-grounded";

const stemKorean: Record<string, string> = { 甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계" };
const branchKorean: Record<string, string> = { 子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사", 午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해" };
const tenGodKorean: Record<string, string> = { 比肩: "비견", 劫财: "겁재", 食神: "식신", 伤官: "상관", 偏财: "편재", 正财: "정재", 偏官: "편관", 七杀: "칠살", 正官: "정관", 偏印: "편인", 正印: "정인", 日主: "일간" };

function readGanZhi(value: string): string {
  return [...value].map((char) => stemKorean[char] ?? branchKorean[char] ?? char).join("");
}

function translateTenGod(value: string): string {
  return tenGodKorean[value] ?? value;
}

export const REPORT_DEVELOPER_INSTRUCTIONS = `너는 사주를 진짜 잘 보는 20대 친한 친구이자, 사용자를 위해 한 편의 길고 찰진 편지를 쓰는 작가다.
반드시 자연스러운 반말로 쓴다. 상담사·선생님·자기계발서처럼 딱딱한 말투, 존댓말, “안녕 친구”, “힘내”, “좋은 해가 될 거야” 같은 공허한 문장으로 시작하거나 끝내지 않는다.

말투 예시: “솔직히 말하면 너 여기서 좀 무리하는 편이잖아. 근데 그게 네 장점이기도 해서, 이번엔 힘을 다 쓰기보다 이걸 먼저 정리해보자.”
이 예시의 리듬만 참고하고, 예시의 사실이나 표현을 그대로 반복하지 않는다. “솔직히 말하면”, “아니 진짜”, “~잖아”, “~거든”, “~인 듯”, “해보자” 같은 표현은 자연스러울 때만 쓴다. ㅋ·ㅇㅈ·ㄹㅇ은 글 전체에서 많아야 한 번이다.

사용자가 준 명식 근거만 사실로 취급한다. 각 문단은 근거에 있는 간지나 용어를 최소 하나 인용한 뒤 일상어로 풀고, 그에 따른 현실적인 행동 제안을 하나 붙인다.
한자는 반드시 처음 한 번 한국어 독음과 함께 쓴다. 예: “辛亥(신해) 일주”, “丙午(병오) 세운”. “辛인 너”처럼 한자만 주어로 쓰지 않는다.
건강 상태·질병·법률 결과·투자 수익을 단정하지 않는다. 욕설, 억지 유행어, 근거 없는 성격 단정도 쓰지 않는다.
제목·소제목·번호·목록·마크다운 없이 정확히 6개 문단으로 쓴다. 각 문단은 270~330자, 전체 약 1,700~1,900자를 목표로 한다.`;

export function buildReportEvidencePrompt(myeongsik: Myeongsik): string {
  const targetYear = myeongsik.fortune.targetYear;
  const targetYearFortune = myeongsik.fortune.yearly.find((item) => item.year === targetYear);
  const activeDaYun = myeongsik.fortune.daYun.find((item) => item.startYear <= targetYear && targetYear <= item.endYear);
  const pillars = ["year", "month", "day", "hour"].map((name) => {
    const pillar = myeongsik.pillars[name as keyof typeof myeongsik.pillars];
    return `- ${name}주: ${pillar.ganZhi}(${readGanZhi(pillar.ganZhi)}), 천간 십신 ${translateTenGod(pillar.stemTenGod)}, 오행 ${pillar.elementPair}, 지장간 ${pillar.hiddenStems.join("·")}`;
  }).join("\n");
  const monthly = myeongsik.fortune.monthly.map((item) => `${item.ordinal}월 ${item.ganZhi}(${readGanZhi(item.ganZhi)})`).join(", ");

  return `${targetYear}년 리포트를 작성해. 아래 명식 근거에 없는 사실을 추가하지 마.

명식 근거:
- 일간: ${myeongsik.dayMaster}(${stemKorean[myeongsik.dayMaster] ?? myeongsik.dayMaster})
${pillars}
- 현재 대운: ${activeDaYun ? `${activeDaYun.ganZhi}(${readGanZhi(activeDaYun.ganZhi)}) · ${activeDaYun.startYear}~${activeDaYun.endYear}` : "없음"}
- ${targetYear}년 세운: ${targetYearFortune ? `${targetYearFortune.ganZhi}(${readGanZhi(targetYearFortune.ganZhi)})` : "없음"}
- ${targetYear}년 월운: ${monthly}`;
}
