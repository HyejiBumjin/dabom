/** Grounding checks for names with a finite rule table. No model/network calls. */
const ALIASES: Record<string, string> = {
  천을귀인: "천을귀인", 역마살: "역마", 역마: "역마", 도화살: "도화", 도화: "도화", 화개살: "화개", 화개: "화개",
  형살: "형", 삼형살: "삼형", 삼형: "삼형", 자형: "자형", 육해: "해", 육파: "파", 삼합: "삼합", 방합: "방합",
  신강: "신강", 신약: "신약", 용신: "용신", 격국: "격국",
  조후: "조후", 통근: "통근", 투출: "투출",
  건록격: "건록격", 양인격: "양인격", 월겁격: "월겁격", 식신격: "식신격", 상관격: "상관격", 편재격: "편재격", 정재격: "정재격", 정관격: "정관격", 칠살격: "칠살격", 편인격: "편인격", 정인격: "정인격",
  // Recognized but never authorized by the current rules; block invention.
  천덕귀인: "천덕귀인", 월덕귀인: "월덕귀인", 문창귀인: "문창귀인", 백호살: "백호살", 괴강살: "괴강살", 원진살: "원진살", 귀문관살: "귀문관살", 공망: "공망", 종격: "종격", 종재격: "종재격", 종관격: "종관격", 종살격: "종살격", 종아격: "종아격", 종강격: "종강격", 화기격: "화기격",
};
const names = Object.keys(ALIASES).sort((a, b) => b.length - a.length).join("|");

export function getAdvancedReportIssues(text: string, allowedTerms: string[]): string[] {
  const allowed = new Set(allowedTerms);
  const issues = new Set<string>();
  if (/\b(?:undetermined|candidate|conditional|eokbu-only|season-roots-visible-agreement|seasonal-indicators-only|primary_interpretation|synthesis_context|advanced_context|advanced_terms|birth-time-unknown|observations|primary_evidence_ids|context_evidence_ids|anchor_evidence_ids|timing_index|reading_plan|basis_ids|supporting_ids|evidence_uses|evidence_id|interpretive_axes|excerpt)\b|F-(?:advanced|synthesis)|(?:myeongri|synthesis)-\d|(?:natal-day-master|natal-season|annual-echo|stem-link-\d|life-stage-|advanced-(?:natal|annual|monthly|da-yun))/u.test(text)) issues.add("심화 해석의 내부 판단 상태나 규칙 ID가 노출되었습니다. 확인된 뜻만 쉬운 한국어로 설명하세요.");
  if (/(?:식신|상관|식상)(?:이|은|의 기운이)\s*(?:일간|일주|너|너의 일간)(?:을|를)\s*생(?:해|하|하는)|(?:정인|편인|인성)(?:은|이)\s*일간이\s*생(?:하|해)/u.test(text)) issues.add("십신의 생하는 방향이 뒤집혔습니다. 식상은 일간이 생하는 쪽, 인성은 일간을 생하는 쪽입니다. 입력의 방향을 따라 해석하세요.");
  for (const match of text.matchAll(new RegExp(names, "gu"))) {
    const canonical = ALIASES[match[0]];
    if (!allowed.has(canonical)) issues.add(`'${match[0]}'은 이 주제에 배정된 계산 근거가 없습니다. 해당 판단을 빼고 배정된 근거로 설명하세요.`);
  }
  // Short words also occur as ordinary Korean (형, 올해, 해 보다, 파악).
  // Their explicit parenthesized labels are unambiguous technical claims.
  for (const match of text.matchAll(/[（(]\s*(형|해|파)\s*[）)]/gu)) if (!allowed.has(match[1])) issues.add(`'${match[1]}' 관계의 근거가 배정되지 않았습니다.`);
  for (const match of text.matchAll(/(?:[（(]\s*|십이운성(?:의|은)?\s*|운성(?:의|은)?\s*)(장생|목욕|관대|임관|제왕|쇠|병|사|묘|절|태|양)(?=[）)\s]|은|는|이|가|$)/gu)) {
    if (!allowed.has(match[1])) issues.add(`'${match[1]}' 운성은 이 주제의 계산 근거에 없습니다.`);
  }
  if (/(?:십이운성|운성|[（(](?:병|사|묘|절|태|양)[）)])[^.!?\n]{0,65}(?:아프|아플|아픈|아파|앓|질병|죽|사망|임신|출산|유산|이별|절교|파산)|(?:제왕|임관)[^.!?\n]{0,35}(?:무조건|반드시|신강)|조후\s*용신|(?:합화|오행.{0,6}(?:변했|바뀌었))/u.test(text)) issues.add("보조 지표로 질병·생사·임신·성패·조후용신·합화를 확정하지 마세요. 계산된 보조 의미만 사용하세요.");
  if (/(?:확정된|유일한|절대적인)\s*(?:격국|용신)|(?:격국|용신)[은는이가]?\s*[^.!?\n]{0,25}(?:확정|무조건)|(?:신강|신약)(?:한\s*사주)?(?:이야|이다|야|로\s*확정)|(?:정관|칠살|정재|편재|식신|상관|정인|편인|건록|양인|월겁)격(?:이야|이다|으로\s*확정)/u.test(text)) issues.add("신강약·격국·용신 후보를 확정 판정으로 바꾸었습니다. 계절·월령·억부 관점의 적용 범위를 밝히고 그 안의 의미를 설명하세요.");
  if (/(?:신강|신약)[^.!?\n]{0,28}(?:성격이\s*(?:세|강|약)|마음이\s*약|건강이\s*(?:좋|나쁘)|몸이\s*약)/u.test(text)) issues.add("신강약을 성격이나 건강의 강약으로 바꾸지 마세요.");
  if (/(?:용신|신살)[^.!?\n]{0,40}(?:행운의?\s*(?:색|물건|숫자)|사면|구매하면|투자하면)/u.test(text)) issues.add("용신·신살에서 행운 물건이나 투자 권유를 만들지 마세요.");
  return [...issues];
}
