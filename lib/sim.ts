import type { ExplainMode, Heaviness, Profile } from "./types";
import type { HumeAnalysisOut, LabAnalysisOut, MealAnalysisOut } from "./schemas";

/* Deterministic-ish simulated analysis so the whole UI works without a key. */

function pick<T>(arr: T[], salt: number): T {
  return arr[salt % arr.length];
}

function hourOf(time?: string): number {
  if (!time) return new Date().getHours();
  const h = parseInt(time.split(":")[0] ?? "", 10);
  return Number.isFinite(h) ? h : new Date().getHours();
}

export function simulateMeal(input: {
  mealType?: string;
  timeEaten?: string;
  amountFactor?: number;
  profile?: Profile;
}): MealAnalysisOut & { simulated: true } {
  const salt = Date.now() % 7;
  const hour = hourOf(input.timeEaten);
  const late = hour >= 20 || input.mealType === "late meal";
  const base = pick(
    [
      { foods: ["Grilled chicken breast", "White rice", "Roasted broccoli"], cal: 650, p: 48, c: 64, f: 16, fib: 6, na: 780 },
      { foods: ["Beef and bean burrito", "Tortilla chips", "Salsa"], cal: 920, p: 38, c: 96, f: 38, fib: 11, na: 1450 },
      { foods: ["Salmon fillet", "Quinoa", "Mixed greens with olive oil"], cal: 580, p: 41, c: 38, f: 26, fib: 7, na: 520 },
      { foods: ["Cheeseburger", "French fries"], cal: 1080, p: 36, c: 92, f: 56, fib: 5, na: 1380 },
      { foods: ["Greek yogurt", "Berries", "Granola"], cal: 380, p: 24, c: 48, f: 10, fib: 5, na: 140 }
    ],
    salt
  );
  const factor = input.amountFactor ?? 1;
  const cal = Math.round(base.cal * factor);
  const heaviness: Heaviness =
    cal < 450 ? "light" : cal < 750 ? "moderate" : cal < 1000 ? "heavy" : "very heavy";
  const wantsLoss = (input.profile?.mainGoals ?? []).some((g) => g.toLowerCase().includes("weight") || g.toLowerCase().includes("190"));
  const timingNote = late
    ? heaviness === "light" || heaviness === "moderate"
      ? "Eating at this hour is fine when the meal stays this size."
      : "This is heavier than ideal for a late meal. It works better earlier in the day."
    : "This time slot fits your usual eating window.";
  const goalAlignment = wantsLoss
    ? heaviness === "heavy" || heaviness === "very heavy"
      ? "Heavier than your weight loss target needs, but not a problem if it is occasional. The pattern matters more than one meal."
      : "This fits a weight loss phase. Protein is doing real work here."
    : "Reasonable balance for your stated goals.";
  return {
    foods: base.foods,
    calories: cal,
    protein: Math.round(base.p * factor),
    carbs: Math.round(base.c * factor),
    fat: Math.round(base.f * factor),
    fiber: Math.round(base.fib * factor),
    sodium: Math.round(base.na * factor),
    confidence: "medium",
    heaviness,
    timingNote,
    goalAlignment,
    betterVersion: "Keep the protein, reduce the starch portion by a third, add vegetables, and move it earlier when possible.",
    nextMove: late
      ? "Tomorrow, try moving a meal like this to lunch and keep dinner lighter."
      : "Keep dinner lighter than this meal and stop eating by your usual cutoff.",
    simulated: true
  };
}

export function simulateHume(): HumeAnalysisOut & { simulated: true } {
  return {
    weight: 212.6,
    bodyFat: 27.4,
    muscleMass: 84.9,
    visceralFat: 11,
    metabolicAge: 48,
    hydration: 52.4,
    notes: "Simulated extraction. Connect an API key to read real screenshots.",
    simulated: true
  };
}

function modeText(mode: ExplainMode, baby: string, normal: string, nerd: string): string {
  return mode === "baby" ? baby : mode === "nerd" ? nerd : normal;
}

export function simulateLab(mode: ExplainMode): LabAnalysisOut & { simulated: true } {
  const markers = [
    {
      marker: "Total Cholesterol", result: "212", unit: "mg/dL", referenceRange: "Under 200", flag: "high" as const,
      explanation: modeText(mode,
        "This counts all the cholesterol in your blood. Yours is a little above the usual target.",
        "Total cholesterol sums LDL, HDL, and a slice of triglycerides. Yours is mildly elevated, which is common and very movable with diet.",
        "Total-C of 212 is mildly elevated. On its own it is a blunt marker. The LDL and the HDL ratio below tell you more."),
      whyItMatters: "You listed blood pressure and weight goals. Cholesterol and those goals respond to the same habits, so progress compounds.",
      questions: ["Should I get a follow up lipid panel in 3 months?", "Is an ApoB test worth adding?"]
    },
    {
      marker: "LDL Cholesterol", result: "138", unit: "mg/dL", referenceRange: "Under 100", flag: "high" as const,
      explanation: modeText(mode,
        "LDL is the type of cholesterol that can build up in blood vessels. Yours is above target.",
        "LDL is the main marker doctors use for heart risk. 138 is above the usual target of 100 and worth tracking.",
        "LDL-C 138 is above target. Fiber intake, saturated fat reduction, and weight loss each move this meaningfully."),
      whyItMatters: "Lowering LDL pairs directly with your blood pressure goal for long term heart health.",
      questions: ["What LDL target makes sense for my risk level?"]
    },
    {
      marker: "HDL Cholesterol", result: "44", unit: "mg/dL", referenceRange: "Over 40", flag: "normal" as const,
      explanation: modeText(mode,
        "HDL is the helpful kind. Yours is in the okay zone.",
        "HDL helps clear cholesterol. 44 is in range, though higher is generally better.",
        "HDL 44 is in range but unremarkable. Regular aerobic work tends to nudge it up."),
      whyItMatters: "Your walking routine supports this number. Consistency counts more than intensity.",
      questions: []
    },
    {
      marker: "Triglycerides", result: "168", unit: "mg/dL", referenceRange: "Under 150", flag: "high" as const,
      explanation: modeText(mode,
        "These are fats in your blood that rise with sugar, refined carbs, and big late meals.",
        "Triglycerides at 168 are mildly high. They respond fast to fewer refined carbs and lighter evenings.",
        "TG 168 is mildly elevated and often tracks with late eating and refined carbohydrate load. This usually drops within weeks of habit changes."),
      whyItMatters: "Your Late Dinner Reduction experiment targets exactly the habit that moves this number.",
      questions: ["Was this drawn fasting? Non fasting draws read higher."]
    },
    {
      marker: "Fasting Glucose", result: "98", unit: "mg/dL", referenceRange: "70 to 99", flag: "normal" as const,
      explanation: modeText(mode,
        "Blood sugar after not eating overnight. Yours is in the normal range, near the top.",
        "98 is normal but at the upper edge. Weight loss usually pulls it down a few points.",
        "FPG 98 sits at the top of normal. Consider an HbA1c for the 3 month average if not already drawn."),
      whyItMatters: "Staying ahead of this number is easier than fixing it later. Your current direction helps.",
      questions: ["Should I add an HbA1c next time?"]
    },
    {
      marker: "Vitamin D", result: "27", unit: "ng/mL", referenceRange: "30 to 100", flag: "low" as const,
      explanation: modeText(mode,
        "A vitamin your body makes from sunlight. Yours is slightly low, which is very common.",
        "27 is just under range. Your current supplement may need a dose check.",
        "25-OH vitamin D at 27 is mildly insufficient. Verify the supplement dose and retest in 8 to 12 weeks."),
      whyItMatters: "You already take vitamin D, so this is a dose question, not a new habit.",
      questions: ["Is my current vitamin D dose enough?"]
    }
  ];
  return {
    summary: "Simulated lab read: a classic early-improvement panel. Lipids and triglycerides are mildly elevated and all four trend the same direction your current weight and meal timing work already pushes. Nothing here is alarming. Everything here is trackable.",
    markers,
    simulated: true
  };
}

export function simulateAsk(question: string): { summary: string; full: string; simulated: true } {
  return {
    summary: "Simulated reflection based on your logged data.",
    full:
      `Here is a practical read on "${question.slice(0, 120)}". Your weight trend is moving the right way at a sustainable pace. Your blood pressure readings are borderline but improving in the evening after activity, which is a useful signal. The single highest leverage habit in your data is meal timing: lighter and earlier dinners line up with your best mornings. Keep the protein anchor at lunch, keep walks attached to evenings, and judge yourself on weekly averages, not single days. Connect an API key in Settings for analysis grounded in your actual photos and reports.`,
    simulated: true
  };
}
