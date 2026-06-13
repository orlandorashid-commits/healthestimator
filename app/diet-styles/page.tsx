"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { Badge, Button, Card, PageHeader, SectionTitle, cx } from "@/components/ui";
import { setGoals, useDB } from "@/lib/store";

interface DietStyle {
  id: string;
  name: string;
  short: string;
  eats: string;
  avoids: string;
  bestFor: string;
  hardParts: string;
  proteinNote?: string;
  staples: string;
  exampleMeal: string;
  tone: "pine" | "sage" | "sea" | "amber" | "food";
}

const DIETS: DietStyle[] = [
  {
    id: "mediterranean",
    name: "Mediterranean",
    short: "Olive oil, vegetables, fish, legumes, and whole grains as the foundation.",
    eats: "Vegetables, fruits, whole grains, legumes, fish, olive oil, nuts, eggs, and moderate dairy.",
    avoids: "Red meat most days, ultra-processed food, refined sugars, and industrial seed oils.",
    bestFor: "Heart health, longevity, sustainable weight loss, and people who enjoy varied and flavorful food.",
    hardParts: "Can be calorie-dense if olive oil is poured generously. Requires some planning at restaurants.",
    proteinNote: "Fish and legumes provide solid protein, but hitting targets above 150g per day takes intentional planning.",
    staples: "Olive oil, canned salmon, lentils, chickpeas, eggs, feta, whole grain bread, tomatoes, leafy greens.",
    exampleMeal: "Grilled salmon over a warm lentil salad with olive oil, lemon, roasted peppers, and arugula.",
    tone: "pine"
  },
  {
    id: "paleo",
    name: "Paleo",
    short: "Eat like a hunter-gatherer. Meat, fish, vegetables, fruit, nuts, and nothing from farming.",
    eats: "Meat, fish, eggs, vegetables, fruit, nuts, seeds, and tubers.",
    avoids: "Grains, legumes, dairy, refined sugar, and processed food of any kind.",
    bestFor: "People who feel better without grains or dairy, and those who want clean unprocessed eating.",
    hardParts: "Expensive, socially restrictive, and eliminates convenient whole foods like oats and beans.",
    proteinNote: "Naturally high in protein from meat and fish.",
    staples: "Grass-fed beef, eggs, sweet potatoes, almonds, avocados, berries, and a variety of vegetables.",
    exampleMeal: "Grass-fed beef patty on a lettuce wrap with roasted sweet potato and avocado slices.",
    tone: "amber"
  },
  {
    id: "vegetarian",
    name: "Vegetarian",
    short: "No meat or fish. Eggs and dairy stay in.",
    eats: "Vegetables, fruits, grains, legumes, eggs, dairy, nuts, and seeds.",
    avoids: "Meat and fish in all forms.",
    bestFor: "People reducing meat for health or ethical reasons while keeping flexible options.",
    hardParts: "Easy to over-rely on refined carbs and cheese. Protein needs intentional sourcing.",
    proteinNote: "Eggs, Greek yogurt, cottage cheese, and legumes are the reliable protein levers.",
    staples: "Eggs, lentils, chickpeas, Greek yogurt, quinoa, cheese, nuts, and hearty vegetables.",
    exampleMeal: "Scrambled eggs with sauteed spinach, feta, and a side of lentil soup.",
    tone: "sage"
  },
  {
    id: "vegan",
    name: "Vegan",
    short: "No animal products at all. Plants carry the entire plate.",
    eats: "All vegetables, fruits, grains, legumes, nuts, seeds, and plant-based proteins.",
    avoids: "Meat, fish, dairy, eggs, and any product derived from animals.",
    bestFor: "People committed to plant-based eating for health, environmental, or ethical reasons.",
    hardParts: "Protein targets above 120g per day are difficult. B12, zinc, omega-3, and iron all need monitoring.",
    proteinNote: "Requires deliberate stacking of legumes, tofu, tempeh, edamame, and protein powder to hit high targets.",
    staples: "Lentils, black beans, tofu, tempeh, edamame, nutritional yeast, oats, and mixed nuts.",
    exampleMeal: "Tofu scramble with nutritional yeast, black beans, peppers, and whole grain toast.",
    tone: "sage"
  },
  {
    id: "pescatarian",
    name: "Pescatarian",
    short: "Vegetarian base, with fish and seafood added.",
    eats: "Fish, seafood, vegetables, grains, legumes, eggs, and dairy.",
    avoids: "Meat from land animals.",
    bestFor: "People who want the benefits of a plant-heavy diet without giving up omega-3-rich fish.",
    hardParts: "Finding quality fish consistently. Seafood mercury load worth tracking if eating daily.",
    proteinNote: "Salmon, sardines, shrimp, and canned tuna make hitting protein targets straightforward.",
    staples: "Salmon, sardines, shrimp, tuna, lentils, eggs, whole grains, and plenty of vegetables.",
    exampleMeal: "Seared salmon with roasted vegetables, quinoa, and a lemon-herb sauce.",
    tone: "sea"
  },
  {
    id: "carnivore",
    name: "Carnivore",
    short: "Only animal products. No plants at all.",
    eats: "Beef, pork, chicken, fish, eggs, butter, and some dairy.",
    avoids: "All plant foods: vegetables, fruits, grains, legumes, nuts, and seeds.",
    bestFor: "People with autoimmune issues or digestive problems who want to eliminate plant compounds.",
    hardParts: "Extremely restrictive socially. Long-term micronutrient gaps are a real concern. No fiber.",
    proteinNote: "Protein intake is naturally very high on this approach.",
    staples: "Ribeye, ground beef, eggs, bacon, butter, salmon, and organ meats.",
    exampleMeal: "Ribeye steak with eggs cooked in butter.",
    tone: "amber"
  },
  {
    id: "keto",
    name: "Keto",
    short: "Very low carbs push the body into fat-burning mode.",
    eats: "Meat, fish, eggs, cheese, butter, cream, low-carb vegetables, nuts, and avocado.",
    avoids: "Bread, pasta, rice, sugar, most fruit, beans, and starchy vegetables.",
    bestFor: "Rapid fat loss, appetite suppression, blood sugar control, and metabolic reset.",
    hardParts: "Keto flu in week one is common. Socially restrictive. Requires careful tracking.",
    proteinNote: "Moderate protein. Too much can blunt ketosis. Fat is the primary fuel.",
    staples: "Eggs, beef, pork, cheese, butter, avocado, spinach, broccoli, nuts, and heavy cream.",
    exampleMeal: "Three-egg omelet with cheese, bacon, and sauteed spinach in butter.",
    tone: "food"
  },
  {
    id: "low-carb",
    name: "Low Carb",
    short: "Fewer carbs than the standard diet, without going fully keto.",
    eats: "Meat, fish, eggs, non-starchy vegetables, dairy, nuts, and some legumes.",
    avoids: "Bread, pasta, white rice, sweets, and sugary drinks.",
    bestFor: "Blood sugar management, steady energy, and weight loss without full keto restriction.",
    hardParts: "Defining your actual carb limit takes some trial and error.",
    proteinNote: "Protein tends to be higher naturally, which supports muscle retention during weight loss.",
    staples: "Eggs, meat, fish, low-carb vegetables, full-fat dairy, and nuts.",
    exampleMeal: "Grilled chicken thigh with roasted broccoli, cauliflower mash, and olive oil.",
    tone: "food"
  },
  {
    id: "low-glycemic",
    name: "Low Glycemic",
    short: "Choose foods that raise blood sugar slowly and steadily.",
    eats: "Legumes, non-starchy vegetables, most fruits, whole grains, nuts, and lean proteins.",
    avoids: "White bread, white rice, sugary drinks, and highly processed snacks.",
    bestFor: "Steady energy, reducing cravings, managing insulin, and people with pre-diabetes.",
    hardParts: "Glycemic index is context-dependent. Portion size and combinations matter as much as the food itself.",
    staples: "Lentils, chickpeas, steel-cut oats, berries, apples, nuts, eggs, and fish.",
    exampleMeal: "Steel-cut oats with walnuts, berries, and a side of scrambled eggs.",
    tone: "pine"
  },
  {
    id: "dash",
    name: "DASH-Style",
    short: "Designed to lower blood pressure. High in vegetables, fruit, and low-fat dairy.",
    eats: "Vegetables, fruits, whole grains, low-fat dairy, lean proteins, nuts, and seeds.",
    avoids: "High-sodium foods, red meat in excess, sugary beverages, and saturated fat.",
    bestFor: "Lowering blood pressure, heart disease risk reduction, and general cardiovascular health.",
    hardParts: "Low-sodium eating takes adjustment. Restaurant meals are difficult to control.",
    proteinNote: "Protein is adequate but targets above 140g per day require deliberate planning.",
    staples: "Leafy greens, berries, low-fat yogurt, fish, chicken, whole grains, and unsalted nuts.",
    exampleMeal: "Baked chicken breast with roasted vegetables, brown rice, and a side salad with olive oil.",
    tone: "sea"
  },
  {
    id: "plant-forward",
    name: "Plant-Forward",
    short: "Plants dominate the plate. Meat is a supporting role, not the star.",
    eats: "Vegetables, legumes, whole grains, and nuts as the base. Small amounts of meat or fish as additions.",
    avoids: "Nothing strictly, but animal protein is kept minimal and treated as a condiment.",
    bestFor: "People who want to eat more plants without committing to vegetarianism.",
    hardParts: "Protein targets are achievable but require conscious planning around legumes and grains.",
    proteinNote: "Beans, lentils, edamame, and small amounts of meat or fish together cover most targets.",
    staples: "Legumes, grains, leafy greens, tofu, small amounts of chicken or fish, and nuts.",
    exampleMeal: "Grain bowl with roasted vegetables, chickpeas, tahini, and a few strips of grilled chicken.",
    tone: "sage"
  },
  {
    id: "high-protein",
    name: "High Protein",
    short: "Protein at every meal to build muscle, reduce hunger, and protect lean mass.",
    eats: "Lean meats, fish, eggs, dairy, legumes, and protein supplements as needed.",
    avoids: "Nothing strictly, but calorie-dense low-protein foods are minimized.",
    bestFor: "Building or maintaining muscle, weight loss with body composition goals, and managing hunger.",
    hardParts: "Very high protein (200g+) can be hard on the digestive system. Variety helps.",
    proteinNote: "The entire goal. Target is usually 0.7 to 1g per pound of body weight.",
    staples: "Chicken breast, Greek yogurt, cottage cheese, eggs, canned tuna, protein powder, and legumes.",
    exampleMeal: "Grilled chicken breast with Greek yogurt dipping sauce, a large salad, and a side of lentils.",
    tone: "amber"
  },
  {
    id: "whole-food",
    name: "Whole-Food Reset",
    short: "If it comes in a wrapper with a mascot, it waits.",
    eats: "Whole, minimally processed food only. Vegetables, fruits, grains, meat, fish, eggs, and nuts.",
    avoids: "Ultra-processed food, food dyes, preservatives, fast food, and anything with more than five ingredients.",
    bestFor: "Resetting eating habits, reducing processed food dependency, and improving energy and digestion.",
    hardParts: "Requires more cooking and planning. Convenience food is mostly off the table.",
    proteinNote: "Protein is easy to hit when cooking whole foods: eggs, meat, fish, and legumes are all whole foods.",
    staples: "Eggs, meat, fish, vegetables, fruit, whole grains, legumes, nuts, and olive oil.",
    exampleMeal: "Baked salmon with roasted sweet potato, steamed broccoli, and a drizzle of olive oil.",
    tone: "sage"
  },
  {
    id: "intermittent-fasting",
    name: "Intermittent Fasting",
    short: "A structured eating window. Not what you eat, but when.",
    eats: "Any food during the eating window. Most popular: 16-hour fast, 8-hour eating window.",
    avoids: "Calories outside the eating window. Water, black coffee, and tea are fine during fasting hours.",
    bestFor: "Appetite control, fat loss, metabolic health, and people who prefer fewer meals.",
    hardParts: "Morning hunger takes adjustment. Difficult on social schedules. Not ideal for heavy training.",
    proteinNote: "Fitting enough protein into a compressed window requires attention. Prioritize protein-dense meals.",
    staples: "Whatever you normally eat, compressed into the window. First meal is often a large protein-rich meal.",
    exampleMeal: "First meal at noon: large omelet with vegetables, followed by a normal dinner.",
    tone: "pine"
  },
  {
    id: "two-meal",
    name: "Two-Meal-per-Day",
    short: "Two solid meals a day, inside a clear eating window.",
    eats: "Two complete, satisfying meals. No snacking between them.",
    avoids: "Grazing, snacking, and the third meal. Eating outside the two-meal window.",
    bestFor: "Simplifying the eating day, reducing overall intake naturally, and people who do well without breakfast.",
    hardParts: "Each meal needs to be complete and filling enough to last. Skipping snacks takes adjustment.",
    proteinNote: "Each meal should carry significant protein to keep hunger at bay until the next meal.",
    staples: "Large, protein-centered meals: eggs and meat in the first, protein and vegetables in the second.",
    exampleMeal: "Meal one at noon: ground beef bowl with vegetables and rice. Meal two at 6pm: salmon with salad.",
    tone: "food"
  }
];

const toneLabel: Record<string, string> = {
  pine: "bg-pine-soft text-pine-deep",
  sage: "bg-sage-soft text-sage-dark",
  sea: "bg-sea-soft text-sea-dark",
  amber: "bg-amber-soft text-amber-dark",
  food: "bg-food-soft text-food-dark"
};

function DietCard({ diet, activeExperiment, onSet }: {
  diet: DietStyle;
  activeExperiment?: string;
  onSet: (name: string, label: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const isActive = activeExperiment === diet.name;

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-ink text-base">{diet.name}</h3>
            {isActive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-pine-soft text-pine-deep text-[11px] font-bold uppercase tracking-wide px-2.5 py-0.5 border border-pine/20">
                <Check size={10} /> Active
              </span>
            )}
          </div>
          <p className="text-sm text-muted mt-0.5">{diet.short}</p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex-shrink-0 text-faint hover:text-ink transition-colors mt-0.5"
          aria-label={open ? "Collapse" : "Expand"}
        >
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {open && (
        <div className="space-y-3 pt-1 border-t border-line/60">
          <Row label="Usually eats" value={diet.eats} />
          <Row label="Usually avoids" value={diet.avoids} />
          <Row label="Best for" value={diet.bestFor} />
          <Row label="Hard parts" value={diet.hardParts} />
          {diet.proteinNote && <Row label="Protein note" value={diet.proteinNote} />}
          <Row label="Grocery staples" value={diet.staples} />
          <div>
            <p className="label-tick mb-1">Example meal</p>
            <p className={cx(
              "rounded-xl p-3 text-sm font-medium",
              toneLabel[diet.tone]
            )}>
              {diet.exampleMeal}
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1 flex-wrap">
        <Button
          variant="primary"
          className="text-xs px-3 py-2"
          onClick={() => onSet(diet.name, "7-day trial")}
        >
          {isActive ? "Active experiment" : "Try for 7 days"}
        </Button>
        <Button
          variant="secondary"
          className="text-xs px-3 py-2"
          onClick={() => onSet(diet.name, "experiment")}
        >
          Add to experiment
        </Button>
      </div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label-tick mb-0.5">{label}</p>
      <p className="text-sm text-ink">{value}</p>
    </div>
  );
}

export default function DietStylesPage() {
  const { db, ready } = useDB();
  const [justSet, setJustSet] = useState<string | null>(null);

  function handleSet(name: string, label: string) {
    setGoals({ ...db.goals, experiment: `${name} (${label})` });
    setJustSet(name);
    setTimeout(() => setJustSet(null), 2500);
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Diet Styles"
        sub="A reference for 15 evidence-informed eating approaches. Tap any card to read the details, then set one as your active experiment."
      />

      {justSet && (
        <div className="rounded-xl bg-pine-soft border border-pine/20 px-4 py-3 text-sm font-semibold text-pine-deep flex items-center gap-2">
          <Check size={16} />
          {justSet} saved as your active experiment. View it in Goals.
        </div>
      )}

      {ready && db.goals.experiment && (
        <div className="rounded-xl bg-surface border border-line px-4 py-3 text-sm text-muted">
          Current experiment: <span className="font-semibold text-ink">{db.goals.experiment}</span>
        </div>
      )}

      <section className="space-y-3">
        <SectionTitle>All diet styles</SectionTitle>
        {DIETS.map((diet) => (
          <DietCard
            key={diet.id}
            diet={diet}
            activeExperiment={
              db.goals.experiment
                ? db.goals.experiment.replace(/ \(.*\)$/, "")
                : undefined
            }
            onSet={handleSet}
          />
        ))}
      </section>
    </div>
  );
}
