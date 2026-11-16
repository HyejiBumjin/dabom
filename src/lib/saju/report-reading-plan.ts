import type { ReportObservation, ReportSection } from "./report-payload";
import type { ReportDomain } from "./report-facts";
import type { StemLink } from "./myeongri-synthesis";

export const READING_PLAN_VERSION = "connections-v1";

/** Editorial priorities, not luck scores. No prepared report sentences. */
export interface ReportReadingPlan {
  basis_ids: string[];
  supporting_ids: string[];
  connections: Array<{ evidence_ids: string[]; operation: string; facts: object; question: string }>;
  boundary: string;
}

export function hasReadingMaterial(observation: ReportObservation): boolean {
  const value = observation.value as Record<string, unknown>;
  if (["roots", "exposures", "visible-stems"].includes(observation.kind)) return Array.isArray(value.entries) && value.entries.length > 0;
  if (observation.kind === "exact-stem-occurrences") return [value.visibleAt, value.hiddenAt].some(items => Array.isArray(items) && items.length > 0);
  if (observation.kind === "seasonal-indicators-only") return value.seasonalDirection !== "undetermined";
  return true;
}

function priority(observation: ReportObservation, domain: ReportDomain): number {
  const value = observation.value as Record<string, unknown>;
  if (observation.kind === "period") return 0; // A date supplies timing, never the entire interpretation.
  if (observation.kind === "life-stage") return 5;
  if (observation.kind === "branch-relation") {
    const kind = value.kind;
    // Prefer an observed encounter involving this year over a background label.
    const relation = kind === "clash" ? 35 : kind === "trine" || kind === "seasonal-union" ? 30 : kind === "combination" ? 25 : 10;
    return relation + (observation.scope === "annual" ? 55 : observation.scope === "monthly" ? 40 : 20);
  }
  if (domain === "yearly") {
    if (observation.kind === "exact-stem-occurrences") return 85;
    if (observation.kind === "season") return 75;
    if (observation.kind === "seasonal-indicators-only") return 70;
    if (observation.kind === "stem-link") return (value as unknown as StemLink).to === "day" ? 65 : 55;
  }
  if (domain === "career") {
    if (observation.id === "active-da-yun") return 100;
    if (observation.kind === "stem-link") return 95;
    if (observation.kind === "exposures") return 80;
    if (observation.kind === "pattern-candidate") return 70;
  }
  if (domain === "relation") {
    if (observation.kind === "day-hidden-main") return 75;
    if (observation.kind === "shinsal") return observation.scope === "annual" || observation.scope === "monthly" ? 80 : 45;
  }
  if (domain === "mental") {
    if (observation.kind === "month-ten-gods") return 100;
    if (observation.kind === "roots") return 95;
    if (observation.kind === "shinsal") return 70;
  }
  if (observation.kind === "day-master") return 100;
  if (observation.kind === "visible-stems") return 65;
  return 20;
}

function describeConnection(observation: ReportObservation): ReportReadingPlan["connections"][number] {
  // Values live once in observations; only directional links need an expanded view.
  const base = { evidence_ids: [observation.id], facts: { scope: observation.scope } };
  switch (observation.kind) {
    case "stem-link": {
      const link = observation.value as StemLink;
      // Spell out the arrow: 'produced-by' is easy to accidentally reverse in prose.
      const forward = link.relation === "produces" || link.relation === "controls";
      const source = forward ? link.from : link.to, target = forward ? link.to : link.from;
      return { ...base, operation: "directional-element-link", facts: {
        relation: link.relation,
        ...(link.relation === "same" ? { peers: [link.from, link.to] } : {
          source, target, action: ["produces", "produced-by"].includes(link.relation) ? "생" : "극",
        }),
        combination: link.combination,
      }, question: "두 쪽의 십신이 맡는 의미를 연결하면 무엇이 무엇에 쓰이거나 조절되는가? 생=이익·극=손해로 바꾸지 않는다." };
    }
    case "branch-relation":
      return { ...base, operation: "scoped-encounter", question: "실제 참여 위치와 시간 범위를 따라 어떤 관계가 만나는가? 합·충 등의 뜻을 한 가지 생활 장면까지 연결하되 특정 사건·성패를 확정하지 않는다." };
    case "season":
      return { ...base, operation: "season-and-annual-role", question: "이 계절에서 일간이 놓인 상태와 올해 십신의 작용은 어떻게 함께 읽히는가? 계절의 더움·차가움을 성격이나 건강으로 바꾸지 않는다." };
    case "exact-stem-occurrences":
      return { ...base, operation: "recurrence", question: "같은 천간이 이미 드러난 곳과 안에 있던 곳을 구분하면 올해 어떤 기존 주제가 다시 강조되는가? 같은 일이 재발했다고 단정하지 않는다." };
    case "roots":
      return { ...base, operation: "root-support", question: "본기·부기와 충 여부를 구분하면 자기 힘의 기반을 어디서 읽는가? 뿌리 개수를 성격·건강 점수로 바꾸지 않는다." };
    case "month-ten-gods":
      return { ...base, operation: "visible-and-hidden-roles", question: "드러난 십신과 월지 본기의 십신은 같은 방향인가, 다른 역할인가? 관심을 쓰는 방식의 차이를 설명하고 감정을 진단하지 않는다." };
    case "day-hidden-main":
      return { ...base, operation: "close-relationship-background", question: "일지 본기의 십신을 가까운 사이에서 주고받는 방식의 배경으로 읽으면, 배정된 올해·월운 근거와 어떤 차이가 생기는가? 연애 여부·배우자의 실제 성격을 정하지 않는다." };
    case "shinsal":
      return { ...base, operation: "secondary-symbol", question: "주된 근거를 이 보조 지표가 어느 범위에서 보충하는가? 신살 하나로 만남·이동·성공을 예언하지 않는다." };
    default:
      return { ...base, operation: observation.kind, question: "이 근거의 실제 값과 시간 범위를 다른 선택 근거에 연결했을 때 이 주제에서 달라지는 점은 무엇인가? 용어 뜻의 나열로 끝내지 않는다." };
  }
}

export function buildReadingPlan(section: Pick<ReportSection, "id" | "primary_evidence_ids" | "context_evidence_ids">, observations: ReportObservation[]): ReportReadingPlan {
  if (section.id === "summary") return { basis_ids: [], supporting_ids: [], connections: [], boundary: "본문에서 확인한 중심만 요약. 새 근거·해석 추가 금지." };
  const candidates = observations.filter(item => section.primary_evidence_ids.includes(item.id) && hasReadingMaterial(item));
  const ranked = [...candidates].sort((a, b) => priority(b, section.id) - priority(a, section.id) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const selected: ReportObservation[] = [];
  // Avoid spending the entire message on several versions of the same indicator.
  for (const item of ranked) {
    if (item.kind === "period" || selected.some(previous => previous.kind === item.kind)) continue;
    selected.push(item);
    if (selected.length === (section.id === "essence" ? 1 : 2)) break;
  }
  const supports = candidates.filter(item => item.kind === "period").map(item => item.id);
  const background = section.context_evidence_ids.filter(id => observations.some(item => item.id === id && hasReadingMaterial(item)));
  return {
    basis_ids: selected.map(item => item.id), supporting_ids: [...new Set([...supports, ...background])],
    connections: selected.map(describeConnection),
    boundary: "이 선택은 편집 우선순위이며 길흉·확률 점수가 아님. 확인된 관계의 해석과 가정한 생활 장면을 구분. 빈 항목·없는 관계를 설명으로 채우지 않음.",
  };
}
