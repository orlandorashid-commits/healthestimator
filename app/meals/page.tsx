"use client";

import { useState } from "react";
import Link from "next/link";
import MealAnalysisCard from "@/components/MealAnalysisCard";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { removeMeal, useDB } from "@/lib/store";
import { fmtDateTime } from "@/lib/utils";

export default function MealsPage() {
  const { db, ready } = useDB();
  const [openId, setOpenId] = useState<string | null>(null);

  if (!ready) return <PageHeader title="Meal Analysis" />;

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader title="Meal Analysis" sub="Every logged meal and what the AI made of it." />

      {db.meals.length === 0 && (
        <EmptyState
          title="No meals logged yet"
          body="Photograph a meal and the analysis will land here."
          action={<Link href="/food"><Button>Log a meal</Button></Link>}
        />
      )}

      <div className="space-y-3">
        {db.meals.map((meal) => {
          const open = openId === meal.id;
          return (
            <Card key={meal.id} className="space-y-3">
              <button className="flex w-full items-center gap-3 text-left" onClick={() => setOpenId(open ? null : meal.id)}>
                {meal.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={meal.photo} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-mist text-xl">🍽</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold capitalize">{meal.mealType}</span>
                    <span className="text-xs text-faint">{fmtDateTime(meal.createdAt)} at {meal.timeEaten}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted">
                    {meal.analysis ? `${meal.analysis.calories} kcal, ${meal.analysis.protein} g protein` : "Not analyzed"}
                    {" "}({meal.amountEaten === "custom" ? `${meal.customPercent ?? 100}% eaten` : `${meal.amountEaten} eaten`})
                  </span>
                </span>
                {meal.analysis && <Badge tone={meal.analysis.heaviness === "light" ? "pine" : meal.analysis.heaviness === "moderate" ? "sea" : meal.analysis.heaviness === "heavy" ? "amber" : "clay"}>{meal.analysis.heaviness}</Badge>}
              </button>

              {open && (
                <div className="space-y-3 border-t border-line pt-3">
                  <div className="flex flex-wrap gap-2 text-xs text-muted">
                    <span>Hunger before: <span className="readout">{meal.hungerBefore}/10</span></span>
                    <span>Fullness after: <span className="readout">{meal.fullnessAfter}/10</span></span>
                  </div>
                  {meal.notes && <p className="text-sm text-muted">Notes: {meal.notes}</p>}
                  {meal.analysis ? <MealAnalysisCard analysis={meal.analysis} /> : <p className="text-sm text-muted">This meal was saved without an estimate.</p>}
                  {meal.advice && (
                    <div className="rounded-xl bg-mist p-3">
                      <p className="label-tick mb-1">Saved advice</p>
                      <p className="whitespace-pre-line text-sm leading-relaxed">{meal.advice}</p>
                    </div>
                  )}
                  <Button variant="danger" onClick={() => removeMeal(meal.id)}>Delete entry</Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
