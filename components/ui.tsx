"use client";

import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

export function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx(
      "rounded-xl2 border border-line/70 bg-surface p-4 shadow-card",
      "ring-1 ring-inset ring-white/50",
      className
    )}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <h2 className="text-base font-bold tracking-tight text-ink">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="mb-6 pb-5 border-b-2 border-pine/20">
      <div className="flex items-center gap-2.5">
        <div className="h-7 w-1 flex-shrink-0 rounded-full bg-gradient-to-b from-pine-mid to-pine" />
        <h1 className="text-2xl font-extrabold tracking-tight text-pine-deep">{title}</h1>
      </div>
      {sub ? <p className="mt-1.5 pl-3.5 text-sm text-muted">{sub}</p> : null}
    </header>
  );
}

const buttonStyles = {
  primary:   "bg-gradient-to-b from-pine-mid to-pine text-white shadow-sm hover:from-pine hover:to-pine-deep active:shadow-none",
  secondary: "bg-pine-soft text-pine-deep border border-pine/20 hover:bg-pine/15",
  ghost:     "bg-transparent text-ink hover:bg-line/60 border border-line",
  danger:    "bg-clay/10 text-clay border border-clay/20 hover:bg-clay/20"
} as const;

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonStyles }) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine",
        "disabled:cursor-not-allowed disabled:opacity-50",
        buttonStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label-tick mb-1.5 block">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-faint">{hint}</span> : null}
    </label>
  );
}

const inputBase =
  "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-faint focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20 transition-colors";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(inputBase, props.className)} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(inputBase, "appearance-none", props.className)} {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(inputBase, "min-h-[84px]", props.className)} {...props} />;
}

export function Chip({
  active,
  onClick,
  children
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine",
        active
          ? "border-pine bg-pine text-white shadow-sm"
          : "border-line bg-surface text-muted hover:border-pine/40 hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}

const badgeTones = {
  pine:  "bg-pine-soft text-pine-deep border border-pine/20",
  amber: "bg-amber-soft text-amber-dark border border-amber/20",
  clay:  "bg-clay-soft text-clay-dark border border-clay/20",
  sea:   "bg-sea-soft text-sea-dark border border-sea/20",
  sage:  "bg-sage-soft text-sage-dark border border-sage/20",
  food:  "bg-food-soft text-food-dark border border-food/20",
  gray:  "bg-line/60 text-muted border border-line"
} as const;

export function Badge({ tone = "gray", children }: { tone?: keyof typeof badgeTones; children: ReactNode }) {
  return (
    <span className={cx(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
      badgeTones[tone]
    )}>
      {children}
    </span>
  );
}

export function flagTone(flag: string): keyof typeof badgeTones {
  if (flag === "high") return "clay";
  if (flag === "low") return "amber";
  if (flag === "normal") return "pine";
  return "gray";
}

const metricToneBg: Record<string, string> = {
  pine:  "bg-pine-soft border-pine/25",
  amber: "bg-amber-soft border-amber/25",
  clay:  "bg-clay-soft border-clay/25",
  sea:   "bg-sea-soft border-sea/25",
};

export function Metric({
  label,
  value,
  unit,
  sub,
  tone
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  tone?: "pine" | "amber" | "clay" | "sea";
}) {
  return (
    <Card className={cx("flex flex-col gap-1", tone && metricToneBg[tone])}>
      <span className="label-tick">{label}</span>
      <span className="readout text-2xl font-semibold leading-none">
        {value}
        {unit ? <span className="ml-1 text-sm font-medium text-faint">{unit}</span> : null}
      </span>
      {sub ? (
        <span className={cx(
          "text-xs",
          tone === "clay" ? "text-clay" :
          tone === "amber" ? "text-amber" :
          tone === "sea" ? "text-sea" :
          tone === "pine" ? "text-pine" :
          "text-muted"
        )}>
          {sub}
        </span>
      ) : null}
    </Card>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <Card className="flex flex-col items-start gap-2 border-dashed">
      <p className="font-bold text-ink">{title}</p>
      <p className="text-sm text-muted">{body}</p>
      {action}
    </Card>
  );
}

export function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
  );
}

export function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line/70 py-1.5 last:border-0">
      <span className="text-xs font-semibold text-faint">{k}</span>
      <span className="readout text-sm text-ink">{v}</span>
    </div>
  );
}
