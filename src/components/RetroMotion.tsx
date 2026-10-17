"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Keep the full text available to assistive technology and reserve its final size. */
export function TypewrittenText({ text }: { text: string }) {
  const characters = Array.from(text);
  const [visibleCount, setVisibleCount] = useState(characters.length);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;

    let timer: ReturnType<typeof setTimeout>;
    let count = 0;
    const length = Array.from(text).length;
    function typeNext() {
      count += 1;
      setVisibleCount(count);
      if (count < length) timer = setTimeout(typeNext, 48);
    }
    timer = setTimeout(() => {
      setVisibleCount(0);
      timer = setTimeout(typeNext, 180);
    }, 0);
    function finish() {
      if (motion.matches) {
        clearTimeout(timer);
        setVisibleCount(length);
      }
    }
    motion.addEventListener("change", finish);
    return () => {
      clearTimeout(timer);
      motion.removeEventListener("change", finish);
    };
  }, [text]);

  return (
    <span className="retro-typewriter" data-typing={visibleCount < characters.length}>
      <span className="retro-typewriter-reserve" aria-hidden="true">{text}</span>
      <span className="retro-typewriter-text" aria-hidden="true">
        {characters.slice(0, visibleCount).join("")}<span className="retro-typewriter-cursor" />
      </span>
      <span className="sr-only">{text}</span>
    </span>
  );
}

/** Reveal once on entry; all messages retain their space in the single page scroll. */
export function ScrollRevealMessages({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!container || motion.matches || !("IntersectionObserver" in window)) return;

    const messages = Array.from(container.querySelectorAll<HTMLElement>("[data-report-message]"));
    // Keep the initial view readable; reveal the rest just before it scrolls into view.
    messages.forEach(message => {
      if (message.getBoundingClientRect().top < window.innerHeight + 96) {
        message.dataset.revealed = "true";
      }
    });
    container.dataset.revealMotion = "enabled";
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const message = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          message.dataset.revealed = "true";
          observer.unobserve(message);
        }
      }
    }, { threshold: 0, rootMargin: "0px 0px 96px 0px" });
    messages.filter(message => !message.dataset.revealed).forEach(message => observer.observe(message));

    function showAll() {
      if (motion.matches && container) {
        delete container.dataset.revealMotion;
        observer.disconnect();
      }
    }
    motion.addEventListener("change", showAll);
    return () => {
      observer.disconnect();
      delete container.dataset.revealMotion;
      motion.removeEventListener("change", showAll);
    };
  }, []);

  return <div ref={containerRef} className="retro-messages">{children}</div>;
}
