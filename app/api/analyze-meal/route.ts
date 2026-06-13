import { NextResponse } from "next/server";
import { MealAnalysisSchema } from "@/lib/schemas";
import { callJSON, hasKey, modelFor, modeRules, profileContext, toneRules } from "@/lib/ai";
import { simulateMeal } from "@/lib/sim";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { imageDataUrl, mealType, timeEaten, amountFactor, hungerBefore, fullnessAfter, notes, profile, mode } = body;

  if (!hasKey() || !imageDataUrl) {
    return NextResponse.json(simulateMeal({ mealType, timeEaten, amountFactor, profile }));
  }

  try {
    const prompt = [
      "Analyze this meal photo and estimate nutrition for the amount actually eaten.",
      `Meal type: ${mealType || "unknown"}. Time eaten: ${timeEaten || "unknown"}.`,
      `Fraction of the plate eaten: ${Math.round((amountFactor ?? 1) * 100)} percent. Scale all estimates by this fraction.`,
      `Hunger before: ${hungerBefore ?? "?"}/10. Fullness after: ${fullnessAfter ?? "?"}/10. User notes: ${notes || "none"}.`,
      `User profile: ${profileContext(profile)}`,
      modeRules(mode || "normal"),
      "Judge timing and goal alignment against the profile. A heavy meal late in the evening matters for a weight loss goal, but never shame the user.",
      "Return JSON with exactly these keys: foods (string array), calories, protein, carbs, fat, fiber, sodium (all numbers, sodium in mg, others in kcal or grams), confidence ('low'|'medium'|'high'), heaviness ('light'|'moderate'|'heavy'|'very heavy'), timingNote, goalAlignment, betterVersion, nextMove (all strings)."
    ].join("\n");

    const raw = await callJSON({
      model: modelFor("efficient"),
      system: "You are a careful nutrition estimator inside a private personal health app. " + toneRules(),
      prompt,
      imageDataUrl
    });
    const parsed = MealAnalysisSchema.parse(raw);
    return NextResponse.json({ ...parsed, simulated: false });
  } catch (err) {
    console.error("analyze-meal failed, falling back to simulation:", err);
    return NextResponse.json(simulateMeal({ mealType, timeEaten, amountFactor, profile }));
  }
}
