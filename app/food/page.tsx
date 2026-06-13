"use client";

import { useState } from "react";
import Link from "next/link";
import ImageDrop from "@/components/ImageDrop";
import MealAnalysisCard from "@/components/MealAnalysisCard";
import ModePicker from "@/components/ModePicker";
import { Button, Card, Chip, Field, Input, PageHeader, SectionTitle, Spinner, Textarea } from "@/components/ui";
import { addInsight, addMeal, uid, useDB } from "@/lib/store";
import type { AmountEaten, ExplainMode, MealAnalysis, MealType } from "@/lib/types";
import { amountFactor, todayISO } from "@/lib/utils";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack", "late meal"];
const AMOUNTS: AmountEaten[] = ["all", "three quarters", "half", "quarter", "custom"];

function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function FoodPage() {
  const { db, ready } = useDB();
  const [photo, setPhoto] = useState<string>();
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [timeEaten, setTimeEaten] = useState(nowTime());
  const [amount, setAmount] = useState<AmountEaten>("all");
  const [customPercent, setCustomPercent] = useState(60);
  const [hunger, setHunger] = useState(5);
  const [fullness, setFullness] = useState(7);
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState<ExplainMode | null>(null);

  const [analysis, setAnalysis] = useState<MealAnalysis>();
  const [advice, setAdvice] = useState<string>();
  const [busy, setBusy] = useState<"estimate" | "advice" | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  if (!ready) return <PageHeader title="Food Photo Log" />;
  const activeMode = mode ?? db.settings.defaultMode;

  async function estimate() {
    setBusy("estimate");
    try {
      const res = await fetch("/api/analyze-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl: photo,
          mealType,
          timeEaten,
          amountFactor: amountFactor(amount, customPercent),
          hungerBefore: hunger,
          fullnessAfter: fullness,
          notes,
          profile: db.profile,
          mode: activeMode
        })
      });
      setAnalysis(await res.json());
    } catch {
      setAdvice("Could not reach the analysis route. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function getAdvice() {
    setBusy("advice");
    try {
      const res = await fetch("/api/ask-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `Give me practical advice about this meal: ${mealType} at ${timeEaten}, ate ${amount}${amount === "custom" ? ` (${customPercent} percent)` : ""}. Notes: ${notes || "none"}. ${analysis ? `Estimated: ${JSON.stringify(analysis)}` : ""}`,
          profile: db.profile,
          mode: activeMode
        })
      });
      const data = await res.json();
      setAdvice(data.full);
    } catch {
      setAdvice("Could not reach the advice route. Try again.");
    } finally {
      setBusy(null);
    }
  }

  function saveMeal() {
    const id = uid();
    addMeal({
      id,
      createdAt: todayISO(),
      photo,
      mealType,
      timeEaten,
      amountEaten: amount,
      customPercent: amount === "custom" ? customPercent : undefined,
      hungerBefore: hunger,
      fullnessAfter: fullness,
      notes: notes || undefined,
      analysis,
      advice
    });
    if (analysis) {
      addInsight({
        id: uid(),
        date: todayISO(),
        type: "meal",
        summary: `${mealType} at ${timeEaten}: about ${analysis.calories} kcal, ${analysis.protein} g protein, ${analysis.heaviness}.`,
        related: analysis.foods.join(", "),
        full: [analysis.timingNote, analysis.goalAlignment, `Better version: ${analysis.betterVersion}`, `Next move: ${analysis.nextMove}`].join("\n\n")
      });
    }
    setSavedId(id);
  }

  function resetForm() {
    setPhoto(undefined);
    setAnalysis(undefined);
    setAdvice(undefined);
    setNotes("");
    setSavedId(null);
    setTimeEaten(nowTime());
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Food Photo Log" sub="Log first, judge never. Estimates and advice are separate buttons for a reason." />

      <ImageDrop value={photo} onChange={setPhoto} label="Snap or upload your meal" />

      <Card className="space-y-5">
        <Field label="Meal type">
          <div className="flex flex-wrap gap-2">
            {MEAL_TYPES.map((t) => (
              <Chip key={t} active={mealType === t} onClick={() => setMealType(t)}>{t}</Chip>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Time eaten">
            <Input type="time" value={timeEaten} onChange={(e) => setTimeEaten(e.target.value)} />
          </Field>
          {amount === "custom" && (
            <Field label="Percent eaten">
              <Input type="number" inputMode="numeric" min={5} max={150} value={customPercent} onChange={(e) => setCustomPercent(parseInt(e.target.value) || 100)} />
            </Field>
          )}
        </div>

        <Field label="Amount eaten">
          <div className="flex flex-wrap gap-2">
            {AMOUNTS.map((a) => (
              <Chip key={a} active={amount === a} onClick={() => setAmount(a)}>{a === "custom" ? "custom percent" : a}</Chip>
            ))}
          </div>
        </Field>

        <Field label={`Hunger before: ${hunger} / 10`}>
          <input type="range" min={1} max={10} value={hunger} onChange={(e) => setHunger(+e.target.value)} />
        </Field>
        <Field label={`Fullness after: ${fullness} / 10`}>
          <input type="range" min={1} max={10} value={fullness} onChange={(e) => setFullness(+e.target.value)} />
        </Field>

        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Restaurant portion, shared the fries" />
        </Field>

        <div className="flex items-center justify-between">
          <span className="label-tick">Explain in</span>
          <ModePicker compact value={activeMode} onChange={setMode} />
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={estimate} disabled={busy !== null}>
          {busy === "estimate" ? <Spinner /> : null}
          {busy === "estimate" ? "Estimating" : "Estimate meal"}
        </Button>
        <Button variant="secondary" onClick={getAdvice} disabled={busy !== null}>
          {busy === "advice" ? "Thinking" : "Give me advice"}
        </Button>
        <Button variant="ghost" onClick={saveMeal} disabled={savedId !== null}>
          {savedId ? "Saved" : "Save meal"}
        </Button>
      </div>

      {analysis && (
        <section className="space-y-3">
          <SectionTitle>Estimate</SectionTitle>
          <MealAnalysisCard analysis={analysis} />
        </section>
      )}

      {advice && (
        <Card>
          <SectionTitle>Advice</SectionTitle>
          <p className="whitespace-pre-line text-sm leading-relaxed">{advice}</p>
        </Card>
      )}

      {savedId && (
        <Card className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">Meal saved to your log.</p>
          <div className="flex gap-2">
            <Link href="/meals"><Button variant="secondary">View log</Button></Link>
            <Button variant="ghost" onClick={resetForm}>Log another</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
