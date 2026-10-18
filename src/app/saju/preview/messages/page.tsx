import { notFound } from "next/navigation";
import { MessageReport } from "@/components/MessageReport";
import { RetroPage, RetroWindow } from "@/components/RetroWindow";
import type { ReportContent } from "@/lib/llm/types";

// Visual-only fixture. This copy is never used by report generation.
const paragraphs = [
  "너는 작은 차이도 그냥 넘기지 않는 사람이야.\n\n마음이 쓰이는 일에는 네 기준이 분명하게 담겨 있어. 올해는 그 세심함이 네 실력을 보여주는 힘이 돼 ✧",
  "맡은 일이 조금 더 또렷해지는 흐름이야. 정관은 역할과 책임을 말하는 사주 용어인데, 네 기준을 보여주는 장면으로 이어져.\n\n다 잘하려고 힘을 나누기보다, 네가 잘하는 한 가지를 먼저 보여줘.",
  "한 줄로 말하면, 네 기준이 네 자리가 되는 해.\n\n서두르지 않아도 괜찮아. 네 속도로 꺼내는 한 해가 되길 바라 ♡",
];
const content: ReportContent = { paragraphs, meta: { presentation: "message", charCount: paragraphs.join("").length, beats: [], termsUsed: [] } };

export default function MessagesPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <RetroPage><RetroWindow title="다봄" closeHref="/">
    <h1 className="sr-only">운세 메시지 디자인 미리보기</h1>
    <p className="retro-preview-note">디자인 확인용 예시 메시지야.</p>
    <MessageReport content={content} />
  </RetroWindow></RetroPage>;
}
