import { z } from "zod";

export const MealAnalysisSchema = z.object({
  foods: z.array(z.string()).min(1),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  fiber: z.number(),
  sodium: z.number(),
  confidence: z.enum(["low", "medium", "high"]),
  heaviness: z.enum(["light", "moderate", "heavy", "very heavy"]),
  timingNote: z.string(),
  goalAlignment: z.string(),
  betterVersion: z.string(),
  nextMove: z.string()
});

export const HumeAnalysisSchema = z.object({
  weight: z.number().optional(),
  bodyFat: z.number().optional(),
  muscleMass: z.number().optional(),
  visceralFat: z.number().optional(),
  metabolicAge: z.number().optional(),
  hydration: z.number().optional(),
  notes: z.string().optional()
});

export const LabMarkerSchema = z.object({
  marker: z.string(),
  result: z.string(),
  unit: z.string(),
  referenceRange: z.string(),
  flag: z.enum(["low", "normal", "high", "unknown"]),
  explanation: z.string(),
  whyItMatters: z.string(),
  questions: z.array(z.string())
});

export const LabAnalysisSchema = z.object({
  summary: z.string(),
  markers: z.array(LabMarkerSchema)
});

export const HealthInsightSchema = z.object({
  summary: z.string(),
  full: z.string()
});

export type MealAnalysisOut = z.infer<typeof MealAnalysisSchema>;
export type HumeAnalysisOut = z.infer<typeof HumeAnalysisSchema>;
export type LabAnalysisOut = z.infer<typeof LabAnalysisSchema>;
export type HealthInsightOut = z.infer<typeof HealthInsightSchema>;
