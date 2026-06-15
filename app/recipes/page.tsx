"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Copy, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  Badge, Button, Card, Chip, cx, EmptyState, Field,
  Input, PageHeader, SectionTitle, Select, Textarea
} from "@/components/ui";
import { addGroceryItems, addRecipe, removeRecipe, uid, updateRecipe, upsertPlannedMeal, useDB } from "@/lib/store";
import { todayISO } from "@/lib/utils";
import type {
  FoodCategory, MealSlot, Recipe, RecipeCategory, RecipeIngredient, WeekMealPattern
} from "@/lib/types";

const SLOTS: MealSlot[] = ["smoothie", "lunch", "dinner", "flexible"];
const CATEGORIES: RecipeCategory[] = [
  "Smoothie","Lunch","Dinner","Dessert","Casserole",
  "Friend gathering","Meal prep","Side dish","Sauce","Quick meal","Other"
];
const FOOD_CATS: FoodCategory[] = [
  "Produce","Protein","Dairy","Frozen","Pantry","Grains","Spices","Condiments","Drinks","Supplements","Other"
];
const SOURCES = ["Personal recipe","Mark Hyman","Mediterranean source","Smoothie library","AI generated","Other"];
const DIET_STYLES = [
  "Mediterranean","Paleo","Vegetarian","Vegan","Pescatarian","Carnivore",
  "Keto","Low Carb","Low Glycemic","DASH-style","Plant-Forward","High Protein",
  "Whole-Food Reset","Intermittent Fasting","Two-Meal-per-Day"
];
const COMMON_TAGS = [
  "high protein","vegetarian","mediterranean","low glycemic","good leftovers",
  "freezer friendly","easy prep","uses Pyrex","friend gathering","quick meal"
];

interface RecipeForm {
  name: string; sourceOrAuthor: string; dietStyle: string;
  mealSlot: MealSlot; category: RecipeCategory;
  ingLines: string; instructionLines: string;
  prepTime: string; cookTime: string; servings: string;
  calories: string; protein: string;
  tagInput: string; tags: string[]; notes: string;
}

function emptyForm(): RecipeForm {
  return {
    name: "", sourceOrAuthor: "Personal recipe", dietStyle: "",
    mealSlot: "dinner", category: "Dinner",
    ingLines: "", instructionLines: "",
    prepTime: "", cookTime: "", servings: "",
    calories: "", protein: "",
    tagInput: "", tags: [], notes: ""
  };
}

function parseIngLines(text: string): RecipeIngredient[] {
  return text.split("\n").filter(Boolean).map((line) => {
    const parts = line.trim().split(/\s+/);
    return {
      id: uid(),
      quantity: parts[0] ?? "",
      unit: parts[1] ?? "",
      name: parts.slice(2).join(" "),
      category: "Other" as FoodCategory
    };
  });
}

function ingToText(ings: RecipeIngredient[]): string {
  return ings.map((i) => `${i.quantity} ${i.unit} ${i.name}`.trim()).join("\n");
}

function recipeToForm(r: Recipe): RecipeForm {
  return {
    name: r.name, sourceOrAuthor: r.sourceOrAuthor ?? "", dietStyle: r.dietStyle ?? "",
    mealSlot: r.mealSlot, category: r.category,
    ingLines: ingToText(r.ingredients), instructionLines: r.instructions.join("\n"),
    prepTime: r.prepTimeMinutes?.toString() ?? "", cookTime: r.cookTimeMinutes?.toString() ?? "",
    servings: r.servings?.toString() ?? "",
    calories: r.estimatedCalories?.toString() ?? "", protein: r.estimatedProtein?.toString() ?? "",
    tagInput: "", tags: [...r.tags], notes: r.notes ?? ""
  };
}

function formToRecipe(f: RecipeForm, existing?: Recipe): Recipe {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? uid(),
    name: f.name, sourceOrAuthor: f.sourceOrAuthor || undefined,
    dietStyle: f.dietStyle || undefined, mealSlot: f.mealSlot, category: f.category,
    ingredients: parseIngLines(f.ingLines),
    instructions: f.instructionLines.split("\n").filter(Boolean),
    prepTimeMinutes: f.prepTime ? +f.prepTime : undefined,
    cookTimeMinutes: f.cookTime ? +f.cookTime : undefined,
    servings: f.servings ? +f.servings : undefined,
    estimatedCalories: f.calories ? +f.calories : undefined,
    estimatedProtein: f.protein ? +f.protein : undefined,
    tags: f.tags, notes: f.notes || undefined,
    createdAt: existing?.createdAt ?? now, updatedAt: now
  };
}

function RecipeFormPanel({ initial, onSave, onCancel }: {
  initial: RecipeForm; onSave: (f: RecipeForm) => void; onCancel: () => void;
}) {
  const [f, setF] = useState(initial);
  const p = (k: keyof RecipeForm, v: string | string[]) => setF((prev) => ({ ...prev, [k]: v }));

  function addTag() {
    const t = f.tagInput.trim().toLowerCase();
    if (t && !f.tags.includes(t)) p("tags", [...f.tags, t]);
    p("tagInput", "");
  }

  return (
    <Card className="space-y-4 border-pine/30">
      <div className="flex items-center justify-between">
        <p className="font-bold text-pine-deep">{initial.name ? "Edit recipe" : "Add recipe"}</p>
        <button onClick={onCancel}><X size={16} className="text-faint hover:text-ink" /></button>
      </div>
      <Field label="Recipe name">
        <Input value={f.name} onChange={(e) => p("name", e.target.value)} placeholder="Mediterranean Chicken Bowl" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Source or author">
          <Select value={f.sourceOrAuthor} onChange={(e) => p("sourceOrAuthor", e.target.value)}>
            {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Diet style">
          <Select value={f.dietStyle} onChange={(e) => p("dietStyle", e.target.value)}>
            <option value="">None</option>
            {DIET_STYLES.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
        </Field>
        <Field label="Meal slot">
          <Select value={f.mealSlot} onChange={(e) => p("mealSlot", e.target.value)}>
            {SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Category">
          <Select value={f.category} onChange={(e) => p("category", e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Ingredients" hint="One per line: quantity unit name">
        <Textarea
          value={f.ingLines} onChange={(e) => p("ingLines", e.target.value)}
          placeholder={"1.5 lb chicken breast\n2 cups cooked quinoa\n1/2 cup feta"}
          className="min-h-[120px] font-mono text-xs"
        />
      </Field>
      <Field label="Instructions" hint="One step per line">
        <Textarea
          value={f.instructionLines} onChange={(e) => p("instructionLines", e.target.value)}
          placeholder={"Marinate chicken 20 minutes.\nCook over medium-high heat.\nBuild bowls."}
          className="min-h-[100px]"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Prep (min)">
          <Input type="number" value={f.prepTime} onChange={(e) => p("prepTime", e.target.value)} placeholder="15" />
        </Field>
        <Field label="Cook (min)">
          <Input type="number" value={f.cookTime} onChange={(e) => p("cookTime", e.target.value)} placeholder="20" />
        </Field>
        <Field label="Serves">
          <Input type="number" value={f.servings} onChange={(e) => p("servings", e.target.value)} placeholder="4" />
        </Field>
        <Field label="Calories">
          <Input type="number" value={f.calories} onChange={(e) => p("calories", e.target.value)} placeholder="480" />
        </Field>
      </div>
      <Field label="Protein (g)">
        <Input type="number" value={f.protein} onChange={(e) => p("protein", e.target.value)} placeholder="42" />
      </Field>
      <Field label="Tags">
        <div className="flex gap-2 mb-2">
          <Input value={f.tagInput} onChange={(e) => p("tagInput", e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            placeholder="high protein, mediterranean..." />
          <Button variant="secondary" type="button" onClick={addTag}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_TAGS.filter((t) => !f.tags.includes(t)).map((t) => (
            <button key={t} type="button" onClick={() => p("tags", [...f.tags, t])}
              className="rounded-full border border-line bg-mist text-xs text-faint px-2 py-0.5 hover:text-ink hover:border-pine/40">
              + {t}
            </button>
          ))}
        </div>
        {f.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {f.tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full border border-pine/20 bg-pine-soft text-pine-deep px-2.5 py-0.5 text-xs font-semibold">
                {t}<button onClick={() => p("tags", f.tags.filter((x) => x !== t))}><X size={10} /></button>
              </span>
            ))}
          </div>
        )}
      </Field>
      <Field label="Notes or paste recipe text">
        <Textarea value={f.notes} onChange={(e) => p("notes", e.target.value)}
          placeholder="Paste any recipe notes, source text, or personal tweaks here."
          className="min-h-[80px]" />
      </Field>
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => { if (f.name.trim()) onSave(f); }}>
          <Check size={15} /> Save recipe
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
  );
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const { db } = useDB();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const toast = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2500); };

  function handleAddToGrocery() {
    const now = new Date().toISOString();
    const items = recipe.ingredients.map((ing) => ({
      id: uid(), name: `${ing.quantity} ${ing.unit} ${ing.name}`.trim(),
      category: (FOOD_CATS.includes(ing.category) ? ing.category : "Other") as FoodCategory,
      sourceRecipeIds: [recipe.id], sourceSmoothieIds: [],
      alreadyHave: false, bought: false, pushToNextTrip: false,
      createdAt: now, updatedAt: now
    }));
    addGroceryItems(items);
    toast(`${items.length} ingredient${items.length !== 1 ? "s" : ""} added to Grocery List.`);
  }

  function handleAddToPlan() {
    const plan = db.weeklyPlans?.[0];
    if (!plan) { toast("No weekly plan found. Create one in Weekly Plan first."); return; }
    const today = new Date().toISOString().slice(0, 10);
    upsertPlannedMeal(plan.id, {
      id: uid(), date: today, slot: recipe.mealSlot === "flexible" ? "dinner" : recipe.mealSlot,
      recipeId: recipe.id, completed: false
    });
    toast(`Added to ${plan.name} for today.`);
  }

  if (editing) {
    return (
      <RecipeFormPanel
        initial={recipeToForm(recipe)}
        onSave={(f) => { updateRecipe(recipe.id, formToRecipe(f, recipe)); setEditing(false); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <Card className="space-y-2">
      {msg && (
        <div className="flex items-center gap-2 rounded-lg bg-pine-soft border border-pine/20 px-3 py-2 text-xs font-semibold text-pine-deep">
          <Check size={13} /> {msg}
        </div>
      )}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-ink text-sm">{recipe.name}</p>
            <Badge tone="sea">{recipe.mealSlot}</Badge>
            {recipe.dietStyle && <Badge tone="sage">{recipe.dietStyle}</Badge>}
          </div>
          <p className="text-xs text-faint mt-0.5">
            {recipe.sourceOrAuthor}
            {(recipe.prepTimeMinutes || recipe.cookTimeMinutes) && (
              <> &middot; {(recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0)} min total</>
            )}
            {recipe.servings && <> &middot; serves {recipe.servings}</>}
          </p>
          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {recipe.tags.map((t) => (
                <span key={t} className="rounded-full border border-line text-[10px] font-semibold text-faint px-2 py-0.5">{t}</span>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => setOpen(!open)} className="text-faint hover:text-ink mt-0.5">
          {open ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
        </button>
      </div>

      {open && (
        <div className="space-y-3 pt-2 border-t border-line/60">
          {(recipe.estimatedCalories || recipe.estimatedProtein) && (
            <div className="flex gap-4 text-xs text-muted">
              {recipe.estimatedCalories && <span className="readout"><strong className="text-ink">{recipe.estimatedCalories}</strong> kcal</span>}
              {recipe.estimatedProtein && <span className="readout"><strong className="text-ink">{recipe.estimatedProtein}g</strong> protein</span>}
            </div>
          )}
          <div>
            <p className="label-tick mb-1.5">Ingredients</p>
            <ul className="space-y-0.5">
              {recipe.ingredients.map((ing) => (
                <li key={ing.id} className="text-xs text-ink">{ing.quantity} {ing.unit} {ing.name}</li>
              ))}
            </ul>
          </div>
          {recipe.instructions.length > 0 && (
            <div>
              <p className="label-tick mb-1.5">Instructions</p>
              <ol className="space-y-1">
                {recipe.instructions.map((step, i) => (
                  <li key={i} className="flex gap-2 text-xs">
                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-pine-soft text-pine-deep text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                    <span className="text-ink">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {recipe.notes && (
            <div>
              <p className="label-tick mb-1">Notes</p>
              <p className="text-xs text-muted">{recipe.notes}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="primary" className="text-xs px-3 py-1.5" onClick={handleAddToPlan}>
              Add to weekly plan
            </Button>
            <Button variant="secondary" className="text-xs px-3 py-1.5" onClick={handleAddToGrocery}>
              Add to grocery list
            </Button>
            <Button variant="secondary" className="text-xs px-3 py-1.5" onClick={() => setEditing(true)}>
              <Pencil size={12} /> Edit
            </Button>
            <Button variant="secondary" className="text-xs px-3 py-1.5" onClick={() => {
              const r = formToRecipe(recipeToForm(recipe));
              r.id = uid(); r.name += " (copy)";
              addRecipe(r);
            }}>
              <Copy size={12} /> Duplicate
            </Button>
            {confirmDel ? (
              <>
                <Button variant="danger" className="text-xs px-3 py-1.5" onClick={() => removeRecipe(recipe.id)}>Confirm delete</Button>
                <Button variant="ghost" className="text-xs px-3 py-1.5" onClick={() => setConfirmDel(false)}>Cancel</Button>
              </>
            ) : (
              <Button variant="ghost" className="text-xs px-3 py-1.5" onClick={() => setConfirmDel(true)}>
                <Trash2 size={12} /> Delete
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function RecipesPage() {
  const { db, ready } = useDB();
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [filterSlot, setFilterSlot] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [filterDiet, setFilterDiet] = useState("all");
  const [showAdd, setShowAdd] = useState(false);

  const recipes = db.recipes ?? [];

  const filtered = recipes.filter((r) => {
    const q = search.toLowerCase();
    if (q && !r.name.toLowerCase().includes(q) && !r.tags.join(" ").includes(q)) return false;
    if (filterSource !== "all" && r.sourceOrAuthor !== filterSource) return false;
    if (filterSlot !== "all" && r.mealSlot !== filterSlot) return false;
    if (filterCat !== "all" && r.category !== filterCat) return false;
    if (filterDiet !== "all" && r.dietStyle !== filterDiet) return false;
    return true;
  });

  const sources = Array.from(new Set(recipes.map((r) => r.sourceOrAuthor).filter(Boolean))) as string[];
  const diets = Array.from(new Set(recipes.map((r) => r.dietStyle).filter(Boolean))) as string[];

  if (!ready) return <div className="page-container"><PageHeader title="Recipe Library" /></div>;

  return (
    <div className="page-container">
      <PageHeader title="Recipe Library" sub={`${recipes.length} recipe${recipes.length !== 1 ? "s" : ""} saved.`} />

      {showAdd ? (
        <RecipeFormPanel
          initial={emptyForm()}
          onSave={(f) => { addRecipe(formToRecipe(f)); setShowAdd(false); }}
          onCancel={() => setShowAdd(false)}
        />
      ) : (
        <Button variant="secondary" className="w-full" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Add recipe
        </Button>
      )}

      {/* Filters */}
      <section className="space-y-2">
        <Input
          placeholder="Search recipes..."
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Select value={filterSlot} onChange={(e) => setFilterSlot(e.target.value)}>
            <option value="all">All slots</option>
            {SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
            <option value="all">All sources</option>
            {sources.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select value={filterDiet} onChange={(e) => setFilterDiet(e.target.value)}>
            <option value="all">All diet styles</option>
            {diets.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle>{filtered.length} recipe{filtered.length !== 1 ? "s" : ""}</SectionTitle>
        {filtered.length === 0 ? (
          <EmptyState title="No recipes found" body="Try different filters or add a new recipe above." />
        ) : (
          filtered.map((r) => <RecipeCard key={r.id} recipe={r} />)
        )}
      </section>

      {/* Future placeholders */}
      <section className="space-y-3 pt-2">
        <SectionTitle>Coming next</SectionTitle>
        {[
          { label: "PDF recipe importer", desc: "Upload a PDF and extract recipes automatically." },
          { label: "Recipe source importer", desc: "Paste a URL from AllRecipes or similar sites." },
          { label: "OpenAI recipe extraction", desc: "Describe a recipe and let AI format it for you." },
          { label: "Find recipes using inventory", desc: "Match recipes to what you already have in your Kitchen." }
        ].map(({ label, desc }) => (
          <div key={label} className="flex items-start gap-3 rounded-xl border border-dashed border-line/60 bg-surface/60 px-4 py-3 opacity-70">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-muted">{label}</p>
                <span className="text-[10px] font-bold uppercase text-faint bg-line/60 rounded-full px-2 py-0.5">Soon</span>
              </div>
              <p className="text-xs text-faint mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
