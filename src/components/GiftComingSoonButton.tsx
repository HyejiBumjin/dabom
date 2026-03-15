"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

export function GiftComingSoonButton() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const modal = open && mounted && createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="coming-soon-title"
    >
      <div
        className="relative w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="coming-soon-title"
          className="text-lg font-semibold text-zinc-900"
        >
          서비스 준비중
        </h3>
        <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
          운세 선물하기 기능은 준비 중입니다.
          <br />
          조금만 기다려 주세요.
        </p>
        <div className="mt-6 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            확인
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <>
      <Button
        type="button"
        size="lg"
        variant="outline"
        className="w-full flex flex-col items-start justify-between h-auto py-8 cursor-pointer text-left sm:h-full bg-white"
        onClick={() => setOpen(true)}
      >
        <div className="flex flex-col items-start">
          <h3 className="text-2xl font-bold">2026년 운세 선물하기</h3>
          <p>소중한 사람에게 올 한 해 운세를 선물해보세요</p>
        </div>
        <span className="mt-4">선물하기</span>
      </Button>
      {modal}
    </>
  );
}
