"use client";

import { useState } from "react";
import { Badge, Card, Chip, EmptyState, PageHeader } from "@/components/ui";
import { removeInsight, useDB } from "@/lib/store";
import type { InsightType } from "@/lib/types";
import { fmtDateTime } from "@/lib/utils";

const TYPES: Array<{ value: InsightType | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "meal", label: "Meal" },
  { value: "lab", label: "Lab" },
  { value: "hume", label: "Hume" },
  { value: "blood pressure", label: "Blood pressure" },
  { value: "weight", label: "Weight" },
  { value: "reflection", label: "Reflection" }
];

const toneFor: Record<InsightType, "pine" | "amber" | "clay" | "sea" | "gray"> = {
  meal: "pine",
  lab: "clay",
  hume: "sea",
  "blood pressure": "amber",
  weight: "pine",
  reflection: "gray"
};

export default function InsightsPage() {
  const { db, ready } = useDB();
  const [filter, setFilter] = useState<InsightType | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  if (!ready) return <PageHeader title="Saved Insights" />;

  const insights = db.insights.filter((i) => filter === "all" || i.type === filter);

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader title="Saved Insights" sub="Everything the AI has told you, kept in one place." />

      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <Chip key={t.value} active={filter === t.value} onClick={() => setFilter(t.value)}>{t.label}</Chip>
        ))}
      </div>

      {insights.length === 0 ? (
        <EmptyState title="Nothing here yet" body="Run an analysis on a meal, lab, or scan and save the result. It will collect here." />
      ) : (
        <div className="space-y-3">
          {insights.map((i) => {
            const open = openId === i.id;
            return (
              <Card key={i.id} className="space-y-2">
                <button className="w-full text-left" onClick={() => setOpenId(open ? null : i.id)}>
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <Badge tone={toneFor[i.type]}>{i.type}</Badge>
                    <span className="text-xs text-faint">{fmtDateTime(i.date)}</span>
                  </div>
                  <p className="text-sm font-bold leading-snug">{i.summary}</p>
                </button>
                {open && (
                  <div className="space-y-2 border-t border-line pt-2">
                    {i.related && <p className="text-xs text-muted">Related: {i.related}</p>}
                    <p className="whitespace-pre-line text-sm leading-relaxed">{i.full}</p>
                    <button onClick={() => removeInsight(i.id)} className="text-xs font-bold text-clay">Delete insight</button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
