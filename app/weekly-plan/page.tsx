"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react";
import {
  Badge, Button, Card, EmptyState, Field, Input, PageHeader, SectionTitle, Select, cx
} from "@/components/ui";
import {
  addGroceryItems, addPrepTask, addWeeklyPlan, removePlannedMeal,
  removeWeeklyPlan, uid, updateWeeklyPlan, upsertPlannedMeal, useDB
} from "@/lib/store";
import type {
  FoodCategory, GroceryItem, MealSlot, PlannedMeal, PrepTask, PrepCategory, WeekMealPattern, WeeklyPlan
} from "@/lib/types";

const PATTERNS: WeekMealPattern[] = [
  "smoothie + lunch + dinner", "smoothie + dinner", "lunch + dinner", "custom"
];
const DIET_FOCUSES = [
  "Mediterranean","High Protein","Low Glycemic","Plant-Forward","Whole-Food Reset","No focus"
];
const DAY_NAMES = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

function getWeekDates(startDate: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate + "T12:00:00");
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function thisMondayISO(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function slotsForPattern(pattern: WeekMealPattern): MealSlot[] {
  if (pattern === "smoothie + lunch + dinner") return ["smoothie", "lunch", "dinner"];
  if (pattern === "smoothie + dinner") return ["smoothie", "dinner"];
  if (pattern === "lunch + dinner") return ["lunch", "dinner"];
  return ["smoothie", "lunch", "dinner"];
}

function SlotRow({
  date, slot, meal, plan, recipes, smoothies, onClear, sourceFilter
}: {
  date: string; slot: MealSlot; meal?: PlannedMeal; plan: WeeklyPlan;
  recipes: ReturnType<typeof useDB>["db"]["recipes"];
  smoothies: ReturnType<typeof useDB>["db"]["smoothies"];
  onClear: () => void;
  sourceFilter?: string;
}) {
  const [picking, setPicking] = useState(false);
  const [customName, setCustomName] = useState("");

  const recipe = meal?.recipeId ? recipes.find((r) => r.id === meal.recipeId) : undefined;
  const smoothie = meal?.smoothieId ? smoothies.find((s) => s.id === meal.smoothieId) : undefined;
  const mealName = recipe?.name ?? smoothie?.name ?? meal?.customMealName;

  const slotRecipes = slot === "smoothie"
    ? smoothies.map((s) => ({ id: s.id, name: s.name, kind: "smoothie" as const }))
    : recipes
        .filter((r) => {
          if (r.mealSlot !== slot && r.mealSlot !== "flexible") return false;
          if (sourceFilter && sourceFilter !== "all") {
            return r.sourceOrAuthor === sourceFilter || r.sourceId === sourceFilter;
          }
          return true;
        })
        .map((r) => ({ id: r.id, name: r.name, sourceOrAuthor: r.sourceOrAuthor, kind: "recipe" as const }));

  function handleSelect(id: string, kind: "recipe" | "smoothie") {
    upsertPlannedMeal(plan.id, {
      id: meal?.id ?? uid(), date, slot,
      recipeId: kind === "recipe" ? id : undefined,
      smoothieId: kind === "smoothie" ? id : undefined,
      completed: meal?.completed ?? false
    });
    setPicking(false);
  }

  function handleCustom() {
    if (!customName.trim()) return;
    upsertPlannedMeal(plan.id, {
      id: meal?.id ?? uid(), date, slot,
      customMealName: customName.trim(),
      completed: meal?.completed ?? false
    });
    setCustomName("");
    setPicking(false);
  }

  function toggleComplete() {
    if (!meal) return;
    upsertPlannedMeal(plan.id, { ...meal, completed: !meal.completed });
  }

  const slotLabel = slot === "smoothie" ? "Smoothie" : slot.charAt(0).toUpperCase() + slot.slice(1);

  return (
    <div className="flex items-start gap-2 py-1.5 border-t border-line/40 first:border-0">
      <button
        onClick={toggleComplete}
        className={cx(
          "flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
          meal?.completed ? "bg-pine border-pine" : "border-line"
        )}
      >
        {meal?.completed && <Check size={11} className="text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="label-tick">{slotLabel}</p>
        {mealName ? (
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <p className={cx("text-sm font-semibold", meal?.completed && "line-through text-faint")}>
              {mealName}
            </p>
            <button onClick={onClear} className="text-faint hover:text-clay"><X size={12} /></button>
          </div>
        ) : (
          <button
            onClick={() => setPicking(true)}
            className="text-sm text-faint hover:text-pine mt-0.5"
          >
            + {slot === "smoothie" ? "Add smoothie" : `Add ${slot}`}
          </button>
        )}

        {picking && (
          <div className="mt-2 space-y-2">
            <Select
              defaultValue=""
              onChange={(e) => {
                const [kind, id] = e.target.value.split("::");
                if (kind && id) handleSelect(id, kind as "recipe" | "smoothie");
              }}
            >
              <option value="">Select a {slot === "smoothie" ? "smoothie" : "recipe"}...</option>
              {slotRecipes.map((item) => (
                <option key={item.id} value={`${item.kind}::${item.id}`}>{item.name}</option>
              ))}
            </Select>
            <div className="flex gap-2">
              <Input
                placeholder="Or type a custom meal..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCustom(); }}
                className="text-xs"
              />
              <Button variant="secondary" className="text-xs px-2 py-1.5" onClick={handleCustom}>Add</Button>
              <Button variant="ghost" className="text-xs px-2 py-1.5" onClick={() => setPicking(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
      {/* Coming next placeholder */}
      <section className="space-y-2 pt-2">
        <p className="label-tick">Coming next</p>
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-line/60 bg-surface/60 px-4 py-3 opacity-70">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-muted">Use kitchen inventory first</p>
              <span className="text-[10px] font-bold uppercase text-faint bg-line/60 rounded-full px-2 py-0.5">Soon</span>
            </div>
            <p className="text-xs text-faint mt-0.5">Plan meals around what you already have in your Kitchen Inventory.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function DayCard({ date, dayName, plan, recipes, smoothies, sourceFilter }: {
  date: string; dayName: string; plan: WeeklyPlan;
  recipes: ReturnType<typeof useDB>["db"]["recipes"];
  smoothies: ReturnType<typeof useDB>["db"]["smoothies"];
  sourceFilter?: string;
}) {
  const slots = slotsForPattern(plan.mealPattern);
  const dayMeals = plan.days.filter((d) => d.date === date);
  const isToday = date === new Date().toISOString().slice(0, 10);
  const allDone = slots.length > 0 && slots.every((slot) =>
    dayMeals.find((m) => m.slot === slot)?.completed
  );

  return (
    <Card className={cx(isToday && "border-pine/40 bg-pine-soft/20", allDone && "opacity-70")}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className={cx("font-bold text-sm", isToday ? "text-pine-deep" : "text-ink")}>{dayName}</p>
          <p className="text-xs text-faint">{formatDate(date)}</p>
        </div>
        {isToday && <Badge tone="pine">Today</Badge>}
        {allDone && !isToday && <Badge tone="gray">Done</Badge>}
      </div>
      {slots.map((slot) => {
        const meal = dayMeals.find((m) => m.slot === slot);
        return (
          <SlotRow
            key={slot} date={date} slot={slot} meal={meal}
            plan={plan} recipes={recipes} smoothies={smoothies}
            onClear={() => removePlannedMeal(plan.id, date, slot)}
            sourceFilter={sourceFilter}
          />
        );
      })}
    </Card>
  );
}

function NewPlanForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const [name, setName] = useState("This week");
  const [startDate, setStartDate] = useState(thisMondayISO());
  const [dietFocus, setDietFocus] = useState("No focus");
  const [pattern, setPattern] = useState<WeekMealPattern>("smoothie + lunch + dinner");

  function save() {
    addWeeklyPlan({
      id: uid(), name, startDate, dietFocus: dietFocus === "No focus" ? undefined : dietFocus,
      mealPattern: pattern, days: [], notes: "",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });
    onSave();
  }

  return (
    <Card className="space-y-4 border-pine/30">
      <p className="font-bold text-pine-deep">Create a weekly plan</p>
      <Field label="Plan name">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="This week" />
      </Field>
      <Field label="Start date (Monday)">
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Diet focus">
          <Select value={dietFocus} onChange={(e) => setDietFocus(e.target.value)}>
            {DIET_FOCUSES.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
        </Field>
        <Field label="Meal pattern">
          <Select value={pattern} onChange={(e) => setPattern(e.target.value as WeekMealPattern)}>
            {PATTERNS.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </Field>
      </div>
      <div className="flex gap-2">
        <Button className="flex-1" onClick={save}><Check size={15} /> Create plan</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
  );
}

export default function WeeklyPlanPage() {
  const { db, ready } = useDB();
  const [planIdx, setPlanIdx] = useState(0);
  const [showNew, setShowNew] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState("all");

  const plans = db.weeklyPlans ?? [];
  const recipes = db.recipes ?? [];
  const smoothies = db.smoothies ?? [];
  const recipeSources = db.recipeSources ?? [];
  const sourceOptions = Array.from(new Set(recipes.map((r) => r.sourceOrAuthor).filter(Boolean))) as string[];

  const plan = plans[planIdx];
  const weekDates = plan ? getWeekDates(plan.startDate) : [];

  const toast = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 3000); };

  function generateGrocery() {
    if (!plan) return;
    const now = new Date().toISOString();
    const items: GroceryItem[] = [];
    const seen = new Set<string>();

    for (const meal of plan.days) {
      if (meal.recipeId) {
        const r = recipes.find((x) => x.id === meal.recipeId);
        if (r) {
          for (const ing of r.ingredients) {
            const key = ing.name.toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              items.push({
                id: uid(), name: `${ing.quantity} ${ing.unit} ${ing.name}`.trim(),
                category: ing.category, sourceRecipeIds: [r.id], sourceSmoothieIds: [],
                alreadyHave: false, bought: false, pushToNextTrip: false,
                createdAt: now, updatedAt: now
              });
            }
          }
        }
      }
      if (meal.smoothieId) {
        const s = smoothies.find((x) => x.id === meal.smoothieId);
        if (s) {
          for (const ing of s.ingredients) {
            const key = ing.name.toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              items.push({
                id: uid(), name: `${ing.quantity} ${ing.unit} ${ing.name}`.trim(),
                category: "Other" as FoodCategory, sourceRecipeIds: [], sourceSmoothieIds: [s.id],
                alreadyHave: false, bought: false, pushToNextTrip: false,
                createdAt: now, updatedAt: now
              });
            }
          }
        }
      }
    }

    addGroceryItems(items);
    toast(`${items.length} item${items.length !== 1 ? "s" : ""} added to Grocery List.`);
  }

  function generatePrep() {
    if (!plan) return;
    const now = new Date().toISOString();
    const monday = plan.startDate;

    const recipeIds = Array.from(new Set(plan.days.filter((d) => d.recipeId).map((d) => d.recipeId!)));
    const smoothieIds = Array.from(new Set(plan.days.filter((d) => d.smoothieId).map((d) => d.smoothieId!)));

    const tasks: PrepTask[] = [];
    if (recipeIds.length > 0) {
      tasks.push({
        id: uid(), title: "Shop for the week",
        category: "Shopping" as PrepCategory, relatedRecipeIds: recipeIds, relatedSmoothieIds: smoothieIds,
        scheduledDate: monday, estimatedMinutes: 45, completed: false, createdAt: now, updatedAt: now
      });
      tasks.push({
        id: uid(), title: "Wash and chop vegetables",
        category: "Chopping" as PrepCategory, relatedRecipeIds: recipeIds, relatedSmoothieIds: [],
        scheduledDate: monday, estimatedMinutes: 30, completed: false, createdAt: now, updatedAt: now
      });
    }
    if (smoothieIds.length > 0) {
      tasks.push({
        id: uid(), title: "Portion smoothie ingredients into freezer bags",
        category: "Smoothie prep" as PrepCategory, relatedRecipeIds: [], relatedSmoothieIds: smoothieIds,
        scheduledDate: monday, estimatedMinutes: 20, completed: false,
        notes: "One bag per morning. Grab, add liquid, blend.",
        createdAt: now, updatedAt: now
      });
    }

    for (const id of recipeIds) {
      const r = recipes.find((x) => x.id === id);
      if (r && r.tags.includes("good leftovers")) {
        tasks.push({
          id: uid(), title: `Cook ${r.name} for the week`,
          category: "Cooking protein" as PrepCategory, relatedRecipeIds: [id], relatedSmoothieIds: [],
          scheduledDate: monday, estimatedMinutes: (r.prepTimeMinutes ?? 0) + (r.cookTimeMinutes ?? 0),
          completed: false,
          notes: r.tags.includes("uses Pyrex") ? "Store in Pyrex. Portion for weekday meals." : undefined,
          createdAt: now, updatedAt: now
        });
      }
    }

    tasks.forEach((t) => addPrepTask(t));
    toast(`${tasks.length} prep task${tasks.length !== 1 ? "s" : ""} added to Prep Schedule.`);
  }

  if (!ready) return <div className="page-container"><PageHeader title="Weekly Plan" /></div>;

  return (
    <div className="page-container">
      <PageHeader title="Weekly Plan" sub="Plan your meals for the week, then generate a grocery list and prep checklist." />

      {msg && (
        <div className="flex items-center gap-2 rounded-xl bg-pine-soft border border-pine/20 px-4 py-3 text-sm font-semibold text-pine-deep">
          <Check size={16} /> {msg}
        </div>
      )}

      {showNew ? (
        <NewPlanForm onSave={() => { setShowNew(false); setPlanIdx(0); }} onCancel={() => setShowNew(false)} />
      ) : plans.length === 0 ? (
        <EmptyState
          title="No weekly plans yet"
          body="Create a plan and assign recipes and smoothies to each day."
          action={<Button onClick={() => setShowNew(true)}><Plus size={15} /> Create plan</Button>}
        />
      ) : (
        <>
          {/* Plan selector */}
          <div className="flex items-center gap-3">
            <button onClick={() => setPlanIdx(Math.max(0, planIdx - 1))} disabled={planIdx === 0} className="text-faint hover:text-ink disabled:opacity-30">
              <ChevronLeft size={20} />
            </button>
            <div className="flex-1 text-center">
              <p className="font-bold text-ink">{plan.name}</p>
              <p className="text-xs text-faint">
                {formatDate(plan.startDate)} to {formatDate(weekDates[6] ?? plan.startDate)}
                {plan.dietFocus && ` · ${plan.dietFocus}`}
              </p>
            </div>
            <button onClick={() => setPlanIdx(Math.min(plans.length - 1, planIdx + 1))} disabled={planIdx === plans.length - 1} className="text-faint hover:text-ink disabled:opacity-30">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setShowNew(true)}><Plus size={14} /> New plan</Button>
            <Button variant="ghost" onClick={() => { removeWeeklyPlan(plan.id); setPlanIdx(0); }}>
              <Trash2 size={14} /> Delete plan
            </Button>
            <Button variant="primary" className="col-span-2" onClick={generateGrocery}>
              Generate grocery list from plan
            </Button>
            <Button variant="secondary" className="col-span-2" onClick={generatePrep}>
              Send prep items to Prep Schedule
            </Button>
          </div>

          {/* Source filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted font-semibold">Filter recipes by source:</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs text-ink focus:border-pine focus:outline-none"
            >
              <option value="all">All sources</option>
              {recipeSources.map((s) => (
                <option key={s.id} value={s.id}>{s.name}{s.author && s.author !== s.name ? " - "+s.author : ""}</option>
              ))}
              {sourceOptions.filter((s) => !recipeSources.some((rs) => rs.name === s || rs.author === s)).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Day cards */}
          <section className="space-y-3">
            {weekDates.map((date, i) => (
              <DayCard
                key={date} date={date} dayName={DAY_NAMES[i]}
                plan={plan} recipes={recipes} smoothies={smoothies}
                sourceFilter={sourceFilter}
              />
            ))}
          </section>
        </>
      )}
    </div>
  );
}
