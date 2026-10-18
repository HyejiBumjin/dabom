import type { ReportContent } from "@/lib/llm/types";
import { POLICY_VERSION } from "./policy";

// Original fictional excerpt for product preview only; never fed to the LLM.
export const reportSampleVersion = POLICY_VERSION;
export const reportSample: ReportContent = {
  paragraphs: [
    "작은 차이도 그냥 넘기지 않는 편이야. 마음이 쓰이는 일일수록 네 기준이 또렷해져.\n\n올해의 포인트는 그 기준을 혼자 품고 있기보다, 바깥에 보여주는 거야 ✧",
    "맡은 일을 어디까지 해낼지 정하는 순간이 자주 찾아와. 정관은 역할과 책임을 뜻하는 사주 용어인데, 일에서는 네 몫과 평가 기준을 선명하게 만드는 주제로 이어져.\n\n새 일을 맡을 때 완성 기준부터 맞춰둬. 끝없이 잘하려고 애쓰는 것보다, 약속한 지점을 분명하게 마무리하는 힘이 빛나.",
    "한 줄로 말하면, 네 기준이 네 자리가 되는 해.\n\n매번 더 많은 걸 증명하려고 힘주지 않아도 돼. 네가 차근차근 쌓아온 걸 네 목소리로 꺼내는 한 해가 되길 바라 ♡",
  ],
  meta: { presentation: "message", charCount: 0, beats: [], termsUsed: [] },
};
