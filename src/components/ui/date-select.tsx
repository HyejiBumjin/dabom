"use client";

import { useMemo, useState } from "react";
import { CustomSelect } from "./custom-select";
import { Label } from "./label";

interface DateSelectProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  /** 연도 범위 시작 (기본 1930) */
  yearFrom?: number;
  /** 연도 범위 끝 (기본 올해) */
  yearTo?: number;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function selectionFromValue(value: string) {
  const [year = 0, month = 0, day = 0] = value.split("-").map(part => Number(part) || 0);
  return { value, year, month, day };
}

export function DateSelect({
  id,
  label,
  value,
  onChange,
  required,
  yearFrom = 1930,
  yearTo = new Date().getFullYear(),
}: DateSelectProps) {
  const [draft, setDraft] = useState(() => selectionFromValue(value));
  const selection = draft.value === value ? draft : selectionFromValue(value);
  // Preserve partial choices, but immediately follow external edits/clears.
  if (draft.value !== value) setDraft(selection);
  const { year: selectedYear, month: selectedMonth, day: selectedDay } = selection;

  const yearOptions = useMemo(() => {
    const opts = [];
    for (let y = yearTo; y >= yearFrom; y--) {
      opts.push({ value: String(y), label: `${y}년` });
    }
    return opts;
  }, [yearFrom, yearTo]);

  const monthOptions = useMemo(() => {
    const opts = [];
    for (let m = 1; m <= 12; m++) {
      opts.push({ value: String(m), label: `${m}월` });
    }
    return opts;
  }, []);

  const dayOptions = useMemo(() => {
    const maxDay = selectedYear && selectedMonth ? getDaysInMonth(selectedYear, selectedMonth) : 31;
    const opts = [];
    for (let d = 1; d <= maxDay; d++) {
      opts.push({ value: String(d), label: `${d}일` });
    }
    return opts;
  }, [selectedYear, selectedMonth]);

  const update = (year: number, month: number, day: number) => {
    const safeDay = year && month ? Math.min(day, getDaysInMonth(year, month)) : day;
    const nextValue = year && month && safeDay
      ? `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`
      : "";
    setDraft({ value: nextValue, year, month, day: safeDay });
    onChange(nextValue);
  };

  return (
    <div id={id}>
      {label && <Label>{label}</Label>}
      <div className="grid grid-cols-[2fr_1fr_1fr] sm:grid-cols-3 gap-2">
        <CustomSelect
          value={selectedYear ? String(selectedYear) : ""}
          onChange={(v) => update(parseInt(v, 10), selectedMonth, selectedDay)}
          options={yearOptions}
          placeholder="년"
          required={required}
        />
        <CustomSelect
          value={selectedMonth ? String(selectedMonth) : ""}
          onChange={(v) => update(selectedYear, parseInt(v, 10), selectedDay)}
          options={monthOptions}
          placeholder="월"
          required={required}
        />
        <CustomSelect
          value={selectedDay ? String(selectedDay) : ""}
          onChange={(v) => update(selectedYear, selectedMonth, parseInt(v, 10))}
          options={dayOptions}
          placeholder="일"
          required={required}
        />
      </div>
    </div>
  );
}
