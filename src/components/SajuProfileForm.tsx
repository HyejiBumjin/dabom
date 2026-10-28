"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RetroTitleBar } from "@/components/RetroWindow";
import { RELATIONSHIPS, profileInputSchema, type Relationship } from "@/lib/saju/profile-input";
import { ExistingFortuneNotice } from "@/components/ExistingFortuneNotice";
import { BirthDateInput, BirthTimeInput } from "@/components/BirthDateTimeInput";
import { PROFILE_DRAFT_KEY as DRAFT_KEY, restoreProfileDraft } from "@/lib/profile-draft";
import { ReportLoginRequired, requestSajuReport } from "@/lib/saju/report-request-client";
import { birthDateEligibilityError } from "@/lib/saju/age-policy";

export function SajuProfileForm({ accountId }: { accountId: string }) {
  const router = useRouter();
  const isDevelopment = process.env.NODE_ENV === "development";
  const [name, setName] = useState(isDevelopment ? "최혜지" : "");
  const [relationship, setRelationship] = useState<Relationship>("SELF");
  const [gender, setGender] = useState(isDevelopment ? "female" : "");
  const [birthDate, setBirthDate] = useState(isDevelopment ? "1995-05-20" : "");
  const [birthTime, setBirthTime] = useState(isDevelopment ? "20:20" : "");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [calendar, setCalendar] = useState<"solar" | "lunar">("solar");
  const [isLeapMonth, setIsLeapMonth] = useState(false);
  const [pending, setPending] = useState(false);
  const submissionInFlight = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const duplicateDialog = useRef<HTMLDialogElement>(null);
  const libraryButton = useRef<HTMLButtonElement>(null);
  const libraryNavigationInFlight = useRef(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const inputReady = profileInputSchema.safeParse({ name, relationship, gender, birthDate, birthTime: timeUnknown ? null : birthTime, calendar, isLeapMonth }).success;
  const birthDateError = birthDate.length === 10 ? birthDateEligibilityError({ birthDate, calendar, isLeapMonth }) : null;
  useEffect(() => () => {
    activeRequest.current?.abort();
    if (navigationTimer.current) clearTimeout(navigationTimer.current);
  }, []);

  function navigate(href: string) {
    if (navigationTimer.current) clearTimeout(navigationTimer.current);
    // Recover if a client-side transition stalls on a cached/prefetched route.
    navigationTimer.current = setTimeout(() => window.location.assign(href), 10_000);
    router.push(href);
  }

  useEffect(() => {
    const dialog = duplicateDialog.current;
    if (!duplicateOpen || !dialog) return;
    dialog.showModal();
    libraryButton.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [duplicateOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const stored = sessionStorage.getItem(DRAFT_KEY);
        if (!stored) return;
        const input = restoreProfileDraft(stored, accountId);
        if (!input) { sessionStorage.removeItem(DRAFT_KEY); return; }
        setName(input.name); setRelationship(input.relationship); setGender(input.gender);
        setBirthDate(input.birthDate); setBirthTime(input.birthTime ?? ""); setTimeUnknown(!input.birthTime);
        setCalendar(input.calendar); setIsLeapMonth(input.isLeapMonth);
      } catch { /* Storage may be disabled; the form remains usable. */ }
    }, 0);
    return () => clearTimeout(timer);
  }, [accountId]);

  function showExistingFortune() {
    setPending(false);
    setDuplicateOpen(true);
  }

  function dismissDuplicate() {
    duplicateDialog.current?.close();
    setDuplicateOpen(false);
    submissionInFlight.current = false;
    nameInput.current?.focus();
  }

  function startNewQuery() {
    dismissDuplicate();
    setName(""); setRelationship("SELF"); setGender("");
    setBirthDate(""); setBirthTime(""); setTimeUnknown(false);
    setCalendar("solar"); setIsLeapMonth(false); setError(null);
  }

  function openLibrary() {
    if (libraryNavigationInFlight.current) return;
    libraryNavigationInFlight.current = true;
    setPending(true);
    navigate("/saju/library");
  }

  async function prepareReport(profileId: string, controller: AbortController, signal: AbortSignal) {
    try {
      const result = await requestSajuReport(profileId, signal);
      if (controller.signal.aborted) return;
      if (result.kind === "existing") { showExistingFortune(); return; }
      navigate(result.href);
    } catch (cause) {
      if (controller.signal.aborted) throw cause;
      if (cause instanceof ReportLoginRequired) {
        const input = { name, relationship, gender, birthDate, birthTime: timeUnknown ? null : birthTime, calendar, isLeapMonth };
        try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ accountId, input })); } catch { /* Login still works without draft storage. */ }
        navigate("/login?next=%2Fsaju");
        return;
      }
      throw cause;
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionInFlight.current) return;
    setError(null);
    if (!inputReady) {
      setError(birthDateError ?? "이름, 성별, 생년월일과 태어난 시각을 입력해 주세요.");
      return;
    }
    submissionInFlight.current = true;
    const controller = new AbortController();
    activeRequest.current = controller;
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]);
    setPending(true);
    try {
      const input = { name, relationship, gender, birthDate, birthTime: timeUnknown ? null : birthTime, calendar, isLeapMonth };
      const response = await fetch("/api/saju/profiles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal });
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (response.status === 401) {
        try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ accountId, input })); } catch { /* Login still works without draft storage. */ }
        navigate("/login?next=%2Fsaju"); return;
      }
      if (!response.ok) throw new Error(data.error || "저장하지 못했습니다.");
      try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* Optional storage. */ }
      if (data.existingReport) { showExistingFortune(); return; }
      await prepareReport(data.profileId, controller, signal);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(signal.aborted ? "연결이 오래 걸리고 있어. 잠시 뒤 다시 눌러줘. 기존 운세는 운세함에서 확인할 수 있어." : cause instanceof Error ? cause.message : "저장 중 오류가 발생했습니다.");
      submissionInFlight.current = false;
      setPending(false);
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }

  return (
    <>
      <form onSubmit={submit} className="retro-form" aria-busy={pending} aria-describedby={error ? "profile-error" : undefined}>
        <fieldset className="retro-form-panel" disabled={pending} aria-label="운세 입력 정보">
          <fieldset className="retro-choice-field">
            <legend>누구의 운세?</legend>
            <div className="retro-choice-options retro-relationship-options">
              {RELATIONSHIPS.map(option => (
                <label className="retro-choice" key={option.value}>
                  <input type="radio" name="relationship" value={option.value} checked={relationship === option.value} onChange={() => setRelationship(option.value)} />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="retro-field">
            <label htmlFor="name">이름</label>
            <input ref={nameInput} className="retro-input" id="name" name="name" autoComplete="name" maxLength={40} value={name} onChange={event => setName(event.target.value)} placeholder="예: 김다봄" required />
          </div>
          <fieldset className="retro-choice-field">
            <legend>성별</legend>
            <div className="retro-choice-options">
              {[{ value: "female", label: "여성" }, { value: "male", label: "남성" }].map(option => (
                <label className="retro-choice" key={option.value}>
                  <input type="radio" name="gender" value={option.value} checked={gender === option.value} onChange={event => setGender(event.target.value)} required />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="retro-field">
            <label htmlFor="birthDate">생년월일</label>
            <div>
              <BirthDateInput value={birthDate} lunar={calendar === "lunar"} onChange={setBirthDate} describedBy={`birth-age-help${birthDateError ? " birth-age-error" : ""}`} invalid={Boolean(birthDateError)} />
              <p id="birth-age-help" className="retro-form-help">만 14세 이상인 사람의 정보만 입력해줘.<br />가족·친구도 같아. 음력은 양력으로 바꾼 생일로 확인해.</p>
              {birthDateError && <p id="birth-age-error" className="retro-error" role="status">{birthDateError}</p>}
            </div>
          </div>
          <fieldset className="retro-choice-field">
            <legend>달력 기준</legend>
            <div className="retro-choice-options">
              {[{ value: "solar", label: "양력" }, { value: "lunar", label: "음력" }].map(option => (
                <label className="retro-choice" key={option.value}>
                  <input type="radio" name="calendar" value={option.value} checked={calendar === option.value} onChange={event => {
                    setCalendar(option.value as "solar" | "lunar");
                    if (event.target.value === "solar") setIsLeapMonth(false);
                  }} />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
          {calendar === "lunar" && (
            <label className="retro-checkbox"><input type="checkbox" checked={isLeapMonth} onChange={event => setIsLeapMonth(event.target.checked)} />윤달이야</label>
          )}
          <div className="retro-field">
            <label htmlFor="birthTime">태어난 시각</label>
            <BirthTimeInput value={birthTime} disabled={timeUnknown} onChange={setBirthTime} />
            <div className="retro-time-options">
              <label className="retro-checkbox"><input type="checkbox" checked={timeUnknown} onChange={event => setTimeUnknown(event.target.checked)} />태어난 시각을 몰라</label>
              {timeUnknown && <p className="retro-form-help">시간은 모르는 상태로 운세를 읽어줄게.</p>}
            </div>
          </div>
        </fieldset>
        {error && <p id="profile-error" className="retro-error" role="alert">{error}</p>}
        <button type="submit" className="retro-button" disabled={pending || duplicateOpen || !inputReady}>
          {pending ? "메시지를 준비하는 중…" : "운세 메시지 받기"}
        </button>
        <p className="retro-caption">이제 다봄이 올해의 흐름을 읽어줄게.</p>
      </form>
      <dialog
        ref={duplicateDialog}
        className="retro-window retro-duplicate-dialog"
        aria-labelledby="duplicate-fortune-title"
        aria-describedby="duplicate-fortune-description"
        aria-busy={pending}
        onCancel={event => { event.preventDefault(); if (!pending) dismissDuplicate(); }}
      >
        <RetroTitleBar title="다봄 · 알림">
          <button type="button" className="retro-window-close" aria-label="입력 내용 수정하기" disabled={pending} onClick={dismissDuplicate}>×</button>
        </RetroTitleBar>
        <ExistingFortuneNotice pending={pending} onLibrary={openLibrary} onNewQuery={startNewQuery} libraryButton={libraryButton} />
      </dialog>
    </>
  );
}
