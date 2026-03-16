"use client";

import { INTEREST_OPTIONS } from "@/lib/fortune/types";

interface InterestSelectorProps {
  selected: string[];
  onChange: (interests: string[]) => void;
  maxSelection?: number;
}

export function InterestSelector({
  selected,
  onChange,
  maxSelection = 3,
}: InterestSelectorProps) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else if (selected.length < maxSelection) {
      onChange([...selected, value]);
    }
  };

  return (
    <div>
      <p className="mb-1 text-sm font-medium text-zinc-900">
        지금 가장 궁금한 건 뭐예요?
      </p>
      <p className="mb-3 text-xs text-zinc-500">
        최대 {maxSelection}개까지 선택할 수 있어요.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {INTEREST_OPTIONS.map((opt) => {
          const isSelected = selected.includes(opt.value);
          const isDisabled = !isSelected && selected.length >= maxSelection;
          return (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors select-none ${
                isSelected
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : isDisabled
                    ? "cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-300"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => toggle(opt.value)}
                className="sr-only"
              />
              <span>{opt.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
