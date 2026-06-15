"use client";

import { useState } from "react";
import {
  Check, ChevronDown, ChevronUp, FileInput, Pencil,
  Plus, Trash2, X, Zap
} from "lucide-react";
import {
  Badge, Button, Card, Chip, cx, EmptyState, Field,
  Input, PageHeader, SectionTitle, Select, Textarea
} from "@/components/ui";
import {
  addImportDraft, addImportDrafts, addRecipe, addRecipeSource,
  removeImportDraft, removeRecipeSource, uid,
  updateImportDraft, updateRecipeSource, useDB
} from "@/lib/store";
import { parseRecipeText, splitBatchText } from "@/lib/parseRecipe";
import type {
  DraftConfidence, FoodCategory, MealSlot, Recipe, RecipeCategory,
  RecipeImportDraft, RecipeIngredient, RecipeSource, RecipeSourceType
} from "@/lib/types";

const SOURCE_TYPES: RecipeSourceType[] = [
  "Book", "PDF", "Website", "Personal notes", "Smoothie library", "AI generated", "Other"
];
const DIET_STYLES = [
  "Mediterranean","Paleo","Vegetarian","Vegan","Pescatarian","Carnivore",
  "Keto","Low Carb","High Protein","Plant-Forward","Whole-Food Reset","Other"
];
const MEAL_SLOTS: MealSlot[] = ["smoothie","lunch","dinner","flexible"];
const RECIPE_CATS: RecipeCategory[] = [
  "Smoothie","Lunch","Dinner","Dessert","Casserole","Friend gathering",
  "Meal prep","Side dish","Sauce","Quick meal","Other"
];
const FOOD_CATS: FoodCategory[] = [
  "Produce","Protein","Dairy","Frozen","Pantry","Grains",
  "Spices","Condiments","Drinks","Supplements","Other"
];

const CONFIDENCE_TONE: Record<DraftConfidence, string> = {
  high:   "bg-pine-soft text-pine-deep border-pine/20",
  medium: "bg-amber-soft text-amber-dark border-amber/20",
  low:    "bg-clay-soft text-clay-dark border-clay/20"
};

// Convert a string ingredient line to a RecipeIngredient object
function parseIngLine(line: string): RecipeIngredient {
  const parts = line.trim().split(/\s+/);
  return {
    id: uid(),
    quantity: parts[0] ?? "",
    unit: parts[1] ?? "",
    name: parts.slice(2).join(" ") || line,
    category: "Other" as FoodCategory
  };
}

// Save a draft to the Recipe Library
function draftToRecipe(draft: RecipeImportDraft, source?: RecipeSource): Recipe {
  const now = new Date().toISOString();
  return {
    id: uid(),
    name: draft.parsedName,
    sourceOrAuthor: source?.author ?? source?.name,
    sourceId: draft.sourceId,
    dietStyle: draft.parsedDietStyle || source?.dietStyle,
    mealSlot: (draft.parsedMealSlot as MealSlot) || "flexible",
    category: (draft.parsedCategory as RecipeCategory) || "Other",
    ingredients: draft.parsedIngredients.map(parseIngLine),
    instructions: draft.parsedInstructions,
    prepTimeMinutes: draft.parsedPrepTimeMinutes,
    cookTimeMinutes: draft.parsedCookTimeMinutes,
    servings: draft.parsedServings,
    tags: draft.parsedTags,
    notes: draft.rawText.length > 200
      ? `Imported from ${source?.name ?? "text"}. Original text saved in notes.`
      : draft.rawText,
    createdAt: now, updatedAt: now
  };
}

// ---- Source Form ----
function SourceForm({ initial, onSave, onCancel }: {
  initial: Partial<RecipeSource>;
  onSave: (s: Partial<RecipeSource>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial.name ?? "");
  const [author, setAuthor] = useState(initial.author ?? "");
  const [sourceType, setSourceType] = useState<RecipeSourceType>(initial.sourceType ?? "Book");
  const [dietStyle, setDietStyle] = useState(initial.dietStyle ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");

  return (
    <Card className="space-y-3 border-pine/30">
      <div className="flex items-center justify-between">
        <p className="font-bold text-pine-deep text-sm">{initial.id ? "Edit source" : "Add source"}</p>
        <button onClick={onCancel}><X size={16} className="text-faint" /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Source name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mark Hyman" />
        </Field>
        <Field label="Author">
          <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Mark Hyman" />
        </Field>
        <Field label="Type">
          <Select value={sourceType} onChange={(e) => setSourceType(e.target.value as RecipeSourceType)}>
            {SOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Diet style">
          <Select value={dietStyle} onChange={(e) => setDietStyle(e.target.value)}>
            <option value="">None</option>
            {DIET_STYLES.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Notes">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes about this source..." />
      </Field>
      <Button onClick={() => { if (name.trim()) onSave({ name, author, sourceType, dietStyle: dietStyle || undefined, notes: notes || undefined }); }}>
        <Check size={14} /> Save source
      </Button>
    </Card>
  );
}

// ---- Draft Editor Card ----
function DraftCard({ draft, source, onSave, onDelete }: {
  draft: RecipeImportDraft;
  source?: RecipeSource;
  onSave: (d: RecipeImportDraft) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [name, setName] = useState(draft.parsedName);
  const [ingredients, setIngredients] = useState(draft.parsedIngredients.join("\n"));
  const [instructions, setInstructions] = useState(draft.parsedInstructions.join("\n"));
  const [mealSlot, setMealSlot] = useState(draft.parsedMealSlot ?? "");
  const [category, setCategory] = useState(draft.parsedCategory ?? "");
  const [dietStyle, setDietStyle] = useState(draft.parsedDietStyle ?? "");
  const [servings, setServings] = useState(draft.parsedServings?.toString() ?? "");
  const [prepTime, setPrepTime] = useState(draft.parsedPrepTimeMinutes?.toString() ?? "");
  const [cookTime, setCookTime] = useState(draft.parsedCookTimeMinutes?.toString() ?? "");
  const [notes, setNotes] = useState(draft.notes ?? "");

  function saveToLibrary() {
    const updated: RecipeImportDraft = {
      ...draft,
      parsedName: name,
      parsedIngredients: ingredients.split("\n").filter(Boolean),
      parsedInstructions: instructions.split("\n").filter(Boolean),
      parsedMealSlot: mealSlot || undefined,
      parsedCategory: category || undefined,
      parsedDietStyle: dietStyle || undefined,
      parsedServings: servings ? +servings : undefined,
      parsedPrepTimeMinutes: prepTime ? +prepTime : undefined,
      parsedCookTimeMinutes: cookTime ? +cookTime : undefined,
      notes: notes || undefined,
      saved: true
    };
    onSave(updated);
  }

  return (
    <Card className={cx("space-y-2", draft.needsReview && "border-amber/40")}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-ink text-sm">{name || "Untitled"}</p>
            <span className={cx(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              CONFIDENCE_TONE[draft.confidence]
            )}>
              {draft.confidence} confidence
            </span>
            {draft.needsReview && <Badge tone="amber">Review needed</Badge>}
            {source && <span className="text-xs text-faint">{source.name}</span>}
          </div>
          <p className="text-xs text-faint mt-0.5">
            {draft.parsedIngredients.length} ingredients, {draft.parsedInstructions.length} steps
          </p>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-faint hover:text-ink mt-0.5 flex-shrink-0">
          {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
        </button>
      </div>

      {expanded && (
        <div className="space-y-3 pt-2 border-t border-line/60">
          <Field label="Recipe name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Meal slot">
              <Select value={mealSlot} onChange={(e) => setMealSlot(e.target.value)}>
                <option value="">Unknown</option>
                {MEAL_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Category">
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Unknown</option>
                {RECIPE_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Diet style">
              <Select value={dietStyle} onChange={(e) => setDietStyle(e.target.value)}>
                <option value="">Unknown</option>
                {DIET_STYLES.map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
            </Field>
            <Field label="Servings">
              <Input type="number" value={servings} onChange={(e) => setServings(e.target.value)} placeholder="4" />
            </Field>
            <Field label="Prep (min)">
              <Input type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} placeholder="15" />
            </Field>
            <Field label="Cook (min)">
              <Input type="number" value={cookTime} onChange={(e) => setCookTime(e.target.value)} placeholder="20" />
            </Field>
          </div>
          <Field label="Ingredients" hint="One per line: quantity unit name">
            <Textarea
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              className="min-h-[100px] font-mono text-xs"
            />
          </Field>
          <Field label="Instructions" hint="One step per line">
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="min-h-[100px]"
            />
          </Field>
          <Field label="Notes">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes about this recipe..." />
          </Field>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={saveToLibrary}>
              <Check size={14} /> Save to Recipe Library
            </Button>
            <Button variant="ghost" onClick={onDelete}>
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ---- Sources Tab ----
function SourcesTab() {
  const { db } = useDB();
  const sources = db.recipeSources ?? [];
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  function handleAdd(patch: Partial<RecipeSource>) {
    const now = new Date().toISOString();
    addRecipeSource({ id: uid(), name: patch.name ?? "", author: patch.author, sourceType: patch.sourceType ?? "Other", dietStyle: patch.dietStyle, notes: patch.notes, tags: [], createdAt: now, updatedAt: now });
    setShowAdd(false);
  }

  return (
    <div className="space-y-3">
      {showAdd ? (
        <SourceForm initial={{}} onSave={handleAdd} onCancel={() => setShowAdd(false)} />
      ) : (
        <Button variant="secondary" className="w-full" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Add recipe source
        </Button>
      )}
      {sources.length === 0 && !showAdd && (
        <EmptyState title="No sources yet" body="Add a source to track where your recipes come from." />
      )}
      {sources.map((s) => (
        editId === s.id ? (
          <SourceForm
            key={s.id}
            initial={s}
            onSave={(patch) => { updateRecipeSource(s.id, { ...patch, updatedAt: new Date().toISOString() }); setEditId(null); }}
            onCancel={() => setEditId(null)}
          />
        ) : (
          <Card key={s.id} className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-ink text-sm">{s.name}</p>
                <Badge tone="sea">{s.sourceType}</Badge>
                {s.dietStyle && <Badge tone="sage">{s.dietStyle}</Badge>}
              </div>
              {s.author && s.author !== s.name && <p className="text-xs text-muted mt-0.5">by {s.author}</p>}
              {s.notes && <p className="text-xs text-faint mt-0.5">{s.notes}</p>}
            </div>
            <div className="flex gap-1">
              <button onClick={() => setEditId(s.id)} className="text-faint hover:text-ink p-1"><Pencil size={14} /></button>
              <button onClick={() => removeRecipeSource(s.id)} className="text-faint hover:text-clay p-1"><Trash2 size={14} /></button>
            </div>
          </Card>
        )
      ))}
    </div>
  );
}

// ---- Import Tab ----
function ImportTab() {
  const { db } = useDB();
  const sources = db.recipeSources ?? [];
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [parsing, setParsing] = useState(false);
  const [aiMsg, setAiMsg] = useState<string | null>(null);
  const [localDrafts, setLocalDrafts] = useState<RecipeImportDraft[]>([]);
  const [saved, setSaved] = useState<string | null>(null);

  const selectedSource = sources.find((s) => s.id === selectedSourceId);

  function makeDraft(raw: string): RecipeImportDraft {
    const parsed = parseRecipeText(raw);
    const now = new Date().toISOString();
    return {
      id: uid(),
      sourceId: selectedSourceId || undefined,
      rawText: raw,
      ...parsed,
      parsedMealSlot: undefined,
      parsedCategory: undefined,
      saved: false,
      createdAt: now, updatedAt: now
    };
  }

  function parseLocal() {
    if (!text.trim()) return;
    setParsing(true);
    if (mode === "batch") {
      const blocks = splitBatchText(text);
      setLocalDrafts(blocks.map(makeDraft));
    } else {
      setLocalDrafts([makeDraft(text)]);
    }
    setParsing(false);
  }

  async function parseWithAI() {
    if (!text.trim()) return;
    setParsing(true);
    setAiMsg("Extracting with AI...");
    try {
      const res = await fetch("/api/extract-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 4000) })
      });
      const data = await res.json();
      const now = new Date().toISOString();
      const draft: RecipeImportDraft = {
        id: uid(),
        sourceId: selectedSourceId || undefined,
        rawText: text,
        parsedName: data.parsedName ?? "Untitled Recipe",
        parsedIngredients: data.parsedIngredients ?? [],
        parsedInstructions: data.parsedInstructions ?? [],
        parsedServings: data.parsedServings,
        parsedPrepTimeMinutes: data.parsedPrepTimeMinutes,
        parsedCookTimeMinutes: data.parsedCookTimeMinutes,
        parsedMealSlot: data.parsedMealSlot,
        parsedCategory: undefined,
        parsedDietStyle: data.parsedDietStyle,
        parsedTags: data.parsedTags ?? [],
        confidence: data.simulated ? "medium" : "high",
        needsReview: Boolean(data.simulated),
        saved: false,
        notes: data.simulated ? "Parsed locally (no API key set)." : undefined,
        createdAt: now, updatedAt: now
      };
      setLocalDrafts([draft]);
      setAiMsg(data.simulated ? "Parsed locally (no API key set)." : null);
    } catch {
      setAiMsg("AI extraction failed. Using local parser.");
      parseLocal();
    }
    setParsing(false);
  }

  function handleSaveDraft(updated: RecipeImportDraft) {
    // Save recipe to library
    const recipe = draftToRecipe(updated, selectedSource);
    addRecipe(recipe);
    // Save draft to DB (marked saved) and remove from local preview
    addImportDraft({ ...updated, saved: true });
    setLocalDrafts((prev) => prev.filter((d) => d.id !== updated.id));
    setSaved(`"${recipe.name}" saved to Recipe Library.`);
    setTimeout(() => setSaved(null), 3000);
  }

  function handleSaveAll() {
    for (const draft of localDrafts) {
      const recipe = draftToRecipe(draft, selectedSource);
      addRecipe(recipe);
      addImportDraft({ ...draft, saved: true });
    }
    setSaved(`${localDrafts.length} recipe${localDrafts.length !== 1 ? "s" : ""} saved to Recipe Library.`);
    setLocalDrafts([]);
    setTimeout(() => setSaved(null), 3000);
  }

  return (
    <div className="space-y-4">
      {saved && (
        <div className="flex items-center gap-2 rounded-xl bg-pine-soft border border-pine/20 px-4 py-3 text-sm font-semibold text-pine-deep">
          <Check size={16} /> {saved}
        </div>
      )}

      <Card className="space-y-3">
        <SectionTitle>1. Choose source (optional)</SectionTitle>
        <Select value={selectedSourceId} onChange={(e) => setSelectedSourceId(e.target.value)}>
          <option value="">No source selected</option>
          {sources.map((s) => <option key={s.id} value={s.id}>{s.name}{s.author && s.author !== s.name ? ` (${s.author})` : ""}</option>)}
        </Select>
        {!sources.length && (
          <p className="text-xs text-faint">Add sources in the Sources tab to track where recipes come from.</p>
        )}
      </Card>

      <Card className="space-y-3">
        <SectionTitle>2. Paste recipe text</SectionTitle>
        <div className="flex rounded-xl border border-line overflow-hidden">
          <button onClick={() => setMode("single")} className={cx("flex-1 px-3 py-1.5 text-xs font-bold", mode === "single" ? "bg-pine-soft text-pine-deep" : "text-faint")}>Single recipe</button>
          <button onClick={() => setMode("batch")} className={cx("flex-1 px-3 py-1.5 text-xs font-bold", mode === "batch" ? "bg-pine-soft text-pine-deep" : "text-faint")}>Batch (multiple recipes)</button>
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={mode === "batch"
            ? "Paste multiple recipes here.\nSeparate each recipe with two blank lines.\n\nRecipe 1 name\nIngredients:\n...\n\n\nRecipe 2 name\nIngredients:\n..."
            : "Paste recipe text here.\n\nExample:\nLemon Herb Chicken\nServes: 4\nPrep: 15 min\nCook: 25 min\n\nIngredients:\n1 lb chicken breast\n2 tbsp olive oil\n...\n\nInstructions:\n1. Preheat oven...\n2. Season chicken..."}
          className="min-h-[180px] font-mono text-xs"
        />
        {aiMsg && <p className="text-xs text-muted">{aiMsg}</p>}
        <div className="flex gap-2 flex-wrap">
          <Button variant="primary" onClick={parseLocal} disabled={parsing || !text.trim()}>
            <FileInput size={14} /> Parse {mode === "batch" ? "recipes" : "recipe"}
          </Button>
          <Button variant="secondary" onClick={parseWithAI} disabled={parsing || !text.trim()}>
            <Zap size={14} /> Extract with AI
          </Button>
        </div>
        <p className="text-xs text-faint">
          Parse uses a local reader. Extract with AI uses OpenAI if an API key is set, otherwise falls back to local parsing.
        </p>
      </Card>

      {localDrafts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionTitle>{localDrafts.length} draft{localDrafts.length !== 1 ? "s" : ""} ready to review</SectionTitle>
            {localDrafts.length > 1 && (
              <Button variant="secondary" className="text-xs" onClick={handleSaveAll}>
                Save all to library
              </Button>
            )}
          </div>
          {localDrafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              source={selectedSource}
              onSave={handleSaveDraft}
              onDelete={() => setLocalDrafts((prev) => prev.filter((d) => d.id !== draft.id))}
            />
          ))}
        </div>
      )}

      {/* Future placeholders */}
      <section className="space-y-2 pt-2">
        <p className="label-tick">Coming next</p>
        {[
          { label: "Full PDF recipe importer", desc: "Upload a PDF and extract all recipes automatically." },
          { label: "Recipe photo scan", desc: "Take a photo of a recipe card or cookbook page." },
          { label: "OpenAI recipe extraction", desc: "Paste a URL or description and let AI structure it." }
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

// ---- Drafts Tab ----
function DraftsTab() {
  const { db } = useDB();
  const sources = db.recipeSources ?? [];
  const allDrafts = db.importDrafts ?? [];
  const pending = allDrafts.filter((d) => !d.saved);

  function handleSave(updated: RecipeImportDraft) {
    const source = sources.find((s) => s.id === updated.sourceId);
    const recipe = draftToRecipe(updated, source);
    addRecipe(recipe);
    updateImportDraft(updated.id, { ...updated, saved: true });
  }

  if (pending.length === 0) {
    return (
      <EmptyState
        title="No pending drafts"
        body="Parse recipe text in the Import tab to create drafts. They will appear here until saved to Recipe Library."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{pending.length} draft{pending.length !== 1 ? "s" : ""} waiting to be saved.</p>
      {pending.map((draft) => (
        <DraftCard
          key={draft.id}
          draft={draft}
          source={sources.find((s) => s.id === draft.sourceId)}
          onSave={handleSave}
          onDelete={() => removeImportDraft(draft.id)}
        />
      ))}
    </div>
  );
}

// ---- MAIN PAGE ----
type TabId = "import" | "sources" | "drafts";

export default function RecipeImporterPage() {
  const { db, ready } = useDB();
  const [tab, setTab] = useState<TabId>("import");
  const pendingCount = (db.importDrafts ?? []).filter((d) => !d.saved).length;

  const TABS: { id: TabId; label: string }[] = [
    { id: "import",  label: "Import" },
    { id: "sources", label: `Sources (${(db.recipeSources ?? []).length})` },
    { id: "drafts",  label: `Drafts${pendingCount > 0 ? ` (${pendingCount})` : ""}` }
  ];

  if (!ready) return <div className="page-container"><PageHeader title="Recipe Importer" /></div>;

  return (
    <div className="page-container">
      <PageHeader
        title="Recipe Importer"
        sub="Turn recipe notes into structured recipes."
      />

      {/* Tab nav */}
      <div className="flex gap-1 rounded-xl bg-mist/60 p-1 border border-line/50">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cx(
              "flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
              tab === id ? "bg-surface text-pine-deep shadow-sm border border-line/50" : "text-muted hover:text-ink"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "import"  && <ImportTab />}
      {tab === "sources" && <SourcesTab />}
      {tab === "drafts"  && <DraftsTab />}
    </div>
  );
}
