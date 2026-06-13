"use client";

/*
  V1 persistence layer backed by localStorage.
  Every read and write goes through this module, so swapping to
  Supabase later means replacing load and persist plus the mutators.
*/

import { useEffect, useState, useSyncExternalStore } from "react";
import type {
  BPEntry, DB, Goals, HealthInsight, HumeEntry, LabReport,
  MealEntry, Profile, Settings, WeightEntry
} from "./types";

const KEY = "healthestimator:v1";

export const DEFAULT_SETTINGS: Settings = {
  defaultMode: "normal",
  modelName: "gpt-4o-mini",
  efficientModel: "gpt-4o-mini",
  strongModel: "gpt-4o",
  storageMode: "local"
};

const EMPTY_DB: DB = {
  version: 1,
  seeded: false,
  profile: { mainGoals: [] },
  meals: [],
  weights: [],
  bps: [],
  hume: [],
  labs: [],
  insights: [],
  goals: {},
  settings: DEFAULT_SETTINGS
};

let cache: DB | null = null;
const listeners = new Set<() => void>();

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function daysAgo(n: number, hour = 8): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 12, 0, 0);
  return d.toISOString();
}

function seed(db: DB): DB {
  const weights: WeightEntry[] = [218.4, 217.0, 216.2, 215.8, 214.9, 214.2, 213.6, 213.0, 212.4, 212.0]
    .map((w, i) => ({ id: uid(), date: daysAgo(9 - i), weight: w }));
  const bps: BPEntry[] = [
    { id: uid(), date: daysAgo(2, 7), systolic: 134, diastolic: 86, pulse: 72, food: "before", caffeine: "before", exercise: "before", stress: 3, notes: "Morning reading, rested" },
    { id: uid(), date: daysAgo(1, 20), systolic: 128, diastolic: 82, pulse: 68, food: "after", caffeine: "not relevant", exercise: "after", stress: 2, notes: "After an evening walk" }
  ];
  const hume: HumeEntry[] = [
    { id: uid(), date: daysAgo(3), weight: 213.4, bodyFat: 27.8, muscleMass: 84.6, visceralFat: 11, metabolicAge: 49, hydration: 52.1, notes: "Demo scan entry", simulated: true }
  ];
  const meals: MealEntry[] = [
    {
      id: uid(), createdAt: daysAgo(0, 12), mealType: "lunch", timeEaten: "12:30",
      amountEaten: "all", hungerBefore: 6, fullnessAfter: 7, notes: "Demo meal",
      analysis: {
        foods: ["Grilled chicken", "Rice", "Mixed vegetables"],
        calories: 640, protein: 46, carbs: 62, fat: 18, fiber: 7, sodium: 820,
        confidence: "medium", heaviness: "moderate",
        timingNote: "Midday is a good slot for a meal this size.",
        goalAlignment: "Solid protein for a weight loss phase. The portion fits a normal lunch.",
        betterVersion: "Keep the protein, trade a third of the rice for extra vegetables.",
        nextMove: "Aim for a lighter dinner before 8 PM tonight.",
        simulated: true
      }
    }
  ];
  const insights: HealthInsight[] = [
    {
      id: uid(), date: daysAgo(1, 9), type: "weight",
      summary: "Down 6.4 lb over 10 days. The trend is steady, not crashy.",
      related: "Weight log",
      full: "Your last 10 entries show a steady decline of about 0.6 lb per day early on, settling near 0.4. That pace is sustainable. The pattern matters more than any single weigh-in. Keep the same meal timing and let the average do the work."
    }
  ];
  return {
    ...db,
    seeded: true,
    profile: {
      age: 44, heightInches: 70, currentWeight: 212, goalWeight: 190, sex: "Male",
      conditions: "Borderline high blood pressure", medications: "", supplements: "Vitamin D, fish oil",
      mealsPerDay: 3, firstMealTime: "09:30", lastMealTime: "20:30",
      dietPreferences: "Mostly whole foods, likes Mediterranean flavors",
      foodsToAvoid: "Deep fried food on weekdays",
      exerciseRoutine: "Walks 4x per week, light weights 2x",
      sleepNotes: "Usually 6.5 hours, wants 7+",
      mainGoals: ["Lose weight", "Reach 190 pounds", "Improve blood pressure", "Reduce late heavy meals"]
    },
    goals: {
      targetWeight: 190, weeklyCalorieTarget: 14000, proteinTarget: 150,
      mealTimingGoal: "Last meal by 8 PM on weekdays",
      bloodPressureGoal: "Average under 130/85",
      sleepGoal: "In bed by 11 PM",
      experiment: "Late Dinner Reduction"
    },
    weights, bps, hume, meals, insights
  };
}

function load(): DB {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY_DB;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DB>;
      cache = { ...EMPTY_DB, ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } };
    } else {
      cache = seed(EMPTY_DB);
      persist();
    }
  } catch {
    cache = seed(EMPTY_DB);
  }
  return cache!;
}

function persist() {
  if (typeof window === "undefined" || !cache) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Storage can fill up with large photos. Drop the oldest meal photos and retry once.
    if (cache.meals.length) {
      cache = { ...cache, meals: cache.meals.map((m, i) => (i < cache!.meals.length - 5 ? { ...m, photo: undefined } : m)) };
      try { window.localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* give up quietly */ }
    }
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export function mutate(fn: (db: DB) => DB) {
  cache = fn(load());
  persist();
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDB(): { db: DB; ready: boolean } {
  const db = useSyncExternalStore(subscribe, load, () => EMPTY_DB);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return { db, ready };
}

/* Mutators */

export const setProfile = (profile: Profile) => mutate((db) => ({ ...db, profile }));
export const setGoals = (goals: Goals) => mutate((db) => ({ ...db, goals }));
export const setSettings = (settings: Settings) => mutate((db) => ({ ...db, settings }));

export const addMeal = (m: MealEntry) => mutate((db) => ({ ...db, meals: [m, ...db.meals] }));
export const updateMeal = (id: string, patch: Partial<MealEntry>) =>
  mutate((db) => ({ ...db, meals: db.meals.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
export const removeMeal = (id: string) => mutate((db) => ({ ...db, meals: db.meals.filter((m) => m.id !== id) }));

export const addWeight = (w: WeightEntry) =>
  mutate((db) => ({
    ...db,
    weights: [...db.weights, w].sort((a, b) => a.date.localeCompare(b.date)),
    profile: { ...db.profile, currentWeight: w.weight }
  }));
export const removeWeight = (id: string) => mutate((db) => ({ ...db, weights: db.weights.filter((w) => w.id !== id) }));

export const addBP = (b: BPEntry) => mutate((db) => ({ ...db, bps: [b, ...db.bps] }));
export const removeBP = (id: string) => mutate((db) => ({ ...db, bps: db.bps.filter((b) => b.id !== id) }));

export const addHume = (h: HumeEntry) => mutate((db) => ({ ...db, hume: [h, ...db.hume] }));
export const removeHume = (id: string) => mutate((db) => ({ ...db, hume: db.hume.filter((h) => h.id !== id) }));

export const addLab = (l: LabReport) => mutate((db) => ({ ...db, labs: [l, ...db.labs] }));
export const updateLab = (id: string, patch: Partial<LabReport>) =>
  mutate((db) => ({ ...db, labs: db.labs.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
export const removeLab = (id: string) => mutate((db) => ({ ...db, labs: db.labs.filter((l) => l.id !== id) }));

export const addInsight = (i: HealthInsight) => mutate((db) => ({ ...db, insights: [i, ...db.insights] }));
export const removeInsight = (id: string) => mutate((db) => ({ ...db, insights: db.insights.filter((i) => i.id !== id) }));

export const clearDemoData = () =>
  mutate(() => ({ ...EMPTY_DB, seeded: true, settings: cache?.settings ?? DEFAULT_SETTINGS }));

export function exportData(): string {
  return JSON.stringify(load(), null, 2);
}
