/**
 * Shared deterministic element / hidden-stem / ten-god tables.
 * Original implementation; classical concepts, no modern translations copied.
 * Basis: public-domain 三命通會 卷二 (論地支、論人元司事).
 * https://zh.wikisource.org/wiki/三命通會/卷二
 */
export type Element = "wood" | "fire" | "earth" | "metal" | "water";
export const stem: Record<string, { element: Element; yang: boolean }> = {
  甲: { element: "wood", yang: true }, 乙: { element: "wood", yang: false }, 丙: { element: "fire", yang: true }, 丁: { element: "fire", yang: false },
  戊: { element: "earth", yang: true }, 己: { element: "earth", yang: false }, 庚: { element: "metal", yang: true }, 辛: { element: "metal", yang: false },
  壬: { element: "water", yang: true }, 癸: { element: "water", yang: false },
};
export const produces: Record<Element, Element> = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
export const controls: Record<Element, Element> = { wood: "earth", fire: "metal", earth: "water", metal: "wood", water: "fire" };
export const hiddenStemsByBranch: Record<string, string[]> = {
  子: ["癸"], 丑: ["己", "癸", "辛"], 寅: ["甲", "丙", "戊"], 卯: ["乙"], 辰: ["戊", "乙", "癸"], 巳: ["丙", "戊", "庚"],
  午: ["丁", "己"], 未: ["己", "丁", "乙"], 申: ["庚", "壬", "戊"], 酉: ["辛"], 戌: ["戊", "辛", "丁"], 亥: ["壬", "甲"],
};

export function tenGod(dayStem: string, compareStem: string) {
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

