"use client";

import { useState } from "react";
import ImageDrop from "@/components/ImageDrop";
import ModePicker from "@/components/ModePicker";
import { Badge, Button, Card, EmptyState, flagTone, PageHeader, SectionTitle, Spinner } from "@/components/ui";
import { addInsight, addLab, removeLab, uid, useDB } from "@/lib/store";
import type { ExplainMode, LabAnalysis } from "@/lib/types";
import { fmtDateTime, todayISO } from "@/lib/utils";

function MarkerTable({ analysis }: { analysis: LabAnalysis }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-pine-soft p-3 text-sm font-medium leading-relaxed text-pine-deep">{analysis.summary}</div>
      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-mist text-left">
              <th className="label-tick px-3 py-2 font-semibold">Marker</th>
              <th className="label-tick px-3 py-2 font-semibold">Result</th>
              <th className="label-tick hidden px-3 py-2 font-semibold sm:table-cell">Range</th>
              <th className="label-tick px-3 py-2 font-semibold">Flag</th>
            </tr>
          </thead>
          <tbody>
            {analysis.markers.map((m) => (
              <>
                <tr
                  key={m.marker}
                  className="cursor-pointer border-t border-line hover:bg-mist/60"
                  onClick={() => setOpen(open === m.marker ? null : m.marker)}
                >
                  <td className="px-3 py-2.5 font-bold">{m.marker}</td>
                  <td className="readout px-3 py-2.5">{m.result} <span className="text-[11px] text-faint">{m.unit}</span></td>
                  <td className="readout hidden px-3 py-2.5 text-muted sm:table-cell">{m.referenceRange}</td>
                  <td className="px-3 py-2.5"><Badge tone={flagTone(m.flag)}>{m.flag}</Badge></td>
                </tr>
                {open === m.marker && (
                  <tr key={m.marker + "-detail"} className="border-t border-line bg-mist/40">
                    <td colSpan={4} className="space-y-2 px-3 py-3">
                      <p className="text-sm leading-relaxed">{m.explanation}</p>
                      <p className="text-sm leading-relaxed"><span className="font-bold">Why it matters for you: </span>{m.whyItMatters}</p>
                      {m.questions.length > 0 && (
                        <div>
                          <p className="label-tick mb-1">Questions to ask later</p>
                          <ul className="list-inside list-disc text-sm text-muted">
                            {m.questions.map((q) => <li key={q}>{q}</li>)}
                          </ul>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-faint">Tap a row to expand the explanation.</p>
    </div>
  );
}

export default function LabsPage() {
  const { db, ready } = useDB();
  const [photo, setPhoto] = useState<string>();
  const [mode, setMode] = useState<ExplainMode | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LabAnalysis>();

  if (!ready) return <PageHeader title="Lab Reports" />;
  const activeMode = mode ?? db.settings.defaultMode;

  async function analyze() {
    setBusy(true);
    try {
      const res = await fetch("/api/analyze-lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: photo, profile: db.profile, mode: activeMode })
      });
      setResult(await res.json());
    } finally {
      setBusy(false);
    }
  }

  function save() {
    if (!result) return;
    const id = uid();
    addLab({ id, date: todayISO(), photo, analysis: result });
    addInsight({
      id: uid(),
      date: todayISO(),
      type: "lab",
      summary: result.summary.slice(0, 160),
      related: result.markers.map((m) => `${m.marker} ${m.result}`).join(", "),
      full: result.markers.map((m) => `${m.marker}: ${m.result} ${m.unit} (${m.flag}). ${m.explanation} ${m.whyItMatters}`).join("\n\n")
    });
    setResult(undefined);
    setPhoto(undefined);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Lab Reports" sub="Upload a photo or screenshot of results and get every marker explained against your profile." />

      <ImageDrop value={photo} onChange={setPhoto} label="Upload a lab report image or screenshot" />
      <Card className="border-dashed">
        <p className="text-sm text-muted">
          <span className="font-bold text-ink">PDF upload is coming in V2.</span> For now, screenshot the PDF pages and upload them as images. Most phones can screenshot a PDF directly from the share sheet.
        </p>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button onClick={analyze} disabled={busy}>
          {busy ? <Spinner /> : null}
          {busy ? "Reading report" : "Analyze report"}
        </Button>
        <ModePicker compact value={activeMode} onChange={setMode} />
      </div>

      {result && (
        <section className="space-y-3">
          <SectionTitle action={result.simulated ? <Badge tone="sea">simulated</Badge> : undefined}>Marker breakdown</SectionTitle>
          <MarkerTable analysis={result} />
          <Button variant="secondary" onClick={save}>Save to insights</Button>
        </section>
      )}

      {db.labs.length === 0 ? (
        <EmptyState title="No saved reports" body="Analyzed reports you save will be listed here." />
      ) : (
        <section className="space-y-3">
          <SectionTitle>Saved reports</SectionTitle>
          {db.labs.map((lab) => (
            <Card key={lab.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-faint">{fmtDateTime(lab.date)}</span>
                <button onClick={() => removeLab(lab.id)} className="text-xs font-bold text-clay">Delete</button>
              </div>
              {lab.analysis && <MarkerTable analysis={lab.analysis} />}
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
