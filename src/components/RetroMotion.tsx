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

/** Queue visible messages, including the initial viewport, in reading order. */
export function ScrollRevealMessages({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!container) return;
    if (motion.matches || !("IntersectionObserver" in window)) {
      delete container.dataset.revealMotion;
      return;
    }
    const messages = Array.from(container.querySelectorAll<HTMLElement>("[data-report-message]"));
    const queue = new Set<HTMLElement>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    function revealNext() {
      const message = messages.find(item => queue.has(item));
      if (!message) { timer = undefined; return; }
      queue.delete(message);
      message.dataset.revealed = "true";
      timer = setTimeout(revealNext, 420);
    }
    container.dataset.revealMotion = "enabled";
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const message = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          queue.add(message);
          observer.unobserve(message);
        }
      }
      if (queue.size && timer === undefined) timer = setTimeout(revealNext, 140);
    }, { threshold: 0, rootMargin: "0px 0px 96px 0px" });
    messages.filter(message => !message.dataset.revealed).forEach(message => observer.observe(message));

    function showAll() {
      if (motion.matches && container) {
        delete container.dataset.revealMotion;
        clearTimeout(timer);
        queue.clear();
        observer.disconnect();
      }
    }
    motion.addEventListener("change", showAll);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
      delete container.dataset.revealMotion;
      motion.removeEventListener("change", showAll);
    };
  }, []);

  // Pending CSS prevents a full-content flash before hydration. Its timed fallback
  // and noscript override keep the report readable even if JavaScript fails.
  return <><noscript><style>{`.retro-messages[data-reveal-motion] [data-report-message]{opacity:1;transform:none;animation:none}`}</style></noscript><div ref={containerRef} className="retro-messages" data-reveal-motion="pending">{children}</div></>;
}
