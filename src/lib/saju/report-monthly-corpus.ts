/**
 * 다봄 자체 작성 월운 해석. 완성 예문·현대 번역문은 수집하지 않는다.
 * 십신의 생극·음양 정의: 萬民英《三命通會》卷五「論古人立印食官財名義」
 * https://zh.wikisource.org/wiki/三命通會/卷五 (public-domain 한문 원문)
 * 육합·육충 관계: 같은 책 卷二「論支元六合」「論沖擊」
 * https://zh.wikisource.org/wiki/三命通會/卷二 (public-domain 한문 원문)
 * 아래 생활상의 구분은 다봄의 현대적 해설이다. 고전의 사건 예언이나
 * 직접 번역이 아니며, 십신·합충 두 사실로 합화/격국/길흉을 판정하지 않는다.
 */
import type { CorpusFragment } from "./interpretation-corpus";
import { BRANCH_RELATION_MEANINGS } from "./report-detail-corpus";
import type { MonthlyRelationMonth, ReportFacts } from "./report-facts";
import { getTenGodPlainMeaning } from "./report-terminology";
import { monthlyTopicMeaning } from "./report-fortune-reading";
import type { TimingDomain } from "./report-topic-timing";

export function buildMonthlyReportEvidence(facts: ReportFacts, version: string, domain: TimingDomain = "relation", months: MonthlyRelationMonth[] = facts.monthlyRelationMonths): CorpusFragment[] {
  return months.flatMap((month): CorpusFragment[] => {
    const kinds = [...new Set(month.relations.map(relation => relation.relation))].filter(kind => kind !== "overlap");
    const entries = kinds.length ? kinds : ["none" as const];
    return entries.map(kind => {
      const source = kind === "none" ? null : BRANCH_RELATION_MEANINGS[kind];
      const term = kind === "clash" ? "충" : "합";
      const meaning = monthlyTopicMeaning(month.stemTenGod, domain);
      return {
        id: `F-TIMING-${month.ordinal}-${kind === "none" ? "ten-god" : kind}`, status: "approved", version,
        domains: [domain], direction: "mixed", strength: 4, conditions: [],
        grounds: [...(kind === "none" ? [] : [`monthly-${month.ordinal}-${kind}`]), `monthly-${month.ordinal}-ten-god`],
        mechanism: `${month.displayLabel} 월간의 ${month.stemTenGod}: ${getTenGodPlainMeaning(month.stemTenGod)}${source ? ` 같은 기간 ${term}: ${source.mechanism}` : ""}`,
        translation: meaning, concreteScene: "", sceneAnchors: [],
        expansion: { mechanismSteps: [meaning, ...(source ? [source.translation] : [])], sceneVariants: [], decisionRule: `${meaning} 이 차이에 직접 이어지는 조언이 필요할 때만 한 문장으로 덧붙인다.`, repetitionGuard: "이 기간은 배정된 주제에서만 쓴다. 다른 주제의 날짜와 바꾸어 붙이지 않는다." },
        guidance: `${month.displayLabel}의 계산 근거만 사용한다. ${domain === "yearly" ? "일·역할·표현" : domain === "career" ? "돈·대가·비용" : "가까운 관계·마음을 전하는 방식"}에 연결한다. 해당 주제에 배정된 것은 편집 선택이며 다른 분야의 운이 없다는 뜻이 아니다. 합·충은 같은 월의 십신과 함께 읽고 없는 관계는 언급하지 않는다. 합을 성사, 충을 실패로 확정하거나 실제 사건·관계 상태를 만들지 않는다. 과거·현재·미래는 phase를 따른다.`,
      } satisfies CorpusFragment;
    });
  });
}
