"use client";

import { useState } from "react";
import {
  Check, ChevronDown, ChevronUp, Copy, GlassWater, Pencil,
  ShoppingCart, Star, Trash2, X, Zap
} from "lucide-react";
import {
  Badge, Button, Card, Chip, cx, EmptyState, Field,
  Input, PageHeader, SectionTitle, Select, Textarea
} from "@/components/ui";
import {
  addGroceryItems, addSmoothie, addSmoothieHistory, removeSmoothie,
  setSmoothieGrocery, setSmoothiePrefs, uid, updateSmoothie, upsertPlannedMeal, useDB
} from "@/lib/store";
import { todayISO } from "@/lib/utils";
import type {
  FoodCategory, SmoothieEquipment, SmoothieGoal, SmoothieGroceryItem,
  SmoothieIngredientItem, SmoothieRecipe, SmoothieSweetnessPreference,
  SmoothieTexturePreference
} from "@/lib/types";

// ---- helpers ----

const GOALS: SmoothieGoal[] = [
  "morning energy", "weight support", "post-workout",
  "gut health", "high protein", "low sugar", "use what I have"
];

const EQUIPMENT: SmoothieEquipment[] = ["blender", "juicer", "blender + juicer"];

const GOAL_COLORS: Record<SmoothieGoal, string> = {
  "morning energy":  "bg-amber-soft text-amber-dark border-amber/20",
  "weight support":  "bg-pine-soft text-pine-deep border-pine/20",
  "post-workout":    "bg-sea-soft text-sea-dark border-sea/20",
  "gut health":      "bg-sage-soft text-sage-dark border-sage/20",
  "high protein":    "bg-food-soft text-food-dark border-food/20",
  "low sugar":       "bg-pine-soft text-pine-deep border-pine/20",
  "use what I have": "bg-line/60 text-muted border-line"
};

function parseIngredients(text: string): SmoothieIngredientItem[] {
  return text.split("\n").filter((l) => l.trim()).map((line) => {
    const parts = line.trim().split(/\s+/);
    const quantity = parts[0] ?? "";
    const unit = parts[1] ?? "";
    const name = parts.slice(2).join(" ");
    return { id: uid(), name, quantity, unit, category: "other" as const };
  });
}

function ingredientsToText(items: SmoothieIngredientItem[]): string {
  return items.map((i) => `${i.quantity} ${i.unit} ${i.name}`.trim()).join("\n");
}

function StarRating({
  value, onChange
}: {
  value: number | undefined;
  onChange?: (n: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          className={cx(
            "transition-colors",
            onChange && "cursor-pointer hover:scale-110",
            !onChange && "cursor-default"
          )}
        >
          <Star
            size={18}
            className={n <= (value ?? 0) ? "fill-amber text-amber" : "text-line"}
          />
        </button>
      ))}
    </div>
  );
}

type TabId = "today" | "recipes" | "profile" | "history" | "grocery";

// ---- EMPTY FORM ----
function emptyForm() {
  return {
    name: "", description: "", sourceOrAuthor: "", goal: "morning energy" as SmoothieGoal,
    equipment: "blender" as SmoothieEquipment, ingLines: "", stepLines: "",
    tagInput: "", tags: [] as string[],
    calories: "", protein: "", fiber: ""
  };
}

// ==========================================
// TODAY TAB
// ==========================================
function TodayTab({
  recipes,
  todayIdx,
  setTodayIdx,
}: {
  recipes: SmoothieRecipe[];
  todayIdx: number;
  setTodayIdx: (n: number) => void;
}) {
  const { db } = useDB();
  const [madeItOpen, setMadeItOpen] = useState(false);
  const [madeRating, setMadeRating] = useState<number>(4);
  const [madeNotes, setMadeNotes] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  if (!recipes.length) {
    return (
      <EmptyState
        title="No smoothie recipes yet"
        body="Add a recipe in the Recipes tab and it will appear here as today's recommendation."
      />
    );
  }

  const idx = todayIdx % recipes.length;
  const recipe = recipes[idx];

  function handleMadeIt() {
    addSmoothieHistory({
      id: uid(), smoothieId: recipe.id, smoothieName: recipe.name,
      date: new Date().toISOString(), madeIt: true,
      rating: madeRating, notes: madeNotes
    });
    setMadeItOpen(false);
    setMadeNotes("");
    setSavedMsg(`${recipe.name} logged to your history.`);
    setTimeout(() => setSavedMsg(null), 3000);
  }

  function handleAddToGrocery() {
    // Write to unified Grocery List
    const now = new Date().toISOString();
    const groceryItems = recipe.ingredients.map((i) => ({
      id: uid(), name: `${i.quantity} ${i.unit} ${i.name}`.trim(),
      category: (i.category === "produce" ? "Produce"
        : i.category === "dairy" ? "Dairy"
        : i.category === "frozen" ? "Frozen"
        : i.category === "supplement" ? "Supplements"
        : "Other") as FoodCategory,
      sourceRecipeIds: [], sourceSmoothieIds: [recipe.id],
      alreadyHave: false, bought: false, pushToNextTrip: false,
      createdAt: now, updatedAt: now
    }));
    addGroceryItems(groceryItems);
    // Also keep legacy smoothie grocery tab
    const current = db.smoothieGrocery;
    const existing = new Set(current.map((g) => g.name.toLowerCase()));
    const legacyItems: SmoothieGroceryItem[] = recipe.ingredients
      .filter((i) => !existing.has(i.name.toLowerCase()))
      .map((i) => ({
        id: uid(), name: `${i.quantity} ${i.unit} ${i.name}`.trim(),
        category: i.category === "produce" ? "Produce"
          : i.category === "dairy" ? "Dairy"
          : i.category === "frozen" ? "Frozen"
          : i.category === "supplement" ? "Supplements"
          : "Other",
        needed: true, haveIt: false
      }));
    if (legacyItems.length > 0) setSmoothieGrocery([...current, ...legacyItems]);
    setSavedMsg(`${groceryItems.length} ingredient${groceryItems.length !== 1 ? "s" : ""} added to Grocery List.`);
    setTimeout(() => setSavedMsg(null), 3000);
  }

  return (
    <div className="space-y-4">
      {savedMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-pine-soft border border-pine/20 px-4 py-3 text-sm font-semibold text-pine-deep">
          <Check size={16} /> {savedMsg}
        </div>
      )}

      {/* Today card */}
      <Card>
        <div className={cx(
          "rounded-xl px-4 py-5 mb-4 -mx-4 -mt-4",
          "bg-gradient-to-br from-amber-soft via-food-soft to-pine-soft"
        )}>
          <p className="label-tick mb-1">Today&apos;s smoothie</p>
          <h2 className="text-xl font-extrabold text-pine-deep">{recipe.name}</h2>
          {recipe.description && (
            <p className="text-sm text-muted mt-1">{recipe.description}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={cx(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
              GOAL_COLORS[recipe.goal]
            )}>
              {recipe.goal}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-line/60 bg-surface/80 px-2.5 py-0.5 text-[11px] font-semibold text-muted uppercase tracking-wide">
              <GlassWater size={10} /> {recipe.equipment}
            </span>
            {recipe.tags.slice(0, 2).map((t) => (
              <span key={t} className="rounded-full border border-line/50 bg-surface/80 px-2.5 py-0.5 text-[11px] font-semibold text-faint uppercase tracking-wide">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Macros */}
        {(recipe.estimatedCalories || recipe.estimatedProtein || recipe.estimatedFiber) && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {recipe.estimatedCalories && (
              <div className="rounded-xl bg-mist/50 p-2.5 text-center">
                <p className="readout text-lg font-bold text-ink">{recipe.estimatedCalories}</p>
                <p className="label-tick">kcal</p>
              </div>
            )}
            {recipe.estimatedProtein && (
              <div className="rounded-xl bg-mist/50 p-2.5 text-center">
                <p className="readout text-lg font-bold text-ink">{recipe.estimatedProtein}g</p>
                <p className="label-tick">protein</p>
              </div>
            )}
            {recipe.estimatedFiber && (
              <div className="rounded-xl bg-mist/50 p-2.5 text-center">
                <p className="readout text-lg font-bold text-ink">{recipe.estimatedFiber}g</p>
                <p className="label-tick">fiber</p>
              </div>
            )}
          </div>
        )}

        {/* Ingredients */}
        <div className="mb-4">
          <p className="label-tick mb-2">Ingredients</p>
          <ul className="space-y-1.5">
            {recipe.ingredients.map((ing) => (
              <li key={ing.id} className="flex items-center justify-between text-sm">
                <span className="text-ink">{ing.quantity} {ing.unit} {ing.name}</span>
                {ing.useSoon && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-amber bg-amber-soft rounded-full px-2 py-0.5 border border-amber/20">
                    Use soon
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Steps */}
        <div>
          <p className="label-tick mb-2">Steps</p>
          <ol className="space-y-2">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-pine-soft text-pine-deep text-[11px] font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="text-ink">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </Card>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={() => setTodayIdx(todayIdx + 1)}>
          Give me another
        </Button>
        <Button variant="primary" onClick={() => setMadeItOpen(true)}>
          I made it
        </Button>
        <Button variant="secondary" onClick={handleAddToGrocery} className="col-span-2">
          <ShoppingCart size={15} />
          Add ingredients to grocery list
        </Button>
        <Button variant="ghost" className="col-span-2" onClick={() => {
          const plan = db.weeklyPlans?.[0];
          if (!plan) {
            setSavedMsg("No weekly plan found. Create one in Weekly Plan first.");
          } else {
            const today = new Date().toISOString().slice(0, 10);
            upsertPlannedMeal(plan.id, {
              id: uid(), date: today, slot: "smoothie",
              smoothieId: recipe.id, completed: false
            });
            setSavedMsg(`${recipe.name} added to ${plan.name} for today.`);
          }
          setTimeout(() => setSavedMsg(null), 3000);
        }}>
          Add to weekly plan
        </Button>
      </div>

      {/* I made it form */}
      {madeItOpen && (
        <Card className="space-y-3 border-pine/30">
          <div className="flex items-center justify-between">
            <p className="font-bold text-ink">How did it go?</p>
            <button onClick={() => setMadeItOpen(false)} className="text-faint hover:text-ink">
              <X size={16} />
            </button>
          </div>
          <div>
            <p className="label-tick mb-2">Rating</p>
            <StarRating value={madeRating} onChange={setMadeRating} />
          </div>
          <Field label="Notes (optional)">
            <Textarea
              placeholder="How did it taste? Any adjustments?"
              value={madeNotes}
              onChange={(e) => setMadeNotes(e.target.value)}
              className="min-h-[60px]"
            />
          </Field>
          <Button className="w-full" onClick={handleMadeIt}>
            <Check size={15} /> Log it
          </Button>
        </Card>
      )}
    </div>
  );
}

// ==========================================
// RECIPE FORM (used for add and edit)
// ==========================================
type RecipeForm = ReturnType<typeof emptyForm>;

function RecipeFormCard({
  initial,
  onSave,
  onCancel
}: {
  initial: RecipeForm;
  onSave: (f: RecipeForm) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState<RecipeForm>(initial);

  function patch(key: keyof RecipeForm, val: string | string[]) {
    setF((prev) => ({ ...prev, [key]: val }));
  }

  function addTag() {
    const t = f.tagInput.trim().toLowerCase();
    if (t && !f.tags.includes(t)) patch("tags", [...f.tags, t]);
    patch("tagInput", "");
  }

  return (
    <Card className="space-y-4 border-pine/30">
      <div className="flex items-center justify-between">
        <p className="font-bold text-pine-deep">{initial.name ? "Edit recipe" : "Add smoothie recipe"}</p>
        <button onClick={onCancel} className="text-faint hover:text-ink"><X size={16} /></button>
      </div>
      <Field label="Name">
        <Input value={f.name} onChange={(e) => patch("name", e.target.value)} placeholder="Golden Mango Sunrise" />
      </Field>
      <Field label="Description (optional)">
        <Input value={f.description} onChange={(e) => patch("description", e.target.value)} placeholder="Short description" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Goal">
          <Select value={f.goal} onChange={(e) => patch("goal", e.target.value)}>
            {GOALS.map((g) => <option key={g} value={g}>{g}</option>)}
          </Select>
        </Field>
        <Field label="Equipment">
          <Select value={f.equipment} onChange={(e) => patch("equipment", e.target.value)}>
            {EQUIPMENT.map((e) => <option key={e} value={e}>{e}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Ingredients" hint="One per line: quantity unit name. Example: 1 cup frozen mango">
        <Textarea
          value={f.ingLines}
          onChange={(e) => patch("ingLines", e.target.value)}
          placeholder={"1 cup frozen mango\n1/2 cup Greek yogurt\n1 cup almond milk"}
          className="min-h-[120px] font-mono text-xs"
        />
      </Field>
      <Field label="Steps" hint="One step per line">
        <Textarea
          value={f.stepLines}
          onChange={(e) => patch("stepLines", e.target.value)}
          placeholder={"Add milk and greens first.\nAdd frozen fruit.\nBlend 60 seconds."}
          className="min-h-[100px]"
        />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Calories">
          <Input type="number" value={f.calories} onChange={(e) => patch("calories", e.target.value)} placeholder="320" />
        </Field>
        <Field label="Protein (g)">
          <Input type="number" value={f.protein} onChange={(e) => patch("protein", e.target.value)} placeholder="14" />
        </Field>
        <Field label="Fiber (g)">
          <Input type="number" value={f.fiber} onChange={(e) => patch("fiber", e.target.value)} placeholder="6" />
        </Field>
      </div>
      <Field label="Tags">
        <div className="flex gap-2">
          <Input
            value={f.tagInput}
            onChange={(e) => patch("tagInput", e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            placeholder="tropical, high fiber..."
          />
          <Button variant="secondary" type="button" onClick={addTag}>Add</Button>
        </div>
        {f.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {f.tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-semibold text-muted">
                {t}
                <button onClick={() => patch("tags", f.tags.filter((x) => x !== t))} className="text-faint hover:text-clay">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
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

// ==========================================
// RECIPES TAB
// ==========================================
function RecipesTab() {
  const { db } = useDB();
  const recipes = db.smoothies ?? [];
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filterGoal, setFilterGoal] = useState<string>("all");
  const [ratingState, setRatingState] = useState<Record<string, number>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = recipes.filter((r) => filterGoal === "all" || r.goal === filterGoal);

  function handleAdd(f: RecipeForm) {
    const now = new Date().toISOString();
    addSmoothie({
      id: uid(), name: f.name, description: f.description,
      sourceOrAuthor: f.sourceOrAuthor,
      ingredients: parseIngredients(f.ingLines),
      steps: f.stepLines.split("\n").filter(Boolean),
      equipment: f.equipment as SmoothieEquipment,
      goal: f.goal as SmoothieGoal,
      estimatedCalories: f.calories ? +f.calories : undefined,
      estimatedProtein: f.protein ? +f.protein : undefined,
      estimatedFiber: f.fiber ? +f.fiber : undefined,
      tags: f.tags, createdAt: now, updatedAt: now
    });
    setShowAdd(false);
  }

  function handleEdit(id: string, f: RecipeForm) {
    updateSmoothie(id, {
      name: f.name, description: f.description,
      ingredients: parseIngredients(f.ingLines),
      steps: f.stepLines.split("\n").filter(Boolean),
      equipment: f.equipment as SmoothieEquipment,
      goal: f.goal as SmoothieGoal,
      estimatedCalories: f.calories ? +f.calories : undefined,
      estimatedProtein: f.protein ? +f.protein : undefined,
      estimatedFiber: f.fiber ? +f.fiber : undefined,
      tags: f.tags, updatedAt: new Date().toISOString()
    });
    setEditId(null);
  }

  function handleDuplicate(r: SmoothieRecipe) {
    const now = new Date().toISOString();
    addSmoothie({ ...r, id: uid(), name: `${r.name} (copy)`, createdAt: now, updatedAt: now });
  }

  function handleRate(id: string, n: number) {
    setRatingState((prev) => ({ ...prev, [id]: n }));
    updateSmoothie(id, { rating: n, updatedAt: new Date().toISOString() });
  }

  function recipeToForm(r: SmoothieRecipe): RecipeForm {
    return {
      name: r.name, description: r.description ?? "",
      sourceOrAuthor: r.sourceOrAuthor ?? "",
      goal: r.goal, equipment: r.equipment,
      ingLines: ingredientsToText(r.ingredients),
      stepLines: r.steps.join("\n"),
      tagInput: "", tags: [...r.tags],
      calories: r.estimatedCalories?.toString() ?? "",
      protein: r.estimatedProtein?.toString() ?? "",
      fiber: r.estimatedFiber?.toString() ?? ""
    };
  }

  return (
    <div className="space-y-3">
      {/* Filter by goal */}
      <div className="flex gap-2 flex-wrap">
        <Chip active={filterGoal === "all"} onClick={() => setFilterGoal("all")}>All</Chip>
        {GOALS.map((g) => (
          <Chip key={g} active={filterGoal === g} onClick={() => setFilterGoal(g)}>
            {g}
          </Chip>
        ))}
      </div>

      {!showAdd && (
        <Button variant="secondary" className="w-full" onClick={() => setShowAdd(true)}>
          + Add smoothie recipe
        </Button>
      )}

      {showAdd && (
        <RecipeFormCard
          initial={emptyForm()}
          onSave={handleAdd}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {filtered.length === 0 && !showAdd && (
        <EmptyState title="No recipes" body="Add your first smoothie recipe above." />
      )}

      {filtered.map((r) => {
        const isOpen = openId === r.id;
        const isEditing = editId === r.id;
        const rating = ratingState[r.id] ?? r.rating;

        if (isEditing) {
          return (
            <RecipeFormCard
              key={r.id}
              initial={recipeToForm(r)}
              onSave={(f) => handleEdit(r.id, f)}
              onCancel={() => setEditId(null)}
            />
          );
        }

        return (
          <Card key={r.id} className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-ink text-sm">{r.name}</p>
                  <span className={cx(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    GOAL_COLORS[r.goal]
                  )}>
                    {r.goal}
                  </span>
                </div>
                {r.description && <p className="text-xs text-muted mt-0.5">{r.description}</p>}
                <div className="flex items-center gap-3 mt-1.5">
                  <StarRating value={rating} onChange={(n) => handleRate(r.id, n)} />
                  <span className="text-xs text-faint">{r.equipment}</span>
                </div>
              </div>
              <button onClick={() => setOpenId(isOpen ? null : r.id)} className="text-faint hover:text-ink mt-0.5">
                {isOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
              </button>
            </div>

            {isOpen && (
              <div className="space-y-3 pt-2 border-t border-line/60">
                {/* Macros */}
                {(r.estimatedCalories || r.estimatedProtein || r.estimatedFiber) && (
                  <div className="flex gap-3 text-xs text-muted">
                    {r.estimatedCalories && <span className="readout"><strong className="text-ink">{r.estimatedCalories}</strong> kcal</span>}
                    {r.estimatedProtein && <span className="readout"><strong className="text-ink">{r.estimatedProtein}g</strong> protein</span>}
                    {r.estimatedFiber && <span className="readout"><strong className="text-ink">{r.estimatedFiber}g</strong> fiber</span>}
                  </div>
                )}
                {/* Ingredients */}
                <div>
                  <p className="label-tick mb-1.5">Ingredients</p>
                  <ul className="space-y-1">
                    {r.ingredients.map((ing) => (
                      <li key={ing.id} className="flex items-center justify-between text-xs">
                        <span className="text-ink">{ing.quantity} {ing.unit} {ing.name}</span>
                        {ing.useSoon && (
                          <span className="text-[9px] font-bold uppercase text-amber bg-amber-soft rounded-full px-1.5 py-0.5 border border-amber/20">Use soon</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Steps */}
                <div>
                  <p className="label-tick mb-1.5">Steps</p>
                  <ol className="space-y-1">
                    {r.steps.map((step, i) => (
                      <li key={i} className="flex gap-2 text-xs">
                        <span className="flex-shrink-0 w-4 h-4 rounded-full bg-pine-soft text-pine-deep text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                        <span className="text-ink">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                {/* Tags */}
                {r.tags.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {r.tags.map((t) => (
                      <span key={t} className="rounded-full border border-line bg-mist text-xs font-semibold text-faint px-2 py-0.5">{t}</span>
                    ))}
                  </div>
                )}
                {/* Actions */}
                <div className="flex gap-2 flex-wrap pt-1">
                  <Button variant="secondary" className="text-xs px-2.5 py-1.5" onClick={() => setEditId(r.id)}>
                    <Pencil size={12} /> Edit
                  </Button>
                  <Button variant="secondary" className="text-xs px-2.5 py-1.5" onClick={() => handleDuplicate(r)}>
                    <Copy size={12} /> Duplicate
                  </Button>
                  {confirmDelete === r.id ? (
                    <>
                      <Button variant="danger" className="text-xs px-2.5 py-1.5" onClick={() => { removeSmoothie(r.id); setConfirmDelete(null); }}>
                        Confirm delete
                      </Button>
                      <Button variant="ghost" className="text-xs px-2.5 py-1.5" onClick={() => setConfirmDelete(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button variant="ghost" className="text-xs px-2.5 py-1.5" onClick={() => setConfirmDelete(r.id)}>
                      <Trash2 size={12} /> Delete
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ==========================================
// TASTE PROFILE TAB
// ==========================================
function ProfileTab() {
  const { db } = useDB();
  const prefs = db.smoothiePrefs ?? { likes: [], dislikes: [], equipmentAvailable: ["blender"] };
  const [likeInput, setLikeInput] = useState("");
  const [dislikeInput, setDislikeInput] = useState("");
  const [saved, setSaved] = useState(false);

  function addLike() {
    const v = likeInput.trim().toLowerCase();
    if (v && !prefs.likes.includes(v)) {
      setSmoothiePrefs({ ...prefs, likes: [...prefs.likes, v] });
    }
    setLikeInput("");
  }

  function removeLike(t: string) {
    setSmoothiePrefs({ ...prefs, likes: prefs.likes.filter((l) => l !== t) });
  }

  function addDislike() {
    const v = dislikeInput.trim().toLowerCase();
    if (v && !prefs.dislikes.includes(v)) {
      setSmoothiePrefs({ ...prefs, dislikes: [...prefs.dislikes, v] });
    }
    setDislikeInput("");
  }

  function removeDislike(t: string) {
    setSmoothiePrefs({ ...prefs, dislikes: prefs.dislikes.filter((d) => d !== t) });
  }

  function toggleEquipment(e: SmoothieEquipment) {
    const eq = prefs.equipmentAvailable ?? [];
    const next = eq.includes(e) ? eq.filter((x) => x !== e) : [...eq, e];
    setSmoothiePrefs({ ...prefs, equipmentAvailable: next });
    setSaved(false);
  }

  function setTexture(v: SmoothieTexturePreference) {
    setSmoothiePrefs({ ...prefs, texturePreference: v });
    setSaved(false);
  }

  function setSweetness(v: SmoothieSweetnessPreference) {
    setSmoothiePrefs({ ...prefs, sweetnessPreference: v });
    setSaved(false);
  }

  return (
    <div className="space-y-4">
      {saved && (
        <div className="flex items-center gap-2 rounded-xl bg-pine-soft border border-pine/20 px-4 py-3 text-sm font-semibold text-pine-deep">
          <Check size={16} /> Preferences saved.
        </div>
      )}

      <Card className="space-y-3">
        <SectionTitle>Equipment available</SectionTitle>
        <div className="flex gap-2 flex-wrap">
          {EQUIPMENT.map((e) => (
            <Chip
              key={e}
              active={(prefs.equipmentAvailable ?? []).includes(e)}
              onClick={() => toggleEquipment(e)}
            >
              {e}
            </Chip>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <SectionTitle>Likes</SectionTitle>
        <div className="flex gap-2">
          <Input
            value={likeInput}
            onChange={(e) => setLikeInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLike(); } }}
            placeholder="mango, ginger, berry..."
          />
          <Button variant="secondary" onClick={addLike}>Add</Button>
        </div>
        {prefs.likes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {prefs.likes.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full border border-pine/20 bg-pine-soft text-pine-deep px-2.5 py-0.5 text-xs font-semibold">
                {t}
                <button onClick={() => removeLike(t)} className="hover:text-clay"><X size={10} /></button>
              </span>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <SectionTitle>Dislikes</SectionTitle>
        <div className="flex gap-2">
          <Input
            value={dislikeInput}
            onChange={(e) => setDislikeInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDislike(); } }}
            placeholder="kale, celery, beet..."
          />
          <Button variant="secondary" onClick={addDislike}>Add</Button>
        </div>
        {prefs.dislikes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {prefs.dislikes.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full border border-clay/20 bg-clay-soft text-clay-dark px-2.5 py-0.5 text-xs font-semibold">
                {t}
                <button onClick={() => removeDislike(t)} className="hover:text-clay"><X size={10} /></button>
              </span>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <SectionTitle>Texture preference</SectionTitle>
        <div className="flex gap-2 flex-wrap">
          {(["smooth", "thick", "chunky", "icy"] as SmoothieTexturePreference[]).map((t) => (
            <Chip key={t} active={prefs.texturePreference === t} onClick={() => setTexture(t)}>{t}</Chip>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <SectionTitle>Sweetness preference</SectionTitle>
        <div className="flex gap-2">
          {(["low", "medium", "high"] as SmoothieSweetnessPreference[]).map((s) => (
            <Chip key={s} active={prefs.sweetnessPreference === s} onClick={() => setSweetness(s)}>{s}</Chip>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ==========================================
// HISTORY TAB
// ==========================================
function HistoryTab() {
  const { db } = useDB();
  const history = db.smoothieHistory ?? [];

  if (!history.length) {
    return <EmptyState title="No history yet" body="After you tap I made it, your smoothies will appear here." />;
  }

  return (
    <div className="space-y-3">
      {history.map((h) => (
        <Card key={h.id} className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-ink text-sm">{h.smoothieName}</p>
              <p className="text-xs text-muted">{new Date(h.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {h.madeIt && (
                <Badge tone="pine">Made it</Badge>
              )}
              {h.rating != null && <StarRating value={h.rating} />}
            </div>
          </div>
          {h.notes && <p className="text-xs text-muted italic">{h.notes}</p>}
        </Card>
      ))}
    </div>
  );
}

// ==========================================
// GROCERY TAB
// ==========================================
function GroceryTab() {
  const { db } = useDB();
  const items = db.smoothieGrocery ?? [];
  const [sent, setSent] = useState(false);

  const grouped: Record<string, SmoothieGroceryItem[]> = {};
  for (const item of items) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  function toggle(id: string, field: "needed" | "haveIt") {
    setSmoothieGrocery(items.map((g) => g.id === id ? { ...g, [field]: !g[field] } : g));
  }

  const neededItems = items.filter((i) => i.needed && !i.haveIt);

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-ink text-sm">{neededItems.length} item{neededItems.length !== 1 ? "s" : ""} needed</p>
          <p className="text-xs text-muted">Mark what you need and what you already have.</p>
        </div>
        <Button
          variant="secondary"
          className="text-xs px-3 py-2"
          onClick={() => { setSent(true); setTimeout(() => setSent(false), 3000); }}
        >
          {sent ? <><Check size={13} /> Noted</> : <><ShoppingCart size={13} /> Send to list</>}
        </Button>
      </Card>

      {sent && (
        <div className="rounded-xl bg-pine-soft border border-pine/20 px-4 py-3 text-sm font-semibold text-pine-deep">
          A full Grocery List section is coming soon. For now your selections are saved here.
        </div>
      )}

      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat}>
          <p className="label-tick mb-2">{cat}</p>
          <div className="space-y-2">
            {catItems.map((item) => (
              <div key={item.id} className={cx(
                "flex items-center gap-3 rounded-xl border bg-surface px-3 py-2.5 transition-opacity",
                item.haveIt && "opacity-50"
              )}>
                <button
                  onClick={() => toggle(item.id, "needed")}
                  className={cx(
                    "flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center",
                    item.needed ? "bg-pine border-pine" : "border-line"
                  )}
                >
                  {item.needed && <Check size={11} className="text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={cx("text-sm font-semibold", item.haveIt ? "text-faint line-through" : "text-ink")}>{item.name}</p>
                  {item.hint && <p className="text-xs text-faint">{item.hint}</p>}
                </div>
                <button
                  onClick={() => toggle(item.id, "haveIt")}
                  className={cx(
                    "flex-shrink-0 text-xs font-semibold rounded-full px-2.5 py-1 border transition-all",
                    item.haveIt
                      ? "bg-pine-soft text-pine-deep border-pine/20"
                      : "text-faint border-line hover:text-ink"
                  )}
                >
                  {item.haveIt ? "Have it" : "I have it"}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ==========================================
// COMING NEXT PLACEHOLDERS
// ==========================================
function ComingNext() {
  const items = [
    { label: "Smoothie PDF importer", desc: "Upload a PDF recipe and extract ingredients automatically." },
    { label: "Smoothie HTML importer", desc: "Paste a URL and import any recipe from the web." },
    { label: "Fridge scan", desc: "Take a photo of your fridge and get a recipe based on what is inside." },
    { label: "Barcode scan", desc: "Scan product barcodes to add items to your ingredient list." },
    { label: "Recipe source importer", desc: "Pull in recipes from AllRecipes, NYT Cooking, and similar sites." },
    { label: "Kid mode", desc: "Gentler, sweeter blends with no bitter greens." }
  ];

  return (
    <section className="space-y-3 pt-2">
      <SectionTitle>Coming next</SectionTitle>
      {items.map(({ label, desc }) => (
        <div key={label} className="flex items-start gap-3 rounded-xl border border-dashed border-line/60 bg-surface/60 px-4 py-3 opacity-70">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-muted">{label}</p>
              <span className="text-[10px] font-bold uppercase tracking-wide text-faint bg-line/60 rounded-full px-2 py-0.5">Soon</span>
            </div>
            <p className="text-xs text-faint mt-0.5">{desc}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

// ==========================================
// MAIN PAGE
// ==========================================
export default function SmoothiesPage() {
  const { db, ready } = useDB();
  const [tab, setTab] = useState<TabId>("today");
  const [todayIdx, setTodayIdx] = useState(0);

  const recipes = db.smoothies ?? [];

  const TABS: { id: TabId; label: string }[] = [
    { id: "today",   label: "Today" },
    { id: "recipes", label: `Recipes${recipes.length ? ` (${recipes.length})` : ""}` },
    { id: "profile", label: "Taste Profile" },
    { id: "history", label: "History" },
    { id: "grocery", label: "Grocery" }
  ];

  // Seed today index based on day of week for stable daily recommendation
  const seedIdx = ready
    ? new Date().getDay() % (recipes.length || 1)
    : 0;
  const effectiveTodayIdx = todayIdx === 0 ? seedIdx : todayIdx;

  if (!ready) {
    return (
      <div className="page-container">
        <PageHeader title="Morning Smoothies" sub="Smoothies for my morning routine." />
        <p className="text-sm text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader title="Morning Smoothies" sub="Smoothies for my morning routine." />

      {/* Tab navigation */}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-mist/60 p-1 border border-line/50">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cx(
              "flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
              tab === id
                ? "bg-surface text-pine-deep shadow-sm border border-line/50"
                : "text-muted hover:text-ink"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "today" && (
        <TodayTab
          recipes={recipes}
          todayIdx={effectiveTodayIdx}
          setTodayIdx={(n) => setTodayIdx(n + 1)}
        />
      )}
      {tab === "recipes" && <RecipesTab />}
      {tab === "profile" && <ProfileTab />}
      {tab === "history" && <HistoryTab />}
      {tab === "grocery" && <GroceryTab />}

      {/* Future placeholders shown below all tabs */}
      <ComingNext />
    </div>
  );
}
