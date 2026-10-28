import Link from "next/link";
import type { ReportContent } from "@/lib/llm/types";
import { reportTopicParagraphs } from "@/lib/report-message-layout";
import { formatReportEmoticons, splitReportEmoticons } from "@/lib/report-emoticons";
import { explanationFirstReportText, splitReportTermAnnotations } from "@/lib/report-term-annotations";
import { PixelEnvelope, RetroFooter } from "@/components/RetroWindow";
import { ScrollRevealMessages } from "@/components/RetroMotion";
import { SittingMessengerCat } from "@/components/SittingMessengerCat";

/** All stored messages, including the closing, stay in one page scroll. */
export function MessageReport({ content }: { content: ReportContent }) {
  const terms = Array.isArray(content.meta?.termsUsed)
    ? content.meta.termsUsed.flatMap(entry => typeof entry?.term === "string" ? [entry.term] : [])
    : [];
  const groups = formatReportEmoticons(content.paragraphs)
    .map(paragraph => reportTopicParagraphs(explanationFirstReportText(paragraph, terms)));

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
        {groups.map((paragraphs, groupIndex) => (
          <div key={groupIndex} className="retro-message-group">
            <div data-report-message className={`retro-bubble retro-bubble--topic${groupIndex === groups.length - 1 ? " retro-bubble--summary" : ""}`}>
              {paragraphs.map((paragraph, index) => (
                <p key={index}>{splitReportTermAnnotations(paragraph, terms).map((part, partIndex) => part.isTerm
                  ? <span key={partIndex} className="retro-term-note">{part.text}</span>
                  : <span key={partIndex}>{splitReportEmoticons(part.text).map((reaction, reactionIndex) => reaction.isEmoticon
                    ? <span key={reactionIndex} className="retro-emoticon">{reaction.text}</span>
                    : reaction.text)}</span>)}</p>
              ))}
            </div>
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
