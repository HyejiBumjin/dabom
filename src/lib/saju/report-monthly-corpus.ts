/**
 * 다봄 자체 작성 월운 해석. 완성 예문·현대 번역문은 수집하지 않는다.
 * 십신의 생극·음양 정의: 萬民英《三命通會》卷五「論古人立印食官財名義」
 * https://zh.wikisource.org/wiki/三命通會/卷五 (public-domain 한문 원문)
 * 육합·육충 관계: 같은 책 卷二「論支元六合」「論沖擊」
 * https://zh.wikisource.org/wiki/三命通會/卷二 (public-domain 한문 원문)
 * 아래 생활상의 구분은 다봄의 현대적 해설이다. 고전의 사건 예언이나
 * 직접 번역이 아니며, 십신·합충 두 사실로 합화/격국/길흉을 판정하지 않는다.
 */
import type { CorpusFragment } from "@/lib/saju/interpretation-corpus";
import { BRANCH_RELATION_MEANINGS, TEN_GOD_MEANINGS } from "@/lib/saju/report-detail-corpus";
import type { ReportFacts } from "@/lib/saju/report-facts";
import { getTenGodPlainMeaning } from "@/lib/saju/report-terminology";

// Each entry identifies a different choice, not a sentence for the model to copy.
const MONTHLY_CHOICES: Record<string, { combination: string; clash: string }> = {
  비견: {
    combination: "내가 원하는 것과 상대가 원하는 것을 함께 놓고, 둘 다 동의하는 부분부터 함께한다. 동등한 참여와 의견의 일치를 구별한다.",
    clash: "의견이 다를 때 상대에게 맞추는 일과 내 선택을 지키는 일을 구별한다. 상대의 선택까지 바꾸려 하지 않고 내가 결정할 일을 말한다.",
  },
  겁재: {
    combination: "함께하는 사람이 늘면 도움도 나눌 몫도 생긴다. 모두 똑같이 참여하는지, 서로 다른 일을 맡는지에 따라 나누는 방법을 정한다.",
    clash: "함께 쓰려는 것과 각자 필요한 것이 겹칠 때 먼저 차지하는 경쟁보다 각자 꼭 필요한 것을 밝힌다. 친하다는 이유로 몫을 짐작하지 않는다.",
  },
  식신: {
    combination: "사람들과 함께할 때 말로만 설명하기보다 익힌 것을 직접 보여 주어 서로 도울 부분을 찾는다. 각자 잘하는 일을 이어 하나를 완성하는 데 초점을 둔다.",
    clash: "하던 것을 만드는 중에 다른 요구를 만나면 이미 쓸 만한 부분과 새로 만들어야 할 부분을 나눈다. 모두 버리거나 처음부터 다시 시작하는 선택과 구별한다.",
  },
  상관: {
    combination: "함께 방법을 바꾸려면 무엇이 불편한지뿐 아니라 어떻게 바꾸고 싶은지도 전한다. 상대의 의견을 듣는 것과 내 생각을 숨기는 것을 구별한다.",
    clash: "다른 의견을 말할 때 사람을 평가하는 말과 방법의 문제를 짚는 말을 구별한다. 어떤 방법이 왜 불편한지 알려야 바꿀 부분을 찾을 수 있다.",
  },
  정재: {
    combination: "함께 오래 이어 갈 일을 정할 때 한 번 내는 비용과 계속 드는 비용을 구별한다. 서로 무리 없이 계속할 수 있는지를 함께 확인한다.",
    clash: "함께 정한 계획이 바뀌면 이미 필요한 돈과 시간부터 남겨 둔다. 새 선택 때문에 평소 꼭 쓰는 몫까지 줄어드는지 살핀다.",
  },
  편재: {
    combination: "여러 사람을 통해 서로 다른 선택을 접한다면 전부 한꺼번에 잡지 않고 작게 시도해 볼 연결을 고른다. 사람을 아는 것과 실제로 함께할 수 있는 것을 구별한다.",
    clash: "여러 제안의 방향이 다르면 오간 비용과 시간을 각각 비교한다. 아까워서 새 일을 계속 더하는 선택보다 지금 이어 갈 것을 고르는 데 초점을 둔다.",
  },
  정관: {
    combination: "함께 지킬 약속을 정할 때 서로 같은 뜻으로 이해했는지 확인한다. 말을 했다는 사실과 상대가 같은 내용으로 받아들였다는 것은 구별한다.",
    clash: "서로 다른 약속을 동시에 지키기 어렵다면 누가 잘못했는지부터 찾기보다 어느 약속을 먼저 지킬지 합의한다. 한쪽의 기대를 말없이 바꾸지 않는다.",
  },
  편관: {
    combination: "어려운 일을 함께 넘길 때 도움을 구할 일을 분명히 좁힌다. 급한 일을 함께 처리하는 것과 상대에게 모든 판단을 맡기는 것은 구별한다.",
    clash: "급한 요구끼리 부딪히면 말이 강한 사람보다 실제로 먼저 처리해야 할 일이 무엇인지 확인한다. 대답을 서두르는 것과 문제를 해결하는 것을 구별한다.",
  },
  정인: {
    combination: "모르는 것을 다른 사람에게 물을 때 이미 아는 부분과 도움받을 부분을 나누면 답을 쓰기 쉽다. 설명을 듣는 데서 끝내지 않고 이해한 내용을 되짚는 데 초점을 둔다.",
    clash: "서로 다른 설명을 들었을 때 내 경우에도 맞는 말인지 확인한다. 자료를 더 모으기 전에 어느 조건에서 답이 달라졌는지를 찾는다.",
  },
  편인: {
    combination: "나와 다른 방법을 쓰는 사람의 생각을 들으며 내가 놓친 길을 찾는다. 독특하다는 이유로 전부 따라 하기보다 내 상황에 맞는 부분을 골라 쓴다.",
    clash: "익숙한 답과 내 상황이 맞지 않으면 질문이나 접근 순서를 바꾸어 본다. 방법을 바꾸는 일과 사람과의 연결을 끊는 일을 구별한다.",
  },
};

export function buildMonthlyReportEvidence(facts: ReportFacts, version: string): CorpusFragment[] {
  return facts.monthlyRelationMonths.flatMap(month => {
    const kinds = [...new Set(month.relations.map(relation => relation.relation))].filter(kind => kind !== "overlap");
    return kinds.map(kind => {
      const term = kind === "clash" ? "충" : "합";
      const source = BRANCH_RELATION_MEANINGS[kind];
      const god = TEN_GOD_MEANINGS[month.stemTenGod];
      const decision = MONTHLY_CHOICES[month.stemTenGod]?.[kind];
      if (!god || !decision) throw new Error("승인된 월운 십신 해석이 없습니다.");
      return {
        id: `F-TIMING-${month.ordinal}-${kind}`, status: "approved", version,
        domains: ["relation"], direction: "mixed", strength: 4,
        conditions: [], grounds: [`monthly-${month.ordinal}-${kind}`, `monthly-${month.ordinal}-ten-god`],
        mechanism: `${month.displayLabel}에 확인된 ${term} 관계: ${source.mechanism} 같은 기간 월간의 ${month.stemTenGod}는 ${god.relation}다. 이 월운의 뜻은 ${getTenGodPlainMeaning(month.stemTenGod)} 두 사실을 함께 설명하되 지지의 ${term}이 십신을 바꾸는 것은 아니다.`,
        translation: decision, concreteScene: "", sceneAnchors: [],
        expansion: {
          mechanismSteps: [`월간의 ${month.stemTenGod}: ${getTenGodPlainMeaning(month.stemTenGod)}`, `${term}: ${source.translation}`, `이 기간에 구별할 선택: ${decision}`],
          sceneVariants: [], decisionRule: decision,
          repetitionGuard: "다른 달과 합·충이 같더라도 이 달의 십신이 가리키는 선택의 차이를 설명한다. 매번 약속·마감·역할 나누기로 끝내지 않는다. 이미 설명한 합·충의 뜻은 되풀이하지 않는다.",
        },
        guidance: `${month.displayLabel}의 두 근거만 연결한다. 내부 한자·순번·기둥 이름은 쓰지 않는다. 월운의 쉬운 의미를 먼저 말하고 십신 이름은 이해에 필요할 때만 짧게 덧붙인다. 같은 기간 합·충이 모두 있으면 두 조건을 구별한다. 합을 성사, 충을 실패로 해석하거나 실제 과거·미래 사건을 만들지 않는다. 위 문장은 해석 원칙이며 완성 예문으로 복사하지 않는다.`,
      } satisfies CorpusFragment;
    });
  });
}
