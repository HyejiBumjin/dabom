import { stripReportDecorations } from "@/lib/report-emoticons";

/** A conservative editorial signal, not a semantic score or a hard delivery gate. */
export function countAdviceSentences(paragraph: string): number {
  const sentences = stripReportDecorations(paragraph).split(/[.!?。！？\n]+/u).filter(Boolean);
  const instruction = /살펴\s*봐|따져\s*봐|확인해(?:\s|$)|구별해(?:\s|$)|적어\s*(?:봐|둬)|정해\s*(?:봐|둬)|물어\s*봐|찾아\s*봐|나눠\s*봐|(?:해야|하면|해도)\s*(?:해|돼|좋아)(?:\s|$)|(?:하는|두는|보는|듣는|묻는|쓰는|받는|찾는|전하는|정하는|나누는|구별하는|남기는)\s*(?:게|것이|편이)\s*(?:좋아|중요해|필요해|도움이\s*돼|유리해|안전해)/u;
  return sentences.filter(sentence => instruction.test(sentence.trim())).length;
}

export function getAdviceDensityIssues(sectionId: string, paragraph: string): string[] {
  if (!["yearly", "relation", "career", "mental"].includes(sectionId)) return [];
  return countAdviceSentences(paragraph) > 1 ? ["행동 조언이 여러 문장으로 이어집니다. 조언은 메시지 전체에서 최대 한 문장만 남기고, 배정된 계산 근거에서 올해 어떤 흐름을 읽는지 설명하세요. 조언을 평서문으로만 바꾸거나 새로운 사건 예언으로 대체하지 마세요."] : [];
}

/** Editorial signals, never facts or eligibility checks. Bounded style repair applies. */
export function getTopicCoverageIssues(sectionId: string, paragraph: string): string[] {
  if (sectionId !== "career") return [];
  // Do not force every chart into the same compensation/cost/settlement story.
  return /(?:^|\s)일(?=\s|[은을이가과도에의로])|직업|커리어|업무|돈|수입|지출|보상|대가|재물|경제/u.test(paragraph) ? [] : ["일과 돈 주제에서 벗어났습니다. 배정된 관찰에서 이 분야에 해당하는 의미를 풀어 주세요. 정해진 금전 결론을 억지로 만들지 마세요."];
}

export function getClosingTimelineIssues(paragraph: string, yearFinished: boolean): string[] {
  const issues: string[] = [];
  if (!yearFinished && /해였(?:어|지|네)|한\s*해를\s*(?:보냈|마쳤)|올해.{0,30}(?:끝났|지나갔)/u.test(paragraph)) issues.push("아직 진행 중인 한 해를 끝난 해처럼 회고했습니다. 올해의 중심은 현재형으로 요약하고 남은 시간에 대한 인사로 마무리하세요.");
  if (/해낸\s*일.{0,20}쌓였|(?:애썼|힘들었)을\s*때도\s*있었겠|(?:너는|네가|넌).{0,15}(?:버텨\s*왔|이겨\s*냈|많이\s*해냈)/u.test(paragraph)) issues.push("입력에 없는 독자의 실제 노력이나 성과를 확정했습니다. 사주에서 읽은 성향을 응원하되 해낸 일·겪은 일을 지어내지 마세요.");
  return issues;
}

/** Conservative phrase overlap only; this does not pretend to judge semantic truth. */
export function hasNearDuplicateExplanation(left: string, right: string): boolean {
  const sentences = (text: string) => stripReportDecorations(text).split(/[.!?。！？\n]/u)
    .map(sentence => sentence.replace(/\([^)]*\)|[^가-힣]/gu, "")).filter(sentence => sentence.length >= 30);
  const grams = (text: string) => new Set(Array.from({ length: Math.max(0, text.length - 3) }, (_, index) => text.slice(index, index + 4)));
  return sentences(left).some(a => sentences(right).some(b => {
    const one = grams(a), two = grams(b);
    const overlap = [...one].filter(gram => two.has(gram)).length;
    return overlap >= 22 && overlap / Math.max(one.size, two.size) >= 0.78;
  }));
}
