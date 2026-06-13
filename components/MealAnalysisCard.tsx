"use client";

import type { MealAnalysis } from "@/lib/types";
import { Badge, Card, KV } from "./ui";

const heavinessTone = {
  light: "pine",
  moderate: "sea",
  heavy: "amber",
  "very heavy": "clay"
} as const;

export default function MealAnalysisCard({ analysis }: { analysis: MealAnalysis }) {
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={heavinessTone[analysis.heaviness]}>{analysis.heaviness}</Badge>
        <Badge tone="gray">confidence: {analysis.confidence}</Badge>
        {analysis.simulated && <Badge tone="sea">simulated</Badge>}
      </div>

      <div>
        <p className="label-tick mb-1">Foods detected</p>
        <p className="text-sm font-semibold">{analysis.foods.join(", ")}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          ["Calories", analysis.calories, "kcal"],
          ["Protein", analysis.protein, "g"],
          ["Carbs", analysis.carbs, "g"],
          ["Fat", analysis.fat, "g"],
          ["Fiber", analysis.fiber, "g"],
          ["Sodium", analysis.sodium, "mg"]
        ].map(([label, value, unit]) => (
          <div key={String(label)} className="rounded-xl bg-mist px-3 py-2">
            <p className="label-tick">{label}</p>
            <p className="readout text-lg font-semibold">
              {value}
              <span className="ml-0.5 text-[11px] font-medium text-faint">{unit}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-0.5">
        <KV k="Timing" v={<span className="font-sans font-medium">{analysis.timingNote}</span>} />
        <KV k="Goal fit" v={<span className="font-sans font-medium">{analysis.goalAlignment}</span>} />
      </div>

      <div className="rounded-xl bg-pine-soft p-3">
        <p className="label-tick mb-1 text-pine-deep">Better version</p>
        <p className="text-sm font-medium text-pine-deep">{analysis.betterVersion}</p>
      </div>
      <div>
        <p className="label-tick mb-1">One next move</p>
        <p className="text-sm font-semibold">{analysis.nextMove}</p>
      </div>
    </Card>
  );
}
