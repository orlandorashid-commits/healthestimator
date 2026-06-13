"use client";

import { useState } from "react";
import { Button, Card, Chip, EmptyState, Field, Input, Metric, PageHeader, SectionTitle, Textarea } from "@/components/ui";
import { addBP, removeBP, uid, useDB } from "@/lib/store";
import type { BeforeAfter } from "@/lib/types";
import { fmtDateTime } from "@/lib/utils";

const BA: BeforeAfter[] = ["before", "after", "not relevant"];

function localNow(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function BASelect({ label, value, onChange }: { label: string; value: BeforeAfter; onChange: (v: BeforeAfter) => void }) {
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-2">
        {BA.map((v) => (
          <Chip key={v} active={value === v} onClick={() => onChange(v)}>{v}</Chip>
        ))}
      </div>
    </Field>
  );
}

export default function BPPage() {
  const { db, ready } = useDB();
  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [pulse, setPulse] = useState("");
  const [when, setWhen] = useState(localNow());
  const [food, setFood] = useState<BeforeAfter>("before");
  const [caffeine, setCaffeine] = useState<BeforeAfter>("before");
  const [exercise, setExercise] = useState<BeforeAfter>("not relevant");
  const [stress, setStress] = useState(3);
  const [medTiming, setMedTiming] = useState("");
  const [notes, setNotes] = useState("");

  if (!ready) return <PageHeader title="Blood Pressure Log" />;

  const bps = db.bps;
  const latest = bps[0];
  const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
  const last7 = bps.filter((b) => new Date(b.date).getTime() >= cutoff);
  const avg7 =
    last7.length >= 3
      ? {
          sys: Math.round(last7.reduce((s, b) => s + b.systolic, 0) / last7.length),
          dia: Math.round(last7.reduce((s, b) => s + b.diastolic, 0) / last7.length)
        }
      : null;

  const morning = bps.filter((b) => new Date(b.date).getHours() < 12);
  const evening = bps.filter((b) => new Date(b.date).getHours() >= 17);
  const pattern =
    morning.length >= 2 && evening.length >= 2
      ? {
          m: Math.round(morning.reduce((s, b) => s + b.systolic, 0) / morning.length),
          e: Math.round(evening.reduce((s, b) => s + b.systolic, 0) / evening.length)
        }
      : null;

  function save() {
    const s = parseInt(sys), d = parseInt(dia);
    if (!Number.isFinite(s) || !Number.isFinite(d)) return;
    addBP({
      id: uid(),
      date: new Date(when).toISOString(),
      systolic: s,
      diastolic: d,
      pulse: parseInt(pulse) || undefined,
      food, caffeine, exercise,
      stress,
      medicationTiming: medTiming || undefined,
      notes: notes || undefined
    });
    setSys(""); setDia(""); setPulse(""); setNotes(""); setMedTiming("");
    setWhen(localNow());
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Blood Pressure Log" sub="Context turns a number into a pattern. Log what was around the reading." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric label="Latest reading" value={latest ? `${latest.systolic}/${latest.diastolic}` : "--"} sub={latest ? fmtDateTime(latest.date) : "No readings yet"} />
        <Metric label="7-day average" value={avg7 ? `${avg7.sys}/${avg7.dia}` : "--"} sub={avg7 ? `${last7.length} readings` : "Needs 3+ readings this week"} />
        <Metric
          label="Morning vs evening"
          value={pattern ? `${pattern.m} / ${pattern.e}` : "--"}
          sub={pattern ? "Avg systolic, AM vs PM" : "Needs 2+ readings in each"}
          tone="sea"
        />
      </div>

      <Card className="space-y-4">
        <SectionTitle>New reading</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Systolic">
            <Input type="number" inputMode="numeric" value={sys} onChange={(e) => setSys(e.target.value)} placeholder="128" />
          </Field>
          <Field label="Diastolic">
            <Input type="number" inputMode="numeric" value={dia} onChange={(e) => setDia(e.target.value)} placeholder="82" />
          </Field>
          <Field label="Pulse">
            <Input type="number" inputMode="numeric" value={pulse} onChange={(e) => setPulse(e.target.value)} placeholder="70" />
          </Field>
        </div>
        <Field label="Time">
          <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </Field>
        <BASelect label="Food" value={food} onChange={setFood} />
        <BASelect label="Caffeine" value={caffeine} onChange={setCaffeine} />
        <BASelect label="Exercise" value={exercise} onChange={setExercise} />
        <Field label={`Stress level: ${stress} / 10`}>
          <input type="range" min={1} max={10} value={stress} onChange={(e) => setStress(+e.target.value)} />
        </Field>
        <Field label="Medication timing">
          <Input value={medTiming} onChange={(e) => setMedTiming(e.target.value)} placeholder="Took lisinopril 2 hours before" />
        </Field>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sat quietly for 5 minutes first" />
        </Field>
        <Button onClick={save} disabled={!sys || !dia}>Save reading</Button>
      </Card>

      {bps.length === 0 ? (
        <EmptyState title="No readings yet" body="Log your first reading above. Two readings a day for a week builds a real picture." />
      ) : (
        <Card>
          <SectionTitle>History</SectionTitle>
          <ul className="divide-y divide-line">
            {bps.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <span className="readout text-base font-semibold">{b.systolic}/{b.diastolic}</span>
                  {b.pulse ? <span className="readout ml-2 text-xs text-muted">{b.pulse} bpm</span> : null}
                  <span className="ml-2 text-xs text-faint">{fmtDateTime(b.date)}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted">
                    food {b.food}, caffeine {b.caffeine}, exercise {b.exercise}, stress {b.stress ?? "?"}/10
                    {b.notes ? `, ${b.notes}` : ""}
                  </span>
                </div>
                <button onClick={() => removeBP(b.id)} className="shrink-0 text-xs font-bold text-clay">Delete</button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
