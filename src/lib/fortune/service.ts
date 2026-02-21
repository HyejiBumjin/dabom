/**
 * Letter generation - warm, supportive tone
 * Uses flow-type template, easy to swap with OpenAI later
 */
import type { FlowType, FortuneResult } from "./types";

const LETTER_TEMPLATES: Record<
  FlowType,
  (result: FortuneResult) => string
> = {
  상승: (r) =>
    `안녕, 나의 2026년을 향해 걸어가는 사람에게.\n\n` +
    `이번 해는 당신에게 큰 기운이 밀려오는 해라고 했어요. ${r.overall}\n\n` +
    `커리어에서는 ${r.career} 그리고 연애와 금전 쪽에서도 ${r.love} ${r.money}\n\n` +
    `${r.cautionMonth}에는 조금 신중하게, ${r.opportunityMonth}에는 기회를 놓치지 않도록 준비하고 있어요.\n\n` +
    `당신의 한 해가 따뜻하고 풍성하길 바랄게. 💌`,

  변화: (r) =>
    `안녕, 변화의 문 앞에 선 당신에게.\n\n` +
    `2026년은 ${r.overall}\n\n` +
    `${r.career} ${r.love} ${r.money}\n\n` +
    `${r.cautionMonth}를 지나 ${r.opportunityMonth}에 찾아올 기회를 기다리며, 오늘 하루도 씩씩하게 걸어가요.\n\n` +
    `변화가 두렵다면, 지금 이 편지를 읽고 있는 당신이 이미 첫걸음을 뗀 거예요. 응원할게요. 💌`,

  정체: (r) =>
    `안녕, 잠시 숨 고르는 당신에게.\n\n` +
    `${r.overall}\n\n` +
    `${r.career} ${r.love} ${r.money}\n\n` +
    `조심할 달 ${r.cautionMonth}, 기회가 오는 달 ${r.opportunityMonth}. 조급해하지 말고, 당신만의 속도로 걸어가요.\n\n` +
    `지금의 하루하루가 멀지 않은 미래의 큰 발판이 될 거예요. 편히 쉬고, 또 다시 일어나 걸어가면 돼요. 💌`,

  도전: (r) =>
    `안녕, 도전을 앞둔 당신에게.\n\n` +
    `${r.overall}\n\n` +
    `${r.career} ${r.love} ${r.money}\n\n` +
    `${r.cautionMonth}를 주의하며, ${r.opportunityMonth}의 기회를 놓치지 않도록 준비해 두세요.\n\n` +
    `힘들 때는 잠시 멈춰도 괜찮아요. 다시 일어나면, 그만큼 더 단단해진 당신이 있을 거예요. 응원할게요. 💌`,

  회복: (r) =>
    `안녕, 지친 몸과 마음을 돌보고 있는 당신에게.\n\n` +
    `${r.overall}\n\n` +
    `${r.career} ${r.love} ${r.money}\n\n` +
    `${r.cautionMonth}는 조금 무리하지 말고, ${r.opportunityMonth}에는 차근차근 일어나 보세요.\n\n` +
    `회복에는 시간이 필요해요. 오늘 하루도 당신이 할 수 있는 만큼만 해도 충분해요. 따뜻하게 보내요. 💌`,
};

export function generateLetter(result: FortuneResult): string {
  const fn = LETTER_TEMPLATES[result.flowType];
  return fn ? fn(result) : LETTER_TEMPLATES.회복(result);
}
