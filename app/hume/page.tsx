"use client";

import { useState } from "react";
import ImageDrop from "@/components/ImageDrop";
import { Badge, Button, Card, EmptyState, Field, Input, KV, PageHeader, SectionTitle, Spinner, Textarea } from "@/components/ui";
import { addHume, addInsight, removeHume, uid, useDB } from "@/lib/store";
import { fmtDateTime, todayISO } from "@/lib/utils";

interface Fields {
  weight: string; bodyFat: string; muscleMass: string; visceralFat: string; metabolicAge: string; hydration: string; notes: string;
}
const EMPTY: Fields = { weight: "", bodyFat: "", muscleMass: "", visceralFat: "", metabolicAge: "", hydration: "", notes: "" };

export default function HumePage() {
  const { db, ready } = useDB();
  const [photo, setPhoto] = useState<string>();
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [simulated, setSimulated] = useState(false);

  if (!ready) return <PageHeader title="Hume Scans" />;

  function set(key: keyof Fields, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }
  const n = (v: string) => {
    const x = parseFloat(v);
    return Number.isFinite(x) ? x : undefined;
  };

  async function extract() {
    setBusy(true);
    try {
      const res = await fetch("/api/analyze-hume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: photo })
      });
      const data = await res.json();
      setFields({
        weight: data.weight?.toString() ?? "",
        bodyFat: data.bodyFat?.toString() ?? "",
        muscleMass: data.muscleMass?.toString() ?? "",
        visceralFat: data.visceralFat?.toString() ?? "",
        metabolicAge: data.metabolicAge?.toString() ?? "",
        hydration: data.hydration?.toString() ?? "",
        notes: data.notes ?? ""
      });
      setSimulated(Boolean(data.simulated));
      setExtracted(true);
    } finally {
      setBusy(false);
    }
  }

  function save() {
    addHume({
      id: uid(),
      date: todayISO(),
      photo,
      weight: n(fields.weight),
      bodyFat: n(fields.bodyFat),
      muscleMass: n(fields.muscleMass),
      visceralFat: n(fields.visceralFat),
      metabolicAge: n(fields.metabolicAge),
      hydration: n(fields.hydration),
      notes: fields.notes || undefined,
      simulated
    });
    addInsight({
      id: uid(),
      date: todayISO(),
      type: "hume",
      summary: `Body scan saved${fields.bodyFat ? `: ${fields.bodyFat}% body fat` : ""}${fields.muscleMass ? `, ${fields.muscleMass} lb muscle` : ""}.`,
      related: "Hume scan",
      full: `Scan values: weight ${fields.weight || "?"} lb, body fat ${fields.bodyFat || "?"}%, muscle ${fields.muscleMass || "?"} lb, visceral fat ${fields.visceralFat || "?"}, metabolic age ${fields.metabolicAge || "?"}, hydration ${fields.hydration || "?"}%. ${fields.notes || ""}`
    });
    setPhoto(undefined);
    setFields(EMPTY);
    setExtracted(false);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Hume Scans" sub="Upload a scan screenshot. Extract the numbers or type them in." />

      <ImageDrop value={photo} onChange={setPhoto} label="Upload a Hume or body scan screenshot" />

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={extract} disabled={busy}>
          {busy ? <Spinner /> : null}
          {busy ? "Extracting" : "Extract from screenshot"}
        </Button>
        {extracted && simulated && <Badge tone="sea">simulated extraction</Badge>}
      </div>

      <Card className="space-y-4">
        <SectionTitle>Scan values</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Weight (lb)"><Input type="number" inputMode="decimal" value={fields.weight} onChange={(e) => set("weight", e.target.value)} /></Field>
          <Field label="Body fat (%)"><Input type="number" inputMode="decimal" value={fields.bodyFat} onChange={(e) => set("bodyFat", e.target.value)} /></Field>
          <Field label="Muscle mass (lb)"><Input type="number" inputMode="decimal" value={fields.muscleMass} onChange={(e) => set("muscleMass", e.target.value)} /></Field>
          <Field label="Visceral fat"><Input type="number" inputMode="decimal" value={fields.visceralFat} onChange={(e) => set("visceralFat", e.target.value)} /></Field>
          <Field label="Metabolic age"><Input type="number" inputMode="numeric" value={fields.metabolicAge} onChange={(e) => set("metabolicAge", e.target.value)} /></Field>
          <Field label="Hydration (%)"><Input type="number" inputMode="decimal" value={fields.hydration} onChange={(e) => set("hydration", e.target.value)} /></Field>
        </div>
        <Field label="Notes"><Textarea value={fields.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Morning scan, fasted" /></Field>
        <Button onClick={save}>Save scan</Button>
      </Card>

      {db.hume.length === 0 ? (
        <EmptyState title="No scans yet" body="Your saved scans will show here so you can compare over time." />
      ) : (
        <section className="space-y-3">
          <SectionTitle>Scan history</SectionTitle>
          {db.hume.map((h) => (
            <Card key={h.id}>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-faint">{fmtDateTime(h.date)}</span>
                  {h.simulated && <Badge tone="sea">simulated</Badge>}
                </div>
                <button onClick={() => removeHume(h.id)} className="text-xs font-bold text-clay">Delete</button>
              </div>
              <div>
                {h.weight != null && <KV k="Weight" v={`${h.weight} lb`} />}
                {h.bodyFat != null && <KV k="Body fat" v={`${h.bodyFat} %`} />}
                {h.muscleMass != null && <KV k="Muscle mass" v={`${h.muscleMass} lb`} />}
                {h.visceralFat != null && <KV k="Visceral fat" v={h.visceralFat} />}
                {h.metabolicAge != null && <KV k="Metabolic age" v={`${h.metabolicAge} yr`} />}
                {h.hydration != null && <KV k="Hydration" v={`${h.hydration} %`} />}
              </div>
              {h.notes && <p className="mt-2 text-xs text-muted">{h.notes}</p>}
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
