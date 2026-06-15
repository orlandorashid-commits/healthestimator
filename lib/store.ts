"use client";

/*
  V1 persistence layer backed by localStorage.
  Every read and write goes through this module, so swapping to
  Supabase later means replacing load and persist plus the mutators.
*/

import { useEffect, useState, useSyncExternalStore } from "react";
import type {
  BPEntry, DB, ExpirationEstimateRule, FoodCategory, Goals, GroceryItem, HealthInsight,
  HumeEntry, InventoryCategory, InventoryItem, InventoryLocation, LabReport,
  MealEntry, MealSlot, PlannedMeal, PrepTask, Profile, Recipe, RecipeCategory, RecipeIngredient,
  Settings, SmoothieGroceryItem, SmoothieHistoryEntry, SmoothiePreference, SmoothieRecipe,
  WeekMealPattern, WeeklyPlan, WeightEntry
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
  settings: DEFAULT_SETTINGS,
  smoothies: [],
  smoothiePrefs: { likes: [], dislikes: [], equipmentAvailable: ["blender"] },
  smoothieHistory: [],
  smoothieGrocery: [],
  recipes: [],
  weeklyPlans: [],
  groceryItems: [],
  prepTasks: [],
  inventoryItems: [],
  inventoryLocations: [],
  inventoryCategories: [],
  expirationRules: []
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
  const sid = (n: number) => `smoothie-seed-${n}`;
  const smoothies: import("./types").SmoothieRecipe[] = [
    {
      id: sid(1), name: "Golden Mango Sunrise",
      description: "A creamy energy-boosting blend with turmeric and hidden greens.",
      ingredients: [
        { id: uid(), name: "frozen mango chunks", quantity: "1", unit: "cup", category: "frozen", useSoon: false },
        { id: uid(), name: "vanilla Greek yogurt", quantity: "1/2", unit: "cup", category: "dairy" },
        { id: uid(), name: "baby spinach", quantity: "1", unit: "handful", category: "produce" },
        { id: uid(), name: "unsweetened almond milk", quantity: "1", unit: "cup", category: "liquid" },
        { id: uid(), name: "fresh ginger, peeled", quantity: "1/2", unit: "inch", category: "produce", useSoon: true },
        { id: uid(), name: "chia seeds", quantity: "1", unit: "tbsp", category: "supplement" },
        { id: uid(), name: "turmeric", quantity: "1/4", unit: "tsp", category: "supplement" }
      ],
      steps: [
        "Add almond milk and spinach to the blender first.",
        "Add frozen mango, yogurt, and ginger.",
        "Sprinkle in chia seeds and turmeric.",
        "Blend on high for 60 seconds until fully smooth.",
        "Taste and add a slice of banana if more sweetness is wanted."
      ],
      equipment: "blender", goal: "morning energy",
      estimatedCalories: 310, estimatedProtein: 14, estimatedFiber: 6,
      tags: ["tropical", "high fiber", "anti-inflammatory"],
      rating: 4, notes: "Works well with frozen banana instead of mango too.",
      createdAt: daysAgo(7), updatedAt: daysAgo(7)
    },
    {
      id: sid(2), name: "Greek Yogurt Berry Smoothie",
      description: "High protein and tangy. A filling morning option that skips the sugar spike.",
      ingredients: [
        { id: uid(), name: "frozen mixed berries", quantity: "1", unit: "cup", category: "frozen" },
        { id: uid(), name: "plain Greek yogurt", quantity: "3/4", unit: "cup", category: "dairy" },
        { id: uid(), name: "unsweetened almond milk", quantity: "1/2", unit: "cup", category: "liquid" },
        { id: uid(), name: "honey", quantity: "1", unit: "tsp", category: "other" },
        { id: uid(), name: "vanilla extract", quantity: "1/4", unit: "tsp", category: "other" },
        { id: uid(), name: "ground flaxseed", quantity: "1", unit: "tbsp", category: "supplement" }
      ],
      steps: [
        "Add almond milk and yogurt to blender.",
        "Add frozen berries, honey, and vanilla extract.",
        "Add ground flaxseed on top.",
        "Blend on high for 45 seconds.",
        "Add a splash more milk if the texture is too thick."
      ],
      equipment: "blender", goal: "high protein",
      estimatedCalories: 280, estimatedProtein: 22, estimatedFiber: 5,
      tags: ["high protein", "berry", "gut health"],
      rating: 5, createdAt: daysAgo(6), updatedAt: daysAgo(6)
    },
    {
      id: sid(3), name: "Green Protein Reset",
      description: "Earthy, filling, and quietly green. Good after a workout.",
      ingredients: [
        { id: uid(), name: "baby spinach", quantity: "2", unit: "handfuls", category: "produce" },
        { id: uid(), name: "frozen banana", quantity: "1/2", unit: "medium", category: "frozen" },
        { id: uid(), name: "vanilla protein powder", quantity: "1", unit: "scoop", category: "supplement" },
        { id: uid(), name: "unsweetened almond milk", quantity: "1", unit: "cup", category: "liquid" },
        { id: uid(), name: "almond butter", quantity: "1", unit: "tbsp", category: "other" },
        { id: uid(), name: "ice", quantity: "1/2", unit: "cup", category: "other" },
        { id: uid(), name: "spirulina powder", quantity: "1/2", unit: "tsp", category: "supplement" }
      ],
      steps: [
        "Add almond milk and spinach to the blender and blend briefly to break down the greens.",
        "Add frozen banana and almond butter.",
        "Add protein powder and spirulina.",
        "Add ice last.",
        "Blend on high for 60 seconds until fully smooth and green."
      ],
      equipment: "blender", goal: "post-workout",
      estimatedCalories: 340, estimatedProtein: 28, estimatedFiber: 7,
      tags: ["green", "high protein", "post-workout", "low sugar"],
      createdAt: daysAgo(5), updatedAt: daysAgo(5)
    },
    {
      id: sid(4), name: "Chocolate Banana Protein Smoothie",
      description: "Thick, satisfying, and tastes like dessert without the consequences.",
      ingredients: [
        { id: uid(), name: "frozen banana", quantity: "1", unit: "medium", category: "frozen" },
        { id: uid(), name: "chocolate protein powder", quantity: "1", unit: "scoop", category: "supplement" },
        { id: uid(), name: "natural peanut butter", quantity: "1", unit: "tbsp", category: "other" },
        { id: uid(), name: "oat milk", quantity: "1", unit: "cup", category: "liquid" },
        { id: uid(), name: "cacao powder", quantity: "1", unit: "tbsp", category: "supplement" },
        { id: uid(), name: "ice", quantity: "1/2", unit: "cup", category: "other" },
        { id: uid(), name: "sea salt", quantity: "1", unit: "pinch", category: "other" }
      ],
      steps: [
        "Combine oat milk, protein powder, and cacao in blender.",
        "Add frozen banana and peanut butter.",
        "Add ice and a pinch of sea salt.",
        "Blend on high for 45 to 60 seconds.",
        "Drink immediately while cold."
      ],
      equipment: "blender", goal: "high protein",
      estimatedCalories: 380, estimatedProtein: 30, estimatedFiber: 5,
      tags: ["chocolate", "high protein", "filling", "post-workout"],
      rating: 5, createdAt: daysAgo(4), updatedAt: daysAgo(4)
    },
    {
      id: sid(5), name: "Tropical Ginger Smoothie",
      description: "Light, bright, and gut-friendly. The ginger gives it a gentle kick.",
      ingredients: [
        { id: uid(), name: "frozen pineapple chunks", quantity: "1/2", unit: "cup", category: "frozen" },
        { id: uid(), name: "frozen mango chunks", quantity: "1/2", unit: "cup", category: "frozen" },
        { id: uid(), name: "coconut water", quantity: "1", unit: "cup", category: "liquid" },
        { id: uid(), name: "fresh ginger, peeled", quantity: "1", unit: "inch", category: "produce", useSoon: true },
        { id: uid(), name: "lime juice", quantity: "1", unit: "tbsp", category: "produce" },
        { id: uid(), name: "chia seeds", quantity: "1", unit: "tbsp", category: "supplement" }
      ],
      steps: [
        "Pour coconut water into blender.",
        "Add all frozen fruit and ginger.",
        "Squeeze in lime juice.",
        "Blend on high for 60 seconds.",
        "Stir in chia seeds after blending and let sit 2 minutes to bloom."
      ],
      equipment: "blender", goal: "gut health",
      estimatedCalories: 265, estimatedProtein: 8, estimatedFiber: 6,
      tags: ["tropical", "anti-inflammatory", "gut health", "refreshing"],
      createdAt: daysAgo(3), updatedAt: daysAgo(3)
    },
    {
      id: sid(6), name: "Low Sugar Almond Berry Smoothie",
      description: "A light and filling morning option built around keeping sugar low.",
      ingredients: [
        { id: uid(), name: "frozen strawberries", quantity: "1", unit: "cup", category: "frozen" },
        { id: uid(), name: "plain Greek yogurt, unsweetened", quantity: "1/4", unit: "cup", category: "dairy" },
        { id: uid(), name: "unsweetened almond milk", quantity: "1", unit: "cup", category: "liquid" },
        { id: uid(), name: "almond butter", quantity: "1", unit: "tbsp", category: "other" },
        { id: uid(), name: "ground flaxseed", quantity: "1", unit: "tbsp", category: "supplement" },
        { id: uid(), name: "vanilla extract", quantity: "1/2", unit: "tsp", category: "other" },
        { id: uid(), name: "ice", quantity: "5", unit: "cubes", category: "other" }
      ],
      steps: [
        "Add almond milk and yogurt to blender.",
        "Add frozen strawberries and almond butter.",
        "Add flaxseed and vanilla extract.",
        "Add ice on top.",
        "Blend on high for 45 seconds until smooth."
      ],
      equipment: "blender", goal: "low sugar",
      estimatedCalories: 240, estimatedProtein: 12, estimatedFiber: 7,
      tags: ["low sugar", "berry", "light", "weight support"],
      createdAt: daysAgo(2), updatedAt: daysAgo(2)
    }
  ];

  const smoothieHistory: import("./types").SmoothieHistoryEntry[] = [
    { id: uid(), smoothieId: sid(1), smoothieName: "Golden Mango Sunrise", date: daysAgo(2, 8), madeIt: true, rating: 4, notes: "Good start to the morning." },
    { id: uid(), smoothieId: sid(2), smoothieName: "Greek Yogurt Berry Smoothie", date: daysAgo(1, 8), madeIt: true, rating: 5, notes: "Very filling. No hunger until lunch." }
  ];

  const smoothieGrocery: import("./types").SmoothieGroceryItem[] = [
    { id: uid(), name: "Frozen mango chunks", category: "Frozen", hint: "16 oz bag", needed: true, haveIt: false },
    { id: uid(), name: "Frozen mixed berries", category: "Frozen", hint: "16 oz bag", needed: true, haveIt: false },
    { id: uid(), name: "Frozen banana slices", category: "Frozen", hint: "Peel and slice before freezing", needed: false, haveIt: true },
    { id: uid(), name: "Frozen pineapple chunks", category: "Frozen", hint: "12 oz bag", needed: false, haveIt: true },
    { id: uid(), name: "Frozen strawberries", category: "Frozen", hint: "16 oz bag", needed: false, haveIt: true },
    { id: uid(), name: "Baby spinach", category: "Produce", hint: "5 oz bag", needed: true, haveIt: false },
    { id: uid(), name: "Fresh ginger root", category: "Produce", hint: "Use within a week of buying", needed: true, haveIt: false },
    { id: uid(), name: "Limes", category: "Produce", hint: "3 to 4", needed: false, haveIt: true },
    { id: uid(), name: "Bananas", category: "Produce", hint: "Buy 6, freeze 3", needed: false, haveIt: true },
    { id: uid(), name: "Plain Greek yogurt", category: "Dairy", hint: "32 oz, unsweetened", needed: true, haveIt: false },
    { id: uid(), name: "Unsweetened almond milk", category: "Dairy", hint: "Half gallon", needed: false, haveIt: true },
    { id: uid(), name: "Oat milk", category: "Dairy", hint: "32 oz", needed: false, haveIt: true },
    { id: uid(), name: "Coconut water", category: "Liquid", hint: "33 oz carton", needed: false, haveIt: true },
    { id: uid(), name: "Chia seeds", category: "Supplements", hint: "12 oz bag, fiber and omega-3", needed: false, haveIt: true },
    { id: uid(), name: "Ground flaxseed", category: "Supplements", hint: "16 oz bag", needed: true, haveIt: false },
    { id: uid(), name: "Spirulina powder", category: "Supplements", hint: "Boosts protein and energy", needed: false, haveIt: true },
    { id: uid(), name: "Vanilla protein powder", category: "Supplements", hint: "Check scoop size for your brand", needed: false, haveIt: true },
    { id: uid(), name: "Almond butter", category: "Other", hint: "Natural, no added sugar", needed: false, haveIt: true },
    { id: uid(), name: "Natural peanut butter", category: "Other", hint: "No added sugar or oil", needed: false, haveIt: true },
    { id: uid(), name: "Cacao powder", category: "Other", hint: "Not hot cocoa mix", needed: false, haveIt: true }
  ];

  // Food planning seed data
  const rId = (n: number) => `recipe-seed-${n}`;
  const mki = (q: string, u: string, n: string, cat: FoodCategory): RecipeIngredient => ({ id: uid(), name: n, quantity: q, unit: u, category: cat });

  const seedRecipes: Recipe[] = [
    {
      id: rId(1), name: "Mediterranean Chicken Bowl",
      sourceOrAuthor: "Personal recipe", dietStyle: "Mediterranean",
      mealSlot: "dinner" as MealSlot, category: "Dinner" as RecipeCategory,
      ingredients: [
        mki("1.5","lb","chicken breast","Protein"), mki("1","cup","cherry tomatoes, halved","Produce"),
        mki("1","medium","cucumber, diced","Produce"), mki("1/4","cup","kalamata olives","Pantry"),
        mki("1/2","cup","crumbled feta","Dairy"), mki("2","tbsp","olive oil","Condiments"),
        mki("1","lemon","lemon, juice and zest","Produce"), mki("1","tsp","dried oregano","Spices"),
        mki("2","cloves","garlic, minced","Produce"), mki("2","cups","cooked quinoa","Grains")
      ],
      instructions: [
        "Marinate chicken in olive oil, lemon juice, garlic, and oregano for 20 minutes.",
        "Cook chicken over medium-high heat, 6 to 7 minutes per side until cooked through.",
        "Rest chicken 5 minutes then slice into strips.",
        "Build bowls over cooked quinoa.",
        "Top with tomatoes, cucumber, olives, and feta."
      ],
      prepTimeMinutes: 25, cookTimeMinutes: 15, servings: 4,
      estimatedCalories: 480, estimatedProtein: 42,
      tags: ["mediterranean", "high protein", "good leftovers"],
      createdAt: daysAgo(6), updatedAt: daysAgo(6)
    },
    {
      id: rId(2), name: "Vegetable Egg Bake",
      sourceOrAuthor: "Personal recipe", dietStyle: "Vegetarian",
      mealSlot: "flexible" as MealSlot, category: "Meal prep" as RecipeCategory,
      ingredients: [
        mki("8","large","eggs","Protein"), mki("1","cup","bell peppers, diced","Produce"),
        mki("1/2","cup","onion, diced","Produce"), mki("2","cups","baby spinach","Produce"),
        mki("1","cup","cherry tomatoes, halved","Produce"), mki("1/2","cup","crumbled feta","Dairy"),
        mki("2","tbsp","olive oil","Condiments"), mki("1/2","tsp","salt","Spices"),
        mki("1/4","tsp","black pepper","Spices")
      ],
      instructions: [
        "Preheat oven to 375 degrees F. Grease a 9x13 Pyrex dish.",
        "Saute peppers and onion in olive oil over medium heat for 5 minutes.",
        "Add spinach and cook until wilted, about 2 minutes.",
        "Spread vegetables in the Pyrex dish. Scatter tomatoes on top.",
        "Whisk eggs with salt and pepper and pour over the vegetables.",
        "Top with feta and bake 22 to 25 minutes until set in the center.",
        "Cool slightly, then cut into portions and store in the same dish covered."
      ],
      prepTimeMinutes: 15, cookTimeMinutes: 25, servings: 6,
      estimatedCalories: 220, estimatedProtein: 16,
      tags: ["vegetarian", "easy prep", "good leftovers", "uses Pyrex"],
      createdAt: daysAgo(5), updatedAt: daysAgo(5)
    },
    {
      id: rId(3), name: "Lentil Vegetable Soup",
      sourceOrAuthor: "Personal recipe", dietStyle: "Plant-Forward",
      mealSlot: "dinner" as MealSlot, category: "Dinner" as RecipeCategory,
      ingredients: [
        mki("1.5","cups","red or green lentils, rinsed","Pantry"), mki("2","medium","carrots, diced","Produce"),
        mki("3","stalks","celery, diced","Produce"), mki("1","medium","onion, diced","Produce"),
        mki("4","cloves","garlic, minced","Produce"), mki("1","can","diced tomatoes (14 oz)","Pantry"),
        mki("6","cups","low-sodium vegetable broth","Pantry"), mki("2","tsp","cumin","Spices"),
        mki("1","tsp","turmeric","Spices"), mki("2","tbsp","olive oil","Condiments"),
        mki("1","bunch","fresh parsley, chopped","Produce")
      ],
      instructions: [
        "Heat olive oil in a large pot over medium heat.",
        "Add onion, carrots, and celery. Cook 7 minutes until softened.",
        "Add garlic, cumin, and turmeric. Cook 1 minute.",
        "Add lentils, tomatoes, and broth. Bring to a boil.",
        "Reduce heat and simmer 25 to 30 minutes until lentils are tender.",
        "Stir in parsley and adjust seasoning.",
        "Freezes well in portions."
      ],
      prepTimeMinutes: 15, cookTimeMinutes: 35, servings: 6,
      estimatedCalories: 280, estimatedProtein: 18,
      tags: ["vegetarian", "freezer friendly", "good leftovers", "low glycemic"],
      createdAt: daysAgo(4), updatedAt: daysAgo(4)
    },
    {
      id: rId(4), name: "Salmon with Roasted Vegetables",
      sourceOrAuthor: "Personal recipe", dietStyle: "Mediterranean",
      mealSlot: "dinner" as MealSlot, category: "Dinner" as RecipeCategory,
      ingredients: [
        mki("4","6-oz","salmon fillets","Protein"), mki("2","cups","broccoli florets","Produce"),
        mki("1","large","zucchini, sliced","Produce"), mki("1","cup","cherry tomatoes","Produce"),
        mki("3","tbsp","olive oil","Condiments"), mki("1","lemon","lemon, sliced","Produce"),
        mki("3","cloves","garlic, minced","Produce"), mki("1","tsp","dried thyme","Spices"),
        mki("1/2","tsp","paprika","Spices"), mki("1/2","tsp","salt","Spices")
      ],
      instructions: [
        "Preheat oven to 400 degrees F. Line a large sheet pan with parchment.",
        "Toss vegetables with 2 tbsp olive oil, garlic, and half the seasonings.",
        "Spread on pan and roast 15 minutes.",
        "Push vegetables to sides and place salmon on the center of the pan.",
        "Drizzle salmon with remaining oil and seasonings. Top with lemon slices.",
        "Roast 12 to 14 more minutes until salmon flakes easily."
      ],
      prepTimeMinutes: 10, cookTimeMinutes: 30, servings: 4,
      estimatedCalories: 420, estimatedProtein: 45,
      tags: ["mediterranean", "high protein", "easy prep"],
      createdAt: daysAgo(3), updatedAt: daysAgo(3)
    },
    {
      id: rId(5), name: "Friend Gathering Casserole",
      sourceOrAuthor: "Personal recipe",
      mealSlot: "dinner" as MealSlot, category: "Friend gathering" as RecipeCategory,
      ingredients: [
        mki("1.5","lb","ground turkey or beef","Protein"), mki("1","medium","onion, diced","Produce"),
        mki("3","cloves","garlic, minced","Produce"), mki("1","can","diced tomatoes (28 oz)","Pantry"),
        mki("1","can","tomato sauce (15 oz)","Pantry"), mki("2","cups","uncooked penne pasta","Grains"),
        mki("1.5","cups","shredded mozzarella","Dairy"), mki("1","tsp","Italian seasoning","Spices"),
        mki("1","tsp","garlic powder","Spices"), mki("2","tbsp","olive oil","Condiments")
      ],
      instructions: [
        "Preheat oven to 375 degrees F.",
        "Cook pasta one minute less than package directions. Drain and set aside.",
        "Brown meat with onion and garlic in olive oil over medium heat.",
        "Stir in diced tomatoes, sauce, and seasonings. Simmer 5 minutes.",
        "Combine meat sauce and pasta in a 9x13 Pyrex dish.",
        "Top with mozzarella.",
        "Bake 25 minutes until bubbly and golden. Serves 8 to 10."
      ],
      prepTimeMinutes: 20, cookTimeMinutes: 40, servings: 10,
      estimatedCalories: 380, estimatedProtein: 28,
      tags: ["friend gathering", "good leftovers", "uses Pyrex", "freezer friendly"],
      createdAt: daysAgo(3), updatedAt: daysAgo(3)
    },
    {
      id: rId(6), name: "Simple Turkey Lettuce Bowls",
      sourceOrAuthor: "Personal recipe",
      mealSlot: "lunch" as MealSlot, category: "Lunch" as RecipeCategory,
      ingredients: [
        mki("1","lb","ground turkey","Protein"), mki("2","tbsp","low-sodium soy sauce","Condiments"),
        mki("1","tbsp","sesame oil","Condiments"), mki("1","tbsp","rice vinegar","Condiments"),
        mki("2","cloves","garlic, minced","Produce"), mki("1","inch","fresh ginger, grated","Produce"),
        mki("1","head","butter lettuce, leaves separated","Produce"),
        mki("1/2","cup","shredded carrots","Produce"), mki("2","green onions","green onions, sliced","Produce"),
        mki("1","tbsp","sesame seeds","Spices")
      ],
      instructions: [
        "Cook turkey in a skillet over medium-high heat, breaking up as it cooks.",
        "Add garlic and ginger after turkey is cooked through.",
        "Stir in soy sauce, sesame oil, and rice vinegar.",
        "Serve spoonfuls in lettuce leaves.",
        "Top with carrots, green onions, and sesame seeds."
      ],
      prepTimeMinutes: 10, cookTimeMinutes: 12, servings: 4,
      estimatedCalories: 290, estimatedProtein: 36,
      tags: ["high protein", "low glycemic", "easy prep"],
      createdAt: daysAgo(2), updatedAt: daysAgo(2)
    },
    {
      id: rId(7), name: "Greek Yogurt Breakfast Bowl",
      sourceOrAuthor: "Personal recipe", dietStyle: "High Protein",
      mealSlot: "flexible" as MealSlot, category: "Meal prep" as RecipeCategory,
      ingredients: [
        mki("1","cup","plain Greek yogurt, unsweetened","Dairy"),
        mki("1/4","cup","fresh or frozen berries","Produce"),
        mki("2","tbsp","chia seeds","Supplements"),
        mki("1","tbsp","almond butter","Pantry"),
        mki("1","tsp","honey","Pantry"),
        mki("2","tbsp","granola (low sugar)","Grains")
      ],
      instructions: [
        "Spoon yogurt into a bowl.",
        "Top with berries and drizzle with honey.",
        "Add chia seeds and almond butter.",
        "Add granola just before eating to keep it crunchy.",
        "For meal prep, layer yogurt, fruit, and seeds in a jar and add granola at serving time."
      ],
      prepTimeMinutes: 5, cookTimeMinutes: 0, servings: 1,
      estimatedCalories: 340, estimatedProtein: 24,
      tags: ["high protein", "vegetarian", "easy prep", "good leftovers"],
      createdAt: daysAgo(1), updatedAt: daysAgo(1)
    }
  ];

  // Weekly plan for current week
  const planId = "weekly-plan-seed-1";
  const monday = (() => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  })();
  const dayOf = (offsetDays: number) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };

  const seedWeeklyPlans: WeeklyPlan[] = [
    {
      id: planId, name: "This week",
      startDate: monday, dietFocus: "Mediterranean",
      mealPattern: "smoothie + lunch + dinner" as WeekMealPattern,
      days: [
        { id: uid(), date: dayOf(0), slot: "smoothie" as MealSlot, smoothieId: "smoothie-seed-1", completed: false },
        { id: uid(), date: dayOf(0), slot: "lunch" as MealSlot, recipeId: rId(6), completed: false },
        { id: uid(), date: dayOf(0), slot: "dinner" as MealSlot, recipeId: rId(1), completed: false },
        { id: uid(), date: dayOf(1), slot: "smoothie" as MealSlot, smoothieId: "smoothie-seed-2", completed: false },
        { id: uid(), date: dayOf(1), slot: "lunch" as MealSlot, recipeId: rId(7), completed: false },
        { id: uid(), date: dayOf(1), slot: "dinner" as MealSlot, recipeId: rId(4), completed: false },
        { id: uid(), date: dayOf(2), slot: "smoothie" as MealSlot, smoothieId: "smoothie-seed-3", completed: false },
        { id: uid(), date: dayOf(2), slot: "dinner" as MealSlot, recipeId: rId(3), completed: false },
        { id: uid(), date: dayOf(3), slot: "smoothie" as MealSlot, smoothieId: "smoothie-seed-1", completed: false },
        { id: uid(), date: dayOf(3), slot: "lunch" as MealSlot, recipeId: rId(6), completed: false },
        { id: uid(), date: dayOf(3), slot: "dinner" as MealSlot, recipeId: rId(2), completed: false },
        { id: uid(), date: dayOf(4), slot: "smoothie" as MealSlot, smoothieId: "smoothie-seed-4", completed: false },
        { id: uid(), date: dayOf(4), slot: "dinner" as MealSlot, recipeId: rId(1), completed: false },
        { id: uid(), date: dayOf(5), slot: "smoothie" as MealSlot, smoothieId: "smoothie-seed-2", completed: false },
        { id: uid(), date: dayOf(5), slot: "dinner" as MealSlot, recipeId: rId(5), completed: false },
        { id: uid(), date: dayOf(6), slot: "dinner" as MealSlot, recipeId: rId(5), completed: false }
      ],
      notes: "", createdAt: daysAgo(1), updatedAt: daysAgo(1)
    }
  ];

  const seedGroceryItems: GroceryItem[] = [
    { id: uid(), name: "Chicken breast", quantity: "1.5", unit: "lb", category: "Protein" as FoodCategory, preferredStore: "HEB", sourceRecipeIds: [rId(1)], sourceSmoothieIds: [], alreadyHave: false, bought: false, pushToNextTrip: false, createdAt: daysAgo(0), updatedAt: daysAgo(0) },
    { id: uid(), name: "Salmon fillets", quantity: "4", unit: "6-oz", category: "Protein" as FoodCategory, preferredStore: "HEB", sourceRecipeIds: [rId(4)], sourceSmoothieIds: [], alreadyHave: false, bought: false, pushToNextTrip: false, createdAt: daysAgo(0), updatedAt: daysAgo(0) },
    { id: uid(), name: "Ground turkey", quantity: "2", unit: "lb", category: "Protein" as FoodCategory, preferredStore: "HEB", sourceRecipeIds: [rId(6)], sourceSmoothieIds: [], alreadyHave: false, bought: false, pushToNextTrip: false, createdAt: daysAgo(0), updatedAt: daysAgo(0) },
    { id: uid(), name: "Cherry tomatoes", quantity: "2", unit: "cup", category: "Produce" as FoodCategory, preferredStore: "Riverside Produce", sourceRecipeIds: [rId(1),rId(2),rId(4)], sourceSmoothieIds: [], alreadyHave: false, bought: false, pushToNextTrip: false, createdAt: daysAgo(0), updatedAt: daysAgo(0) },
    { id: uid(), name: "Baby spinach", quantity: "5", unit: "oz bag", category: "Produce" as FoodCategory, preferredStore: "Riverside Produce", sourceRecipeIds: [rId(2)], sourceSmoothieIds: ["smoothie-seed-1","smoothie-seed-3"], alreadyHave: true, bought: false, pushToNextTrip: false, createdAt: daysAgo(0), updatedAt: daysAgo(0) },
    { id: uid(), name: "Plain Greek yogurt (32 oz)", quantity: "1", unit: "32-oz container", category: "Dairy" as FoodCategory, preferredStore: "Trader Joe's", sourceRecipeIds: [rId(7)], sourceSmoothieIds: ["smoothie-seed-2"], alreadyHave: false, bought: false, pushToNextTrip: false, createdAt: daysAgo(0), updatedAt: daysAgo(0) },
    { id: uid(), name: "Feta cheese", quantity: "1", unit: "pkg", category: "Dairy" as FoodCategory, preferredStore: "Trader Joe's", sourceRecipeIds: [rId(1),rId(2)], sourceSmoothieIds: [], alreadyHave: true, bought: false, pushToNextTrip: false, createdAt: daysAgo(0), updatedAt: daysAgo(0) },
    { id: uid(), name: "Butter lettuce", quantity: "1", unit: "head", category: "Produce" as FoodCategory, preferredStore: "Riverside Produce", sourceRecipeIds: [rId(6)], sourceSmoothieIds: [], alreadyHave: false, bought: false, pushToNextTrip: false, createdAt: daysAgo(0), updatedAt: daysAgo(0) },
    { id: uid(), name: "Kalamata olives", quantity: "1", unit: "jar", category: "Pantry" as FoodCategory, preferredStore: "Trader Joe's", sourceRecipeIds: [rId(1)], sourceSmoothieIds: [], alreadyHave: true, bought: false, pushToNextTrip: false, createdAt: daysAgo(0), updatedAt: daysAgo(0) },
    { id: uid(), name: "Red or green lentils", quantity: "1.5", unit: "cups", category: "Pantry" as FoodCategory, preferredStore: "HEB", sourceRecipeIds: [rId(3)], sourceSmoothieIds: [], alreadyHave: false, bought: false, pushToNextTrip: false, createdAt: daysAgo(0), updatedAt: daysAgo(0) }
  ];

  const seedPrepTasks: PrepTask[] = [
    { id: uid(), title: "Shop for the week", category: "Shopping" as import("./types").PrepCategory, relatedRecipeIds: [rId(1),rId(2),rId(4),rId(6)], relatedSmoothieIds: ["smoothie-seed-1","smoothie-seed-2"], scheduledDate: monday, estimatedMinutes: 45, completed: false, createdAt: daysAgo(0), updatedAt: daysAgo(0) },
    { id: uid(), title: "Wash and chop vegetables", category: "Chopping" as import("./types").PrepCategory, relatedRecipeIds: [rId(1),rId(2),rId(3),rId(4)], relatedSmoothieIds: [], scheduledDate: monday, estimatedMinutes: 30, completed: false, createdAt: daysAgo(0), updatedAt: daysAgo(0) },
    { id: uid(), title: "Bake Vegetable Egg Bake in Pyrex", category: "Cooking protein" as import("./types").PrepCategory, relatedRecipeIds: [rId(2)], relatedSmoothieIds: [], scheduledDate: monday, estimatedMinutes: 40, completed: false, notes: "Stores up to 5 days in the Pyrex covered. Portion for weekday lunches.", createdAt: daysAgo(0), updatedAt: daysAgo(0) },
    { id: uid(), title: "Cook quinoa for Mediterranean bowls", category: "Cooking grains" as import("./types").PrepCategory, relatedRecipeIds: [rId(1)], relatedSmoothieIds: [], scheduledDate: monday, estimatedMinutes: 20, completed: false, createdAt: daysAgo(0), updatedAt: daysAgo(0) },
    { id: uid(), title: "Portion smoothie ingredients into freezer bags", category: "Smoothie prep" as import("./types").PrepCategory, relatedRecipeIds: [], relatedSmoothieIds: ["smoothie-seed-1","smoothie-seed-3"], scheduledDate: monday, estimatedMinutes: 20, completed: false, notes: "Prep 5 smoothie bags: one per weekday morning. Grab, add liquid, blend.", createdAt: daysAgo(0), updatedAt: daysAgo(0) }
  ];

  // Kitchen inventory seed data
  const mkLoc = (name: string): InventoryLocation => ({ id: uid(), name, hidden: false, createdAt: daysAgo(60), updatedAt: daysAgo(60) });
  const mkCat = (name: string): InventoryCategory => ({ id: uid(), name, hidden: false, createdAt: daysAgo(60), updatedAt: daysAgo(60) });
  const seedInventoryLocations: InventoryLocation[] = [
    mkLoc("Refrigerator"), mkLoc("Freezer 1"), mkLoc("Freezer 2"), mkLoc("Pantry"),
    mkLoc("Fruit bowl"), mkLoc("Hanging pantry"), mkLoc("Bathroom"), mkLoc("Laundry"),
    mkLoc("Office / Studio"), mkLoc("Other")
  ];

  const seedInventoryCategories: InventoryCategory[] = [
    mkCat("Produce"), mkCat("Protein"), mkCat("Dairy"), mkCat("Frozen"), mkCat("Grains"),
    mkCat("Pantry"), mkCat("Spices"), mkCat("Condiments"), mkCat("Drinks"), mkCat("Supplements"),
    mkCat("Household"), mkCat("Cleaning"), mkCat("Bathroom"), mkCat("Office"), mkCat("Other")
  ];

  const seedExpirationRules: ExpirationEstimateRule[] = [
    { id: uid(), itemKeyword: "rotisserie chicken", estimatedDaysFresh: 4, storageLocation: "refrigerator", notes: "Estimated freshness. Check before using." },
    { id: uid(), itemKeyword: "cooked chicken",     estimatedDaysFresh: 4, storageLocation: "refrigerator", notes: "Estimated freshness. Check before using." },
    { id: uid(), itemKeyword: "raw chicken",        estimatedDaysFresh: 2, storageLocation: "refrigerator", notes: "Estimated freshness. Check before using." },
    { id: uid(), itemKeyword: "egg",                estimatedDaysFresh: 28, storageLocation: "refrigerator" },
    { id: uid(), itemKeyword: "greek yogurt",       estimatedDaysFresh: 10, storageLocation: "refrigerator" },
    { id: uid(), itemKeyword: "yogurt",             estimatedDaysFresh: 10, storageLocation: "refrigerator" },
    { id: uid(), itemKeyword: "spinach",            estimatedDaysFresh: 5,  storageLocation: "refrigerator" },
    { id: uid(), itemKeyword: "berries",            estimatedDaysFresh: 4,  storageLocation: "refrigerator" },
    { id: uid(), itemKeyword: "banana",             estimatedDaysFresh: 5 },
    { id: uid(), itemKeyword: "apple",              estimatedDaysFresh: 21, storageLocation: "refrigerator" },
    { id: uid(), itemKeyword: "onion",              estimatedDaysFresh: 30, storageLocation: "pantry" },
    { id: uid(), itemKeyword: "potato",             estimatedDaysFresh: 21, storageLocation: "pantry" },
    { id: uid(), itemKeyword: "frozen vegetable",   estimatedDaysFresh: 180, storageLocation: "freezer" },
    { id: uid(), itemKeyword: "frozen fruit",       estimatedDaysFresh: 180, storageLocation: "freezer" },
    { id: uid(), itemKeyword: "rice",               estimatedDaysFresh: 365, storageLocation: "pantry" },
    { id: uid(), itemKeyword: "canned",             estimatedDaysFresh: 730, storageLocation: "pantry" },
    { id: uid(), itemKeyword: "spice",              estimatedDaysFresh: 365, storageLocation: "pantry" },
    { id: uid(), itemKeyword: "chia",               estimatedDaysFresh: 365, storageLocation: "pantry" },
    { id: uid(), itemKeyword: "protein powder",     estimatedDaysFresh: 365, storageLocation: "pantry" },
    { id: uid(), itemKeyword: "almond milk",        estimatedDaysFresh: 10, storageLocation: "refrigerator" }
  ];

  const mkItem = (
    name: string, category: string, location: string, boughtDaysAgo: number,
    opts: Partial<import("./types").InventoryItem> = {}
  ): InventoryItem => ({
    id: uid(), name, category, location,
    purchaseDate: new Date(Date.now() - boughtDaysAgo * 86400000).toISOString().slice(0, 10),
    expirationOverride: false, opened: false, lowStock: false,
    useSoon: false, useFirst: false, usedUp: false,
    createdAt: daysAgo(boughtDaysAgo), updatedAt: daysAgo(boughtDaysAgo),
    ...opts
  });

  const seedInventoryItems: InventoryItem[] = [
    mkItem("Rotisserie chicken", "Protein", "Refrigerator", 2, { useFirst: true, opened: true, quantity: 1, unit: "whole", notes: "Half eaten. Use today or tomorrow." }),
    mkItem("Eggs", "Protein", "Refrigerator", 5, { quantity: 9, unit: "count" }),
    mkItem("Greek yogurt", "Dairy", "Refrigerator", 3, { quantity: 24, unit: "oz", opened: true }),
    mkItem("Spinach", "Produce", "Refrigerator", 4, { useSoon: true, quantity: 3, unit: "oz", notes: "Getting wilty. Use in a smoothie today." }),
    mkItem("Almond milk", "Dairy", "Refrigerator", 6, { quantity: 0.5, unit: "half gallon", opened: true, lowStock: true }),
    mkItem("Bananas", "Produce", "Fruit bowl", 3, { useSoon: true, quantity: 3, unit: "count" }),
    mkItem("Onions", "Produce", "Pantry", 7, { quantity: 3, unit: "count" }),
    mkItem("Frozen berries", "Frozen", "Freezer 1", 30, { quantity: 1, unit: "16-oz bag" }),
    mkItem("Chia seeds", "Supplements", "Pantry", 60, { quantity: 10, unit: "oz" }),
    mkItem("Rice", "Grains", "Pantry", 90, { quantity: 3, unit: "lb" }),
    mkItem("Canned beans", "Pantry", "Pantry", 30, { quantity: 3, unit: "cans" }),
    mkItem("Olive oil", "Condiments", "Pantry", 30, { quantity: 0.75, unit: "bottle", opened: true }),
    mkItem("Paper towels", "Household", "Other", 14, { quantity: 4, unit: "rolls" }),
    mkItem("Toilet paper", "Household", "Bathroom", 14, { quantity: 6, unit: "rolls" })
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
    weights, bps, hume, meals, insights,
    smoothies,
    smoothiePrefs: { likes: ["mango", "ginger", "strawberry", "spinach"], dislikes: ["kale", "celery"], equipmentAvailable: ["blender"] },
    smoothieHistory,
    smoothieGrocery,
    recipes: seedRecipes,
    weeklyPlans: seedWeeklyPlans,
    groceryItems: seedGroceryItems,
    prepTasks: seedPrepTasks,
    inventoryItems: seedInventoryItems,
    inventoryLocations: seedInventoryLocations,
    inventoryCategories: seedInventoryCategories,
    expirationRules: seedExpirationRules
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

// Smoothie mutators
export const addSmoothie = (s: SmoothieRecipe) =>
  mutate((db) => ({ ...db, smoothies: [s, ...db.smoothies] }));
export const updateSmoothie = (id: string, patch: Partial<SmoothieRecipe>) =>
  mutate((db) => ({ ...db, smoothies: db.smoothies.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
export const removeSmoothie = (id: string) =>
  mutate((db) => ({ ...db, smoothies: db.smoothies.filter((s) => s.id !== id) }));
export const setSmoothiePrefs = (p: SmoothiePreference) =>
  mutate((db) => ({ ...db, smoothiePrefs: p }));
export const addSmoothieHistory = (h: SmoothieHistoryEntry) =>
  mutate((db) => ({ ...db, smoothieHistory: [h, ...db.smoothieHistory] }));
export const removeSmoothieHistory = (id: string) =>
  mutate((db) => ({ ...db, smoothieHistory: db.smoothieHistory.filter((h) => h.id !== id) }));
export const setSmoothieGrocery = (g: SmoothieGroceryItem[]) =>
  mutate((db) => ({ ...db, smoothieGrocery: g }));

// Food planning mutators
export const addRecipe = (r: Recipe) => mutate((db) => ({ ...db, recipes: [r, ...db.recipes] }));
export const updateRecipe = (id: string, patch: Partial<Recipe>) =>
  mutate((db) => ({ ...db, recipes: db.recipes.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
export const removeRecipe = (id: string) =>
  mutate((db) => ({ ...db, recipes: db.recipes.filter((r) => r.id !== id) }));

export const addWeeklyPlan = (p: WeeklyPlan) =>
  mutate((db) => ({ ...db, weeklyPlans: [p, ...db.weeklyPlans] }));
export const updateWeeklyPlan = (id: string, patch: Partial<WeeklyPlan>) =>
  mutate((db) => ({ ...db, weeklyPlans: db.weeklyPlans.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
export const removeWeeklyPlan = (id: string) =>
  mutate((db) => ({ ...db, weeklyPlans: db.weeklyPlans.filter((p) => p.id !== id) }));
export const upsertPlannedMeal = (planId: string, meal: PlannedMeal) =>
  mutate((db) => ({
    ...db,
    weeklyPlans: db.weeklyPlans.map((p) => {
      if (p.id !== planId) return p;
      const existing = p.days.find((d) => d.date === meal.date && d.slot === meal.slot);
      const days = existing
        ? p.days.map((d) => (d.date === meal.date && d.slot === meal.slot ? meal : d))
        : [...p.days, meal];
      return { ...p, days, updatedAt: new Date().toISOString() };
    })
  }));
export const removePlannedMeal = (planId: string, date: string, slot: MealSlot) =>
  mutate((db) => ({
    ...db,
    weeklyPlans: db.weeklyPlans.map((p) =>
      p.id !== planId ? p : { ...p, days: p.days.filter((d) => !(d.date === date && d.slot === slot)), updatedAt: new Date().toISOString() }
    )
  }));

export const addGroceryItem = (item: GroceryItem) =>
  mutate((db) => ({ ...db, groceryItems: [item, ...db.groceryItems] }));
export const addGroceryItems = (items: GroceryItem[]) =>
  mutate((db) => ({ ...db, groceryItems: [...items, ...db.groceryItems] }));
export const updateGroceryItem = (id: string, patch: Partial<GroceryItem>) =>
  mutate((db) => ({ ...db, groceryItems: db.groceryItems.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
export const removeGroceryItem = (id: string) =>
  mutate((db) => ({ ...db, groceryItems: db.groceryItems.filter((g) => g.id !== id) }));
export const clearBoughtGroceryItems = () =>
  mutate((db) => ({ ...db, groceryItems: db.groceryItems.filter((g) => !g.bought) }));

export const addPrepTask = (t: PrepTask) =>
  mutate((db) => ({ ...db, prepTasks: [t, ...db.prepTasks] }));
export const updatePrepTask = (id: string, patch: Partial<PrepTask>) =>
  mutate((db) => ({ ...db, prepTasks: db.prepTasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
export const removePrepTask = (id: string) =>
  mutate((db) => ({ ...db, prepTasks: db.prepTasks.filter((t) => t.id !== id) }));

// Kitchen inventory mutators
export const addInventoryItem = (item: InventoryItem) =>
  mutate((db) => ({ ...db, inventoryItems: [item, ...db.inventoryItems] }));
export const updateInventoryItem = (id: string, patch: Partial<InventoryItem>) =>
  mutate((db) => ({ ...db, inventoryItems: db.inventoryItems.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
export const removeInventoryItem = (id: string) =>
  mutate((db) => ({ ...db, inventoryItems: db.inventoryItems.filter((i) => i.id !== id) }));

export const setInventoryLocations = (locations: InventoryLocation[]) =>
  mutate((db) => ({ ...db, inventoryLocations: locations }));
export const addInventoryLocation = (loc: InventoryLocation) =>
  mutate((db) => ({ ...db, inventoryLocations: [...db.inventoryLocations, loc] }));
export const updateInventoryLocation = (id: string, patch: Partial<InventoryLocation>) =>
  mutate((db) => ({ ...db, inventoryLocations: db.inventoryLocations.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
export const removeInventoryLocation = (id: string) =>
  mutate((db) => ({ ...db, inventoryLocations: db.inventoryLocations.filter((l) => l.id !== id) }));

export const addInventoryCategory = (cat: InventoryCategory) =>
  mutate((db) => ({ ...db, inventoryCategories: [...db.inventoryCategories, cat] }));
export const updateInventoryCategory = (id: string, patch: Partial<InventoryCategory>) =>
  mutate((db) => ({ ...db, inventoryCategories: db.inventoryCategories.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
export const removeInventoryCategory = (id: string) =>
  mutate((db) => ({ ...db, inventoryCategories: db.inventoryCategories.filter((c) => c.id !== id) }));
