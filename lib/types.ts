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
  smoothies: SmoothieRecipe[];
  smoothiePrefs: SmoothiePreference;
  smoothieHistory: SmoothieHistoryEntry[];
  smoothieGrocery: SmoothieGroceryItem[];
  recipes: Recipe[];
  weeklyPlans: WeeklyPlan[];
  groceryItems: GroceryItem[];
  prepTasks: PrepTask[];
  inventoryItems: InventoryItem[];
  inventoryLocations: InventoryLocation[];
  inventoryCategories: InventoryCategory[];
  expirationRules: ExpirationEstimateRule[];
  recipeSources: RecipeSource[];
  importDrafts: RecipeImportDraft[];
}

// Smoothie module types

export type SmoothieGoal =
  | "morning energy"
  | "weight support"
  | "post-workout"
  | "gut health"
  | "high protein"
  | "low sugar"
  | "use what I have";

export type SmoothieEquipment = "blender" | "juicer" | "blender + juicer";
export type SmoothieTexturePreference = "smooth" | "thick" | "chunky" | "icy";
export type SmoothieSweetnessPreference = "low" | "medium" | "high";

export interface SmoothieIngredientItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  category: "produce" | "dairy" | "frozen" | "supplement" | "liquid" | "other";
  useSoon?: boolean;
  notes?: string;
}

export interface SmoothieRecipe {
  id: string;
  name: string;
  sourceOrAuthor?: string;
  sourceId?: string;
  description?: string;
  ingredients: SmoothieIngredientItem[];
  steps: string[];
  equipment: SmoothieEquipment;
  goal: SmoothieGoal;
  estimatedCalories?: number;
  estimatedProtein?: number;
  estimatedFiber?: number;
  tags: string[];
  rating?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SmoothiePreference {
  likes: string[];
  dislikes: string[];
  texturePreference?: SmoothieTexturePreference;
  sweetnessPreference?: SmoothieSweetnessPreference;
  equipmentAvailable: SmoothieEquipment[];
}

export interface SmoothieHistoryEntry {
  id: string;
  smoothieId: string;
  smoothieName: string;
  date: string;
  madeIt: boolean;
  rating?: number;
  notes?: string;
}

export interface SmoothieGroceryItem {
  id: string;
  name: string;
  category: string;
  hint?: string;
  needed: boolean;
  haveIt: boolean;
}

// Food planning types

export type MealSlot = "smoothie" | "lunch" | "dinner" | "flexible";

export type RecipeCategory =
  | "Smoothie" | "Lunch" | "Dinner" | "Dessert" | "Casserole"
  | "Friend gathering" | "Meal prep" | "Side dish" | "Sauce" | "Quick meal" | "Other";

export type FoodCategory =
  | "Produce" | "Protein" | "Dairy" | "Frozen" | "Pantry" | "Grains"
  | "Spices" | "Condiments" | "Drinks" | "Supplements" | "Other";

export type PrepCategory =
  | "Shopping" | "Washing" | "Chopping" | "Cooking protein" | "Cooking grains"
  | "Smoothie prep" | "Portioning" | "Freezing" | "Sauces" | "Cleanup" | "Other";

export type WeekMealPattern =
  | "smoothie + lunch + dinner"
  | "smoothie + dinner"
  | "lunch + dinner"
  | "custom";

export interface RecipeIngredient {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  category: FoodCategory;
  notes?: string;
}

export interface Recipe {
  id: string;
  name: string;
  sourceOrAuthor?: string;
  sourceId?: string;
  dietStyle?: string;
  mealSlot: MealSlot;
  category: RecipeCategory;
  ingredients: RecipeIngredient[];
  instructions: string[];
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  estimatedCalories?: number;
  estimatedProtein?: number;
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlannedMeal {
  id: string;
  date: string;
  slot: MealSlot;
  recipeId?: string;
  smoothieId?: string;
  customMealName?: string;
  notes?: string;
  completed: boolean;
}

export interface WeeklyPlan {
  id: string;
  name: string;
  startDate: string;
  dietFocus?: string;
  mealPattern: WeekMealPattern;
  days: PlannedMeal[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroceryItem {
  id: string;
  name: string;
  quantity?: string;
  unit?: string;
  category: FoodCategory;
  preferredStore?: string;
  sourceRecipeIds: string[];
  sourceSmoothieIds: string[];
  alreadyHave: boolean;
  bought: boolean;
  pushToNextTrip: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrepTask {
  id: string;
  title: string;
  category: PrepCategory;
  relatedRecipeIds: string[];
  relatedSmoothieIds: string[];
  scheduledDate?: string;
  estimatedMinutes?: number;
  completed: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Kitchen Inventory types

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  location: string;
  quantity?: number;
  unit?: string;
  purchaseDate?: string;
  expirationDate?: string;
  expirationOverride: boolean;
  opened: boolean;
  lowStock: boolean;
  lowStockThreshold?: number;
  useSoon: boolean;
  useFirst: boolean;
  usedUp: boolean;
  sourceGroceryItemId?: string;
  preferredStore?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryLocation {
  id: string;
  name: string;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryCategory {
  id: string;
  name: string;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExpirationEstimateRule {
  id: string;
  itemKeyword: string;
  category?: string;
  estimatedDaysFresh: number;
  storageLocation?: string;
  notes?: string;
}

// Recipe Importer types

export type RecipeSourceType =
  | "Book" | "PDF" | "Website" | "Personal notes"
  | "Smoothie library" | "AI generated" | "Other";

export interface RecipeSource {
  id: string;
  name: string;
  author?: string;
  sourceType: RecipeSourceType;
  dietStyle?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type DraftConfidence = "low" | "medium" | "high";

export interface RecipeImportDraft {
  id: string;
  sourceId?: string;
  rawText: string;
  parsedName: string;
  parsedIngredients: string[];
  parsedInstructions: string[];
  parsedServings?: number;
  parsedPrepTimeMinutes?: number;
  parsedCookTimeMinutes?: number;
  parsedMealSlot?: string;
  parsedCategory?: string;
  parsedDietStyle?: string;
  parsedTags: string[];
  confidence: DraftConfidence;
  needsReview: boolean;
  saved: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ImportBatchStatus = "pending" | "reviewing" | "completed";

export interface RecipeImportBatch {
  id: string;
  sourceId?: string;
  title: string;
  rawText: string;
  draftIds: string[];
  status: ImportBatchStatus;
  createdAt: string;
  updatedAt: string;
}
