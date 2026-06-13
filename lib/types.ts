export type ExplainMode = "baby" | "normal" | "nerd";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "late meal";
export type AmountEaten = "all" | "three quarters" | "half" | "quarter" | "custom";
export type Heaviness = "light" | "moderate" | "heavy" | "very heavy";
export type Confidence = "low" | "medium" | "high";
export type Flag = "low" | "normal" | "high" | "unknown";
export type BeforeAfter = "before" | "after" | "not relevant";

export interface Profile {
  age?: number;
  heightInches?: number;
  currentWeight?: number;
  goalWeight?: number;
  sex?: string;
  conditions?: string;
  medications?: string;
  supplements?: string;
  mealsPerDay?: number;
  firstMealTime?: string;
  lastMealTime?: string;
  dietPreferences?: string;
  foodsToAvoid?: string;
  exerciseRoutine?: string;
  sleepNotes?: string;
  mainGoals: string[];
}

export interface MealAnalysis {
  foods: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
  confidence: Confidence;
  heaviness: Heaviness;
  timingNote: string;
  goalAlignment: string;
  betterVersion: string;
  nextMove: string;
  simulated?: boolean;
}

export interface MealEntry {
  id: string;
  createdAt: string;
  photo?: string;
  mealType: MealType;
  timeEaten: string;
  amountEaten: AmountEaten;
  customPercent?: number;
  hungerBefore: number;
  fullnessAfter: number;
  notes?: string;
  analysis?: MealAnalysis;
  advice?: string;
}

export interface WeightEntry {
  id: string;
  date: string;
  weight: number;
  note?: string;
}

export interface BPEntry {
  id: string;
  date: string;
  systolic: number;
  diastolic: number;
  pulse?: number;
  food: BeforeAfter;
  caffeine: BeforeAfter;
  exercise: BeforeAfter;
  stress?: number;
  medicationTiming?: string;
  notes?: string;
}

export interface HumeAnalysis {
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  visceralFat?: number;
  metabolicAge?: number;
  hydration?: number;
  notes?: string;
  simulated?: boolean;
}

export interface HumeEntry extends HumeAnalysis {
  id: string;
  date: string;
  photo?: string;
}

export interface LabMarker {
  marker: string;
  result: string;
  unit: string;
  referenceRange: string;
  flag: Flag;
  explanation: string;
  whyItMatters: string;
  questions: string[];
}

export interface LabAnalysis {
  summary: string;
  markers: LabMarker[];
  mode: ExplainMode;
  simulated?: boolean;
}

export interface LabReport {
  id: string;
  date: string;
  photo?: string;
  fileName?: string;
  analysis?: LabAnalysis;
}

export type InsightType =
  | "meal"
  | "lab"
  | "hume"
  | "blood pressure"
  | "weight"
  | "reflection";

export interface HealthInsight {
  id: string;
  date: string;
  type: InsightType;
  summary: string;
  related?: string;
  full: string;
}

export interface Goals {
  targetWeight?: number;
  weeklyCalorieTarget?: number;
  proteinTarget?: number;
  mealTimingGoal?: string;
  bloodPressureGoal?: string;
  sleepGoal?: string;
  experiment?: string;
}

export interface Settings {
  defaultMode: ExplainMode;
  modelName: string;
  efficientModel: string;
  strongModel: string;
  storageMode: "local";
}

export interface DB {
  version: 1;
  seeded: boolean;
  profile: Profile;
  meals: MealEntry[];
  weights: WeightEntry[];
  bps: BPEntry[];
  hume: HumeEntry[];
  labs: LabReport[];
  insights: HealthInsight[];
  goals: Goals;
  settings: Settings;
}
