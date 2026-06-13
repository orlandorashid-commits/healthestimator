import OpenAI from "openai";
import type { ExplainMode, Profile } from "./types";

export function hasKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function modelFor(kind: "efficient" | "strong"): string {
  if (kind === "strong") return process.env.OPENAI_STRONG_MODEL || process.env.OPENAI_MODEL || "gpt-4o";
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

export function profileContext(profile?: Profile): string {
  if (!profile) return "No profile provided.";
  const p = profile;
  const ht = p.heightInches ? `${Math.floor(p.heightInches / 12)} ft ${p.heightInches % 12} in` : "unknown";
  return [
    `Age ${p.age ?? "unknown"}, sex ${p.sex ?? "unknown"}, height ${ht}.`,
    `Current weight ${p.currentWeight ?? "unknown"} lb, goal weight ${p.goalWeight ?? "unknown"} lb.`,
    `Conditions: ${p.conditions || "none listed"}. Medications: ${p.medications || "none listed"}. Supplements: ${p.supplements || "none listed"}.`,
    `Eats about ${p.mealsPerDay ?? "?"} meals per day, first meal around ${p.firstMealTime || "?"}, last meal around ${p.lastMealTime || "?"}.`,
    `Diet preferences: ${p.dietPreferences || "none listed"}. Avoids: ${p.foodsToAvoid || "nothing listed"}.`,
    `Exercise: ${p.exerciseRoutine || "none listed"}. Sleep: ${p.sleepNotes || "none listed"}.`,
    `Main goals: ${(p.mainGoals ?? []).join(", ") || "none selected"}.`
  ].join(" ");
}

export function toneRules(): string {
  return [
    "Tone: direct, useful, practical. Never shame the user. Never moralize food.",
    "Never say 'bad meal' or similar. Prefer framings like: 'This is heavier than ideal for a late meal',",
    "'This works better earlier in the day', 'This is not a problem if it is occasional',",
    "'The pattern matters more than one meal'.",
    "Do not use em dashes in any output."
  ].join(" ");
}

export function modeRules(mode: ExplainMode): string {
  if (mode === "baby") return "Explanation mode: Baby Mode. Explain like the reader is brand new to health topics. Short sentences. Zero jargon. Define anything technical.";
  if (mode === "nerd") return "Explanation mode: Nerd Mode. The reader knows the basics. Use proper terms, mechanisms, and specifics. Skip beginner framing.";
  return "Explanation mode: Normal Mode. Explain like the reader is a smart adult trying to learn. Plain language with key terms named.";
}

type ContentPart =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string; detail: "auto" };

export async function callJSON(opts: {
  model: string;
  system: string;
  prompt: string;
  imageDataUrl?: string;
}): Promise<unknown> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const content: ContentPart[] = [{ type: "input_text", text: opts.prompt }];
  if (opts.imageDataUrl) {
    content.push({ type: "input_image", image_url: opts.imageDataUrl, detail: "auto" });
  }
  const response = await client.responses.create({
    model: opts.model,
    instructions: opts.system + " Respond with a single valid JSON object only. No markdown fences, no commentary.",
    input: [{ role: "user", content }]
  });
  const text = response.output_text ?? "";
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}
