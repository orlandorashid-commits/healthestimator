"use client";

import { useEffect, useState } from "react";
import { Button, Card, Field, Input, PageHeader, SectionTitle, cx } from "@/components/ui";
import { setGoals, useDB } from "@/lib/store";
import type { Goals } from "@/lib/types";

const EXPERIMENTS = [
  { name: "Late Dinner Reduction", desc: "Move the last meal earlier and keep evenings lighter." },
  { name: "Mediterranean Reset", desc: "Olive oil, fish, vegetables, legumes, and whole grains as the default." },
  { name: "Plant-Forward High-Protein", desc: "Plants carry the plate, protein still hits the target." },
  { name: "Low-Glycemic Reset", desc: "Fewer refined carbs, steadier energy, calmer glucose." },
  { name: "Two-Meal Weight Loss", desc: "Two solid meals a day inside a clear eating window." },
  { name: "High-Protein Muscle Support", desc: "Protein at every meal to protect muscle while losing fat." },
  { name: "Whole-Food Reset", desc: "If it comes in a wrapper with a mascot, it waits." }
];

export default function GoalsPage() {
  const { db, ready } = useDB();
  const [form, setForm] = useState<Goals>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (ready) setForm(db.goals);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!ready) return <PageHeader title="Goals" />;

  function set<K extends keyof Goals>(key: K, value: Goals[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }
  const num = (v: string) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : undefined;
  };

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Goals" sub="Targets give the AI something concrete to coach against." />

      <Card className="space-y-4">
        <SectionTitle>Targets</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Target weight (lb)">
            <Input type="number" inputMode="decimal" value={form.targetWeight ?? ""} onChange={(e) => set("targetWeight", num(e.target.value))} />
          </Field>
          <Field label="Weekly calorie target">
            <Input type="number" inputMode="numeric" value={form.weeklyCalorieTarget ?? ""} onChange={(e) => set("weeklyCalorieTarget", num(e.target.value))} />
          </Field>
          <Field label="Daily protein target (g)">
            <Input type="number" inputMode="numeric" value={form.proteinTarget ?? ""} onChange={(e) => set("proteinTarget", num(e.target.value))} />
          </Field>
        </div>
        <Field label="Meal timing goal">
          <Input value={form.mealTimingGoal ?? ""} onChange={(e) => set("mealTimingGoal", e.target.value)} placeholder="Last meal by 8 PM on weekdays" />
        </Field>
        <Field label="Blood pressure goal">
          <Input value={form.bloodPressureGoal ?? ""} onChange={(e) => set("bloodPressureGoal", e.target.value)} placeholder="Average under 130/85" />
        </Field>
        <Field label="Sleep goal">
          <Input value={form.sleepGoal ?? ""} onChange={(e) => set("sleepGoal", e.target.value)} placeholder="In bed by 11 PM" />
        </Field>
      </Card>

      <section>
        <SectionTitle>Active lifestyle experiment</SectionTitle>
        <p className="mb-3 text-sm text-muted">Pick one at a time. Experiments are tests, not vows.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {EXPERIMENTS.map((exp) => {
            const active = form.experiment === exp.name;
            return (
              <button
                key={exp.name}
                type="button"
                onClick={() => set("experiment", active ? undefined : exp.name)}
                className={cx(
                  "rounded-xl2 border p-4 text-left transition-colors",
                  active ? "border-pine bg-pine-soft" : "border-line bg-surface hover:border-pine/40"
                )}
              >
                <p className={cx("text-sm font-bold", active && "text-pine-deep")}>{exp.name}</p>
                <p className="mt-1 text-xs text-muted">{exp.desc}</p>
                {active && <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-pine">Active</p>}
              </button>
            );
          })}
        </div>
      </section>

      <Button
        className="w-full"
        onClick={() => {
          setGoals(form);
          setSaved(true);
        }}
      >
        {saved ? "Goals saved" : "Save goals"}
      </Button>
    </div>
  );
}
