import Link from "next/link";
import type { ReactNode } from "react";
import { AnimatedMessengerCat } from "@/components/AnimatedMessengerCat";

/** A fluid mobile page with a fixed maximum reading width on larger screens. */
export function RetroPage({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <main className={`retro-page ${className}`}>{children}</main>;
}

export function PixelEnvelope({ className = "" }: { className?: string }) {
  return <svg className={`retro-envelope ${className}`} viewBox="0 0 24 18" fill="none" aria-hidden="true" shapeRendering="crispEdges"><path d="M1 1H23V17H1Z" fill="#fff3cc" stroke="currentColor" strokeWidth="2" /><path d="M2 3H4V5H7V7H10V9H14V7H17V5H20V3H22M2 15H5V12H8M22 15H19V12H16" stroke="currentColor" strokeWidth="2" /></svg>;
}

export function RetroTitleBar({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="retro-titlebar"><PixelEnvelope /><p className="retro-window-title">{title}</p><span className="retro-window-year">2026</span>{children}</div>;
}

export function RetroWindow({ title, closeHref, closeLabel = "처음으로 돌아가기", className = "", children }: {
  title: string; closeHref?: string; closeLabel?: string; className?: string; children: ReactNode;
}) {
  return <section className={`retro-window ${className}`} data-retro-window>
    <RetroTitleBar title={title}>{closeHref && <Link href={closeHref} className="retro-window-close" aria-label={closeLabel}>×</Link>}</RetroTitleBar>
    <div className="retro-window-body">{children}</div>
  </section>;
}

/** The approved C mascot is shared as one asset across every scene. */
function CatSprite() {
  return <image href="/images/dabom-cat-c.png" width="64" height="64" />;
}

export function PixelCat({ className = "" }: { className?: string }) {
  return <svg className={`retro-cat ${className}`} viewBox="0 0 64 64" fill="none" aria-hidden="true"><CatSprite /></svg>;
}

function PixelCloud({ className = "" }: { className?: string }) {
  return <svg className={`retro-cloud ${className}`} viewBox="0 0 120 42" fill="none" aria-hidden="true"><path d="M17 38C-1 38 0 21 14 20C13 9 27 5 35 11C40-2 60 1 64 15C72 7 89 10 91 22C107 14 123 34 105 38Z" fill="#f4faff" stroke="#b4d5f5" strokeWidth="2" strokeLinejoin="round" /><path d="M18 33Q60 38 102 33" stroke="#dfedfc" strokeWidth="3" strokeLinecap="round" /></svg>;
}

export function CloudCat({ className = "", animated = false }: { className?: string; animated?: boolean }) {
  return <div className={`retro-cloud-cat ${className}`} aria-hidden="true"><PixelCloud />{animated ? <AnimatedMessengerCat /> : <PixelCat />}<span className="retro-pixel-star">✧</span></div>;
}

export function SkyMessenger() {
  return <div className="retro-sky-messenger"><PixelCloud className="retro-cloud--left" /><PixelCloud className="retro-cloud--right" /><div className="retro-arrival-note"><span className="retro-arrival-title" aria-hidden="true"><i /><i /></span><span><PixelEnvelope />새 메시지 도착!</span></div><CloudCat animated /><span className="retro-scene-star" aria-hidden="true">✦</span></div>;
}

export function RetroFooter() {
  return <p className="retro-footer">다봄 · 2026</p>;
}

/** A little delivery nod distinguishes the saved-fortune notice. */
export function SavedFortuneCat() {
  return <svg className="retro-saved-fortune-cat" viewBox="0 0 96 80" fill="none" aria-hidden="true">
    <path d="M12 73H84V75H12Z" fill="#d9dcf7" />
    <g transform="translate(12 0) scale(1.15)"><g className="retro-saved-delivery"><CatSprite /></g></g>
    <path className="retro-saved-cat-taps" d="M84 39V43M88 47H92M84 51V55" stroke="#a291cb" strokeWidth="2" strokeLinecap="round" />
  </svg>;
}

export function EmptyMailboxCat() {
  return <svg className="retro-empty-mailbox-cat" viewBox="0 0 168 116" fill="none" aria-hidden="true">
    <path d="M18 106H150V108H18Z" fill="#d9dcf7" />
    <path d="M21 68H30V58H126V68H137V102H21Z" fill="#dcd9f9" stroke="#69609b" strokeWidth="2" />
    <path d="M31 63H121V69H129V81H27V69H31Z" fill="#ada9d0" />
    <g transform="translate(40 12) scale(1.4)"><g className="retro-empty-cat-body"><CatSprite /></g></g>
    <path d="M21 80H58V90H99V80H137V102H21Z" fill="#e5edff" stroke="#69609b" strokeWidth="2" /><path d="M31 95H50V97H31Z" fill="#b4b5df" />
    <g className="retro-empty-cat-thought"><path d="M123 6H150V28H135V32H131V28H123Z" fill="#fff" stroke="#69609b" strokeWidth="2" /><path d="M131 11H142V16H139V19H135V16H138V13H135V15H131ZM135 22H139V24H135Z" fill="#69609b" /></g>
  </svg>;
}

export function TypingPixelCat() {
  return <svg className="retro-typing-cat" viewBox="0 0 128 84" fill="none" aria-hidden="true">
    <path d="M8 76H120V79H8Z" fill="#c0c5eb" />
    <g transform="translate(128 13) scale(-1 1)"><g className="retro-typing-cat-body"><CatSprite /></g></g>
    <path d="M12 17H63V56H12Z" fill="#dcd9f9" stroke="#69609b" strokeWidth="2" /><path d="M17 23H58V49H17Z" fill="#f9fcff" stroke="#69609b" strokeWidth="2" />
    <path d="M22 29H34V31H22ZM22 36H46V38H22ZM22 43H37V45H22Z" fill="#aaa2d3" /><path className="retro-computer-cursor" d="M40 42H44V46H40Z" fill="#69609b" />
    <path d="M32 57H42V64H49V67H25V64H32Z" fill="#69609b" /><path d="M46 64H91V74H40V70H46Z" fill="#e5edff" stroke="#69609b" strokeWidth="2" />
    <path className="retro-keyboard-light" d="M47 68H52V70H47ZM56 68H61V70H56ZM65 68H70V70H65ZM74 68H80V70H74Z" fill="#9a90c6" />
    <path className="retro-typing-spark" d="M59 58H61V63H59ZM54 59H56V61H54ZM63 55H65V57H63Z" fill="#8e7abc" />
  </svg>;
}

export function ReportPreparing() {
  return <section className="retro-status" aria-labelledby="report-preparing-title" aria-busy="true"><h2 id="report-preparing-title" className="retro-heading">다봄이 네 올해를<br />읽고 있어.</h2><p className="retro-bubble retro-status-note">조금만 기다려줘.</p><TypingPixelCat /><p className="retro-status-copy">너에게 보낼 메시지를<br />차근차근 준비하고 있어.</p><div className="retro-typing" role="status" aria-live="polite"><span className="retro-typing-dots" aria-hidden="true"><i /><i /><i /></span><p>다봄이 입력 중…</p></div><button type="button" className="retro-button" disabled>메시지 준비 중…</button><RetroFooter /></section>;
}
