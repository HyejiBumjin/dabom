import Link from "next/link";
import type { ReactNode } from "react";

/** A fluid mobile page with a fixed maximum reading width on larger screens. */
export function RetroPage({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <main className={`retro-page ${className}`}>{children}</main>;
}

export function RetroWindow({
  title,
  closeHref,
  closeLabel = "처음으로 돌아가기",
  className = "",
  children,
}: {
  title: string;
  closeHref?: string;
  closeLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`retro-window ${className}`} data-retro-window>
      <div className="retro-titlebar">
        <span className="retro-window-mark" aria-hidden="true" />
        <span className="retro-title-stripes" aria-hidden="true" />
        <p className="retro-window-title">{title}</p>
        <span className="retro-title-stripes" aria-hidden="true" />
        <span className="retro-window-minimize" aria-hidden="true">_</span>
        {closeHref ? (
          <Link href={closeHref} className="retro-window-close" aria-label={closeLabel}>×</Link>
        ) : <span className="retro-window-close" aria-hidden="true">×</span>}
      </div>
      <div className="retro-window-body">{children}</div>
    </section>
  );
}

/** Original code-native pixel mascot; stays sharp at every viewport size. */
export function PixelCat({ className = "", letter = false }: { className?: string; letter?: boolean }) {
  return (
    <svg className={`retro-cat ${className}`} viewBox="0 0 40 30" fill="none" aria-hidden="true" shapeRendering="crispEdges">
      <path d="M6 9H8V4H10V6H12V8H16V4H18V6H20V10H22V17H33V3H36V25H32V22H28V27H25V22H19V27H16V21H10V19H6V17H4V11H6V9Z" fill="currentColor" />
      <path d="M9 11H10V15H9V11ZM17 11H18V15H17V11ZM12 16H14V17H15V18H13V17H12V18H10V17H12V16Z" fill="#fff8e8" />
      <path d="M0 6H2V8H3V9H1V8H0V6ZM0 13H2V14H0V13ZM1 19H3V20H2V21H0V20H1V19Z" fill="currentColor" />
      {letter && <g><path d="M0 21H13V29H0V21Z" fill="#fff8e8" stroke="currentColor" /><path d="M1 22H3V23H5V24H7V25H9V24H11V23H12" stroke="currentColor" /></g>}
    </svg>
  );
}

export function RetroFooter() {
  return <p className="retro-footer">다봄 · 2026</p>;
}

/** The saved-fortune notice has a cat gently tapping an already delivered letter. */
export function SavedFortuneCat() {
  return (
    <svg className="retro-saved-fortune-cat" viewBox="0 0 96 64" fill="none" aria-hidden="true" shapeRendering="crispEdges">
      <path d="M14 56H84V58H14Z" fill="#9e5f4d" opacity=".3" />
      <path className="retro-saved-cat-tail" d="M62 45H75V28H71V21H75V25H79V48H75V52H62V45Z" fill="#211c17" />
      <path d="M34 26H58V33H63V49H59V54H34V50H30V36H34V26Z" fill="#211c17" />
      <path d="M30 13H34V7H38V11H42V13H50V11H54V7H58V13H62V25H58V29H34V25H30V13Z" fill="#211c17" />
      <g className="retro-saved-cat-eyes">
        <path d="M38 18H40V22H38ZM52 18H54V22H52Z" fill="#fff8e8" />
      </g>
      <path d="M44 23H48V25H46V27H44V25H42V24H44V23Z" fill="#fff8e8" />
      <g className="retro-saved-letter">
        <path d="M18 36H49V54H18V36Z" fill="#fff8e8" stroke="#3d2a20" strokeWidth="2" />
        <path d="M20 39H23V42H27V45H33V48H35V45H41V42H45V39H47" stroke="#9e5f4d" strokeWidth="2" />
        <path d="M20 51H25V48H28M46 51H42V48H39" stroke="#9e5f4d" strokeWidth="2" />
      </g>
      <path d="M53 48H61V54H53Z" fill="#211c17" />
      <path className="retro-saved-cat-paw" d="M50 29H56V35H52V39H42V35H46V32H50V29Z" fill="#211c17" />
      <path className="retro-saved-cat-taps" d="M12 29H14V34H12ZM17 26H21V28H17ZM8 36H12V38H8Z" fill="#9e5f4d" />
    </svg>
  );
}

/** The empty inbox has its own calm pixel animation, separate from report loading. */
export function EmptyMailboxCat() {
  return (
    <svg className="retro-empty-mailbox-cat" viewBox="0 0 168 104" fill="none" aria-hidden="true" shapeRendering="crispEdges">
      <path d="M14 91H152V93H14Z" fill="#9e5f4d" opacity=".35" />
      <path d="M18 70V63H22V57H26V49H98V57H102V63H108V87H18V70Z" fill="#fff8e8" stroke="#3d2a20" strokeWidth="2" />
      <path d="M29 54H95V58H99V64H103V70H24V64H28V58H29V54Z" fill="#e6bd98" />
      <g transform="translate(70 28) scale(2)">
        <g className="retro-empty-cat-body">
          <path d="M6 9H8V4H10V6H12V8H16V4H18V6H20V10H22V17H33V22H28V27H25V22H19V27H16V21H10V19H6V17H4V11H6V9Z" fill="#211c17" />
          <path className="retro-empty-cat-tail" d="M32 17H33V3H36V22H32V17Z" fill="#211c17" />
          <g className="retro-empty-cat-eyes">
            <path d="M9 11H10V15H9ZM17 11H18V15H17Z" fill="#fff8e8" />
          </g>
          <path d="M12 16H14V17H15V18H13V17H12V18H10V17H12V16Z" fill="#fff8e8" />
        </g>
      </g>
      <path d="M18 70H47V77H78V70H108V87H18V70Z" fill="#f1d2b5" stroke="#3d2a20" strokeWidth="2" />
      <path d="M26 81H40V83H26Z" fill="#bc8971" />
      <path className="retro-empty-cat-paw" d="M98 65H107V68H111V72H98V65Z" fill="#211c17" />
      <g className="retro-empty-cat-thought">
        <path d="M114 6H143V28H128V32H124V28H114V6Z" fill="#fff8e8" stroke="#3d2a20" strokeWidth="2" />
        <path d="M122 11H134V15H130V19H126V17H128V13H124V15H122V11ZM126 22H130V24H126Z" fill="#3d2a20" />
      </g>
    </svg>
  );
}

/** Original pixel illustration, animated with CSS rather than a downloaded sprite. */
export function TypingPixelCat() {
  return (
    <svg className="retro-typing-cat" viewBox="0 0 96 72" fill="none" aria-hidden="true" shapeRendering="crispEdges">
      <path d="M8 60H90V64H8Z" fill="#9e5f4d" />
      <path d="M82 49H88V53H90V63H86V56H82V49Z" fill="#211c17" />
      <g className="retro-typing-cat-body">
        <path d="M62 29H66V20H70V24H74V26H80V20H84V24H88V30H90V42H86V47H82V61H68V59H62V43H58V32H62Z" fill="#211c17" />
        <path d="M65 33H67V37H65ZM81 33H83V37H81ZM72 39H76V41H72Z" fill="#fff8e8" />
        <path className="retro-typing-cat-eye" d="M64 32H68V38H64ZM80 32H84V38H80Z" fill="#211c17" />
      </g>
      <path d="M12 8H54V42H12Z" fill="#f1d2b5" stroke="#3d2a20" strokeWidth="2" />
      <path d="M16 12H50V35H16Z" fill="#fff8e8" stroke="#3d2a20" strokeWidth="2" />
      <path d="M19 16H28V18H19ZM19 22H39V24H19ZM19 28H32V30H19Z" fill="#9e5f4d" />
      <path className="retro-computer-cursor" d="M35 27H39V31H35Z" fill="#3d2a20" />
      <path d="M28 43H38V49H44V52H22V49H28Z" fill="#3d2a20" />
      <path d="M39 51H70V59H35V55H39Z" fill="#f1d2b5" stroke="#3d2a20" strokeWidth="2" />
      <path className="retro-keyboard-light" d="M40 54H44V56H40ZM47 54H51V56H47ZM54 54H58V56H54ZM61 54H65V56H61Z" fill="#9e5f4d" />
      <path className="retro-cat-paw retro-cat-paw--left" d="M65 44H70V48H62V53H55V49H59V46H65Z" fill="#211c17" />
      <path className="retro-cat-paw retro-cat-paw--right" d="M78 45H82V49H75V55H68V51H72V48H78Z" fill="#211c17" />
      <path className="retro-typing-spark" d="M53 42H55V47H53ZM48 43H50V45H48ZM57 39H59V41H57Z" fill="#9e5f4d" />
    </svg>
  );
}

export function ReportPreparing() {
  return (
    <section className="retro-status" aria-labelledby="report-preparing-title" aria-busy="true">
      <h2 id="report-preparing-title" className="retro-heading">다봄이 네 올해를<br />읽고 있어.</h2>
      <p className="retro-bubble retro-status-note">조금만 기다려줘.</p>
      <TypingPixelCat />
      <p className="retro-status-copy">너에게 보낼 메시지를<br />차근차근 준비하고 있어.</p>
      <div className="retro-typing" role="status" aria-live="polite">
        <span className="retro-typing-dots" aria-hidden="true"><i /><i /><i /></span>
        <p>다봄이 입력 중…</p>
      </div>
      <button type="button" className="retro-button" disabled>메시지 준비 중…</button>
      <RetroFooter />
    </section>
  );
}
