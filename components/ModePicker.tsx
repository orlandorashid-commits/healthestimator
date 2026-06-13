"use client";

import type { ExplainMode } from "@/lib/types";
import { cx } from "./ui";

const MODES: Array<{ value: ExplainMode; label: string; hint: string }> = [
  { value: "baby", label: "Baby", hint: "Brand new" },
  { value: "normal", label: "Normal", hint: "Learning adult" },
  { value: "nerd", label: "Nerd", hint: "Knows basics" }
];

export default function ModePicker({
  value,
  onChange,
  compact
}: {
  value: ExplainMode;
  onChange: (mode: ExplainMode) => void;
  compact?: boolean;
}) {
  return (
    <div className="inline-flex rounded-full border border-line bg-surface p-1" role="radiogroup" aria-label="Explanation mode">
      {MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          role="radio"
          aria-checked={value === m.value}
          onClick={() => onChange(m.value)}
          className={cx(
            "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
            value === m.value ? "bg-pine text-white" : "text-muted hover:text-ink"
          )}
        >
          {m.label}
          {!compact && <span className="ml-1 hidden font-medium opacity-70 sm:inline">{m.hint}</span>}
        </button>
      ))}
    </div>
  );
}
