import Link from "next/link";
import type { ReportContent } from "@/lib/llm/types";
import { splitReportMessages } from "@/lib/report-message-layout";
import { formatReportEmoticons, splitReportEmoticons } from "@/lib/report-emoticons";
import { PixelEnvelope, RetroFooter } from "@/components/RetroWindow";
import { ScrollRevealMessages } from "@/components/RetroMotion";
import { SittingMessengerCat } from "@/components/SittingMessengerCat";

/** All stored messages, including the closing, stay in one page scroll. */
export function MessageReport({ content }: { content: ReportContent }) {
  const groups = formatReportEmoticons(content.paragraphs).map(splitReportMessages);

  return (
    <article aria-label="다봄의 운세 메시지" data-report-presentation="message">
      <header className="retro-report-sender">
        <PixelEnvelope />
        <div>
          <p className="retro-sender-name">다봄의 메세지</p>
          <p className="retro-report-year">2026년 올해 운세</p>
        </div>
      </header>
      <ScrollRevealMessages>
        {groups.map((messages, groupIndex) => (
          <div key={groupIndex} className="retro-message-group">
            {messages.map((message, index) => (
              <div key={index} data-report-message className={`retro-bubble${groupIndex === groups.length - 1 && index === 0 ? " retro-bubble--summary" : ""}`}>
                <p>{splitReportEmoticons(message).map((part, partIndex) => part.isEmoticon
                  ? <span key={partIndex} className="retro-emoticon">{part.text}</span>
                  : part.text)}</p>
              </div>
            ))}
          </div>
        ))}
      </ScrollRevealMessages>
      <footer className="retro-report-closing">
        <SittingMessengerCat />
        <p>읽어줘서 고마워.</p>
        <Link href="/saju/library" className="retro-back-link">내 운세함에서 다시 읽기 →</Link>
        <Link href="/" className="retro-button">처음으로</Link>
        <RetroFooter />
      </footer>
    </article>
  );
}
