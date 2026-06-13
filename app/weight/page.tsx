"use client";

import { useState } from "react";
import Sparkline from "@/components/Sparkline";
import { Button, Card, EmptyState, Field, Input, Metric, PageHeader, SectionTitle } from "@/components/ui";
import { addWeight, removeWeight, uid, useDB } from "@/lib/store";
import { fmtDateTime } from "@/lib/utils";

function localNow(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function WeightPage() {
  const { db, ready } = useDB();
  const [weight, setWeight] = useState("");
  const [when, setWhen] = useState(localNow());
  const [note, setNote] = useState("");

  if (!ready) return <PageHeader title="Weight Log" />;

  const weights = db.weights;
  const current = weights.length ? weights[weights.length - 1] : null;
  const previous = weights.length > 1 ? weights[weights.length - 2] : null;
  const goal = db.goals.targetWeight ?? db.profile.goalWeight;
  const change = current && previous ? +(current.weight - previous.weight).toFixed(1) : null;

  const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
  const last7 = weights.filter((w) => new Date(w.date).getTime() >= cutoff);
  const avg7 = last7.length >= 3 ? +(last7.reduce((s, w) => s + w.weight, 0) / last7.length).toFixed(1) : null;
  const distance = current && goal != null ? +(current.weight - goal).toFixed(1) : null;

  function save() {
    const w = parseFloat(weight);
    if (!Number.isFinite(w) || w <= 0) return;
    addWeight({ id: uid(), date: new Date(when).toISOString(), weight: w, note: note || undefined });
    setWeight("");
    setNote("");
    setWhen(localNow());
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Weight Log" sub="Single weigh-ins lie. Averages tell the truth." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric label="Current weight" value={current?.weight ?? "--"} unit="lb" sub={current ? fmtDateTime(current.date) : undefined} />
        <Metric label="Goal weight" value={goal ?? "--"} unit="lb" />
        <Metric
          label="Change since last"
          value={change != null ? (change > 0 ? `+${change}` : change) : "--"}
          unit={change != null ? "lb" : undefined}
          tone={change != null && change < 0 ? "pine" : undefined}
        />
        <Metric label="7-day average" value={avg7 ?? "--"} unit={avg7 != null ? "lb" : undefined} sub={avg7 == null ? "Needs 3+ entries this week" : `${last7.length} entries`} />
        <Metric label="Distance from goal" value={distance ?? "--"} unit={distance != null ? "lb" : undefined} tone="pine" />
      </div>

      {weights.length >= 2 && (
        <Card>
          <SectionTitle>Trend, last {Math.min(weights.length, 30)} entries</SectionTitle>
          <Sparkline values={weights.slice(-30).map((w) => w.weight)} />
        </Card>
      )}

      <Card className="space-y-4">
        <SectionTitle>New entry</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Weight (lb)">
            <Input type="number" inputMode="decimal" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="211.4" />
          </Field>
          <Field label="Date and time">
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </Field>
        </div>
        <Field label="Note">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="After morning walk" />
        </Field>
        <Button onClick={save} disabled={!weight}>Save weight</Button>
      </Card>

      {weights.length === 0 ? (
        <EmptyState title="No entries yet" body="Add your first weigh-in above to start the trend." />
      ) : (
        <Card>
          <SectionTitle>History</SectionTitle>
          <ul className="divide-y divide-line">
            {[...weights].reverse().map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <span className="readout text-base font-semibold">{w.weight} lb</span>
                  <span className="ml-2 text-xs text-faint">{fmtDateTime(w.date)}</span>
                  {w.note && <span className="ml-2 text-xs text-muted">{w.note}</span>}
                </div>
                <button onClick={() => removeWeight(w.id)} className="text-xs font-bold text-clay">Delete</button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
