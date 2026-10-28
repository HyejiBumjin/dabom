"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { RetroTitleBar } from "@/components/RetroWindow";

const pad = (value: number) => String(value).padStart(2, "0");

function PickerDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, []);
  return <dialog ref={ref} className="retro-window retro-picker-dialog" aria-labelledby={titleId}
    onKeyDown={event => { if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault(); }}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <RetroTitleBar title="다봄 · 내 정보"><button type="button" className="retro-window-close" aria-label="선택창 닫기" onClick={onClose}>×</button></RetroTitleBar>
    <div className="retro-picker-body"><h2 id={titleId}>{title}</h2>{children}</div>
  </dialog>;
}

function DatePicker({ value, lunar, onChange, onClose }: { value: string; lunar: boolean; onChange: (value: string) => void; onClose: () => void }) {
  const parts = value.split("-").map(Number);
  const [year, setYear] = useState(String(parts[0] >= 1900 && parts[0] <= 2100 ? parts[0] : 1995));
  const [month, setMonth] = useState(String(parts[1] >= 1 && parts[1] <= 12 ? parts[1] : 1));
  const validMonth = /^\d{4}$/.test(year) && Number(year) >= 1900 && Number(year) <= 2100 && Number(month) >= 1 && Number(month) <= 12;
  const y = Number(year), m = Number(month);
  const days = validMonth ? new Date(y, m, 0).getDate() : 0;
  const offset = validMonth && !lunar ? new Date(y, m - 1, 1).getDay() : 0;
  function moveMonth(amount: number) {
    const date = new Date(y, m - 1 + amount, 1);
    if (date.getFullYear() < 1900 || date.getFullYear() > 2100) return;
    setYear(String(date.getFullYear())); setMonth(String(date.getMonth() + 1));
  }
  return <PickerDialog title={lunar ? "음력 생일을 골라줘." : "생일을 골라줘."} onClose={onClose}>
    <p className="retro-picker-hint">연도와 월은 숫자로 바로 바꿀 수 있어.</p>
    <div className="retro-calendar-controls">
      <button type="button" className="retro-picker-step" aria-label="이전 달" disabled={!validMonth || y === 1900 && m === 1} onClick={() => moveMonth(-1)}>‹</button>
      <label><input aria-label="생일 연도" type="text" inputMode="numeric" maxLength={4} value={year} onChange={event => setYear(event.target.value.replace(/\D/g, ""))} />년</label>
      <label><input aria-label="생일 월" type="text" inputMode="numeric" maxLength={2} value={month} onChange={event => setMonth(event.target.value.replace(/\D/g, ""))} />월</label>
      <button type="button" className="retro-picker-step" aria-label="다음 달" disabled={!validMonth || y === 2100 && m === 12} onClick={() => moveMonth(1)}>›</button>
    </div>
    {!validMonth && <p className="retro-error" role="status">연도는 1900~2100, 월은 1~12로 적어줘.</p>}
    <div className="retro-calendar-days" aria-label="생일 날짜">
      {!lunar && ["일", "월", "화", "수", "목", "금", "토"].map(day => <span className="retro-calendar-weekday" key={day}>{day}</span>)}
      {Array.from({ length: offset }, (_, i) => <span key={`blank-${i}`} />)}
      {Array.from({ length: days }, (_, i) => {
        const day = i + 1, date = `${year}-${pad(m)}-${pad(day)}`;
        return <button type="button" key={day} aria-label={`${year}년 ${m}월 ${day}일`} aria-pressed={date === value}
          onClick={() => { onChange(date); onClose(); }}>{day}</button>;
      })}
    </div>
    <button type="button" className="retro-button retro-button--secondary" onClick={onClose}>취소</button>
  </PickerDialog>;
}

function TimePicker({ value, onChange, onClose }: { value: string; onChange: (value: string) => void; onClose: () => void }) {
  const valid = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
  const [hour, setHour] = useState(valid ? Number(value.slice(0, 2)) % 12 || 12 : 12);
  const [afternoon, setAfternoon] = useState(valid && Number(value.slice(0, 2)) >= 12);
  const [minute, setMinute] = useState(valid ? value.slice(3) : "00");
  const validMinute = /^\d{1,2}$/.test(minute) && Number(minute) < 60;
  return <PickerDialog title="태어난 시각을 골라줘." onClose={onClose}>
    <div className="retro-time-period" aria-label="오전 또는 오후">
      {[false, true].map(pm => <button key={String(pm)} type="button" aria-pressed={afternoon === pm} onClick={() => setAfternoon(pm)}>{pm ? "오후" : "오전"}</button>)}
    </div>
    <p className="retro-picker-hint">몇 시에 태어났어?</p>
    <div className="retro-time-hours" aria-label="태어난 시">
      {Array.from({ length: 12 }, (_, i) => i + 1).map(h => <button key={h} type="button" aria-label={`${h}시`} aria-pressed={hour === h} onClick={() => setHour(h)}>{h}</button>)}
    </div>
    <label className="retro-time-minute">분 <input aria-label="태어난 분" className="retro-input" type="text" inputMode="numeric" maxLength={2} value={minute} onChange={event => setMinute(event.target.value.replace(/\D/g, ""))} />분</label>
    {!validMinute && <p className="retro-error" role="status">분은 0~59 사이로 적어줘.</p>}
    <p className="retro-time-preview" aria-live="polite">{afternoon ? "오후" : "오전"} {hour}시 {validMinute ? Number(minute) : "—"}분</p>
    <button type="button" className="retro-button" disabled={!validMinute} onClick={() => { onChange(`${pad(hour % 12 + (afternoon ? 12 : 0))}:${pad(Number(minute))}`); onClose(); }}>이 시각으로 선택</button>
  </PickerDialog>;
}

export function BirthDateInput({ value, lunar, onChange, describedBy, invalid }: { value: string; lunar: boolean; onChange: (value: string) => void; describedBy?: string; invalid?: boolean }) {
  const [open, setOpen] = useState(false);
  return <div className="retro-date-time-input">
    <input className="retro-input" id="birthDate" name="birthDate" type="text" inputMode="numeric" autoComplete="bday" placeholder="1995-05-20" maxLength={10} pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}" value={value} required aria-describedby={describedBy} aria-invalid={invalid || undefined}
      onChange={event => {
        const digits = event.target.value.replace(/\D/g, "").slice(0, 8);
        onChange(digits.slice(0, 4) + (digits.length > 4 ? `-${digits.slice(4, 6)}` : "") + (digits.length > 6 ? `-${digits.slice(6)}` : ""));
      }} />
    <button type="button" className="retro-picker-trigger" aria-label="생년월일 달력 열기" aria-haspopup="dialog" onClick={() => setOpen(true)}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5H20V21H4ZM4 10H20M8 2V7M16 2V7M8 14H10M14 14H16M8 18H10" stroke="currentColor" strokeWidth="2" /></svg></button>
    {open && <DatePicker value={value} lunar={lunar} onChange={onChange} onClose={() => setOpen(false)} />}
  </div>;
}

export function BirthTimeInput({ value, disabled, onChange }: { value: string; disabled: boolean; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  return <div className="retro-date-time-input">
    <input className="retro-input" id="birthTime" name="birthTime" type="text" inputMode="numeric" placeholder="20:20" maxLength={5} pattern="([01][0-9]|2[0-3]):[0-5][0-9]" aria-label="태어난 시각 (24시간 기준)" value={value} disabled={disabled} required={!disabled}
      onChange={event => { const digits = event.target.value.replace(/\D/g, "").slice(0, 4); onChange(digits.slice(0, 2) + (digits.length > 2 ? `:${digits.slice(2)}` : "")); }} />
    <button type="button" className="retro-picker-trigger" aria-label="태어난 시각 선택창 열기" aria-haspopup="dialog" disabled={disabled} onClick={() => setOpen(true)}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="M12 6V12L16 15" stroke="currentColor" strokeWidth="2" /></svg></button>
    {open && !disabled && <TimePicker value={value} onChange={onChange} onClose={() => setOpen(false)} />}
  </div>;
}
