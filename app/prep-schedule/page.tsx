"use client";

import { useState } from "react";
import { Check, Clock, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  Badge, Button, Card, cx, EmptyState, Field, Input,
  PageHeader, SectionTitle, Select, Textarea
} from "@/components/ui";
import { addPrepTask, removePrepTask, uid, updatePrepTask, useDB } from "@/lib/store";
import type { PrepCategory, PrepTask } from "@/lib/types";

const CATEGORIES: PrepCategory[] = [
  "Shopping","Washing","Chopping","Cooking protein","Cooking grains",
  "Smoothie prep","Portioning","Freezing","Sauces","Cleanup","Other"
];

const CAT_COLORS: Record<PrepCategory, string> = {
  "Shopping":       "bg-amber-soft text-amber-dark border-amber/20",
  "Washing":        "bg-sea-soft text-sea-dark border-sea/20",
  "Chopping":       "bg-sage-soft text-sage-dark border-sage/20",
  "Cooking protein":"bg-food-soft text-food-dark border-food/20",
  "Cooking grains": "bg-pine-soft text-pine-deep border-pine/20",
  "Smoothie prep":  "bg-pine-soft text-pine-deep border-pine/20",
  "Portioning":     "bg-sage-soft text-sage-dark border-sage/20",
  "Freezing":       "bg-sea-soft text-sea-dark border-sea/20",
  "Sauces":         "bg-amber-soft text-amber-dark border-amber/20",
  "Cleanup":        "bg-line/60 text-muted border-line",
  "Other":          "bg-line/60 text-muted border-line"
};

function TaskRow({ task, recipes, smoothies }: {
  task: PrepTask;
  recipes: { id: string; name: string }[];
  smoothies: { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [cat, setCat] = useState(task.category);
  const [mins, setMins] = useState(task.estimatedMinutes?.toString() ?? "");
  const [notes, setNotes] = useState(task.notes ?? "");
  const [date, setDate] = useState(task.scheduledDate ?? "");

  const relatedNames = [
    ...task.relatedRecipeIds.map((id) => recipes.find((r) => r.id === id)?.name).filter(Boolean),
    ...task.relatedSmoothieIds.map((id) => smoothies.find((s) => s.id === id)?.name).filter(Boolean)
  ] as string[];

  function save() {
    updatePrepTask(task.id, {
      title, category: cat, estimatedMinutes: mins ? +mins : undefined,
      notes: notes || undefined, scheduledDate: date || undefined,
      updatedAt: new Date().toISOString()
    });
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-pine/30 bg-surface p-3 space-y-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-sm font-semibold" />
        <div className="grid grid-cols-2 gap-2">
          <Select value={cat} onChange={(e) => setCat(e.target.value as PrepCategory)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input type="number" value={mins} onChange={(e) => setMins(e.target.value)} placeholder="Est. minutes" className="text-xs" />
        </div>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-xs" />
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes..." className="text-xs" />
        <div className="flex gap-2">
          <Button className="text-xs px-3 py-1.5" onClick={save}><Check size={12} /> Save</Button>
          <Button variant="ghost" className="text-xs px-3 py-1.5" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cx("flex items-start gap-3 rounded-xl border bg-surface px-3 py-2.5", task.completed && "opacity-60")}>
      <button
        onClick={() => updatePrepTask(task.id, { completed: !task.completed, updatedAt: new Date().toISOString() })}
        className={cx(
          "flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
          task.completed ? "bg-pine border-pine" : "border-line"
        )}
      >
        {task.completed && <Check size={11} className="text-white" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cx("text-sm font-semibold", task.completed && "line-through text-faint")}>{task.title}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className={cx(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            CAT_COLORS[task.category]
          )}>
            {task.category}
          </span>
          {task.estimatedMinutes && (
            <span className="flex items-center gap-1 text-xs text-faint">
              <Clock size={11} /> {task.estimatedMinutes} min
            </span>
          )}
          {task.scheduledDate && (
            <span className="text-xs text-faint">
              {new Date(task.scheduledDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </span>
          )}
        </div>
        {relatedNames.length > 0 && (
          <p className="text-[11px] text-faint mt-0.5">For: {relatedNames.join(", ")}</p>
        )}
        {task.notes && <p className="text-xs text-muted mt-0.5 italic">{task.notes}</p>}
      </div>

      <div className="flex gap-1 flex-shrink-0">
        <button onClick={() => setEditing(true)} className="text-faint hover:text-ink p-1"><Pencil size={13} /></button>
        <button onClick={() => removePrepTask(task.id)} className="text-faint hover:text-clay p-1"><Trash2 size={13} /></button>
      </div>
    </div>
  );
}

function AddTaskForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState<PrepCategory>("Chopping");
  const [mins, setMins] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");

  function save() {
    if (!title.trim()) return;
    const now = new Date().toISOString();
    addPrepTask({
      id: uid(), title, category: cat,
      estimatedMinutes: mins ? +mins : undefined,
      scheduledDate: date || undefined, notes: notes || undefined,
      relatedRecipeIds: [], relatedSmoothieIds: [],
      completed: false, createdAt: now, updatedAt: now
    });
    onSave();
  }

  return (
    <Card className="space-y-3 border-pine/30">
      <div className="flex items-center justify-between">
        <p className="font-bold text-pine-deep text-sm">Add prep task</p>
        <button onClick={onCancel}><X size={16} className="text-faint" /></button>
      </div>
      <Field label="Task title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chop vegetables for the week" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <Select value={cat} onChange={(e) => setCat(e.target.value as PrepCategory)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Estimated minutes">
          <Input type="number" value={mins} onChange={(e) => setMins(e.target.value)} placeholder="30" />
        </Field>
      </div>
      <Field label="Scheduled date">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Notes">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Store in Pyrex. Portion for weekday meals." className="min-h-[60px]" />
      </Field>
      <div className="flex gap-2">
        <Button className="flex-1" onClick={save}><Check size={14} /> Add task</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
  );
}

export default function PrepSchedulePage() {
  const { db, ready } = useDB();
  const [groupBy, setGroupBy] = useState<"category" | "day">("category");
  const [showAdd, setShowAdd] = useState(false);

  const tasks = db.prepTasks ?? [];
  const recipes = db.recipes ?? [];
  const smoothies = db.smoothies ?? [];

  const totalMinutes = tasks.filter((t) => !t.completed).reduce((s, t) => s + (t.estimatedMinutes ?? 0), 0);
  const doneCount = tasks.filter((t) => t.completed).length;

  function exportText() {
    const pending = tasks.filter((t) => !t.completed);
    const lines = pending.map((t) =>
      `[ ] ${t.title}${t.estimatedMinutes ? ` (${t.estimatedMinutes} min)` : ""}${t.notes ? ` - ${t.notes}` : ""}`
    );
    const text = `Prep Schedule\n\n${lines.join("\n")}`;
    navigator.clipboard.writeText(text).catch(() => {});
    alert("Prep schedule copied to clipboard.");
  }

  function grouped() {
    const result: Record<string, PrepTask[]> = {};
    for (const task of tasks) {
      const key = groupBy === "category"
        ? task.category
        : task.scheduledDate
          ? new Date(task.scheduledDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
          : "No date";
      if (!result[key]) result[key] = [];
      result[key].push(task);
    }
    return result;
  }

  if (!ready) return <div className="page-container"><PageHeader title="Prep Schedule" /></div>;

  const groups = grouped();

  return (
    <div className="page-container">
      <PageHeader
        title="Prep Schedule"
        sub="Your weekly food prep checklist."
      />

      {/* Stats */}
      {tasks.length > 0 && (
        <Card className="flex items-center justify-between">
          <div>
            <p className="font-bold text-ink text-sm">{tasks.length - doneCount} task{tasks.length - doneCount !== 1 ? "s" : ""} remaining</p>
            {totalMinutes > 0 && (
              <p className="text-xs text-muted flex items-center gap-1">
                <Clock size={11} /> About {totalMinutes} min of prep time
              </p>
            )}
          </div>
          {doneCount > 0 && <Badge tone="pine">{doneCount} done</Badge>}
        </Card>
      )}

      {/* Controls */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="flex rounded-xl border border-line overflow-hidden">
          <button
            onClick={() => setGroupBy("category")}
            className={cx("px-3 py-1.5 text-xs font-bold", groupBy === "category" ? "bg-pine-soft text-pine-deep" : "text-faint")}
          >
            By category
          </button>
          <button
            onClick={() => setGroupBy("day")}
            className={cx("px-3 py-1.5 text-xs font-bold", groupBy === "day" ? "bg-pine-soft text-pine-deep" : "text-faint")}
          >
            By day
          </button>
        </div>
        {tasks.length > 0 && (
          <Button variant="ghost" className="text-xs" onClick={exportText}>Export</Button>
        )}
      </div>

      {/* Add task */}
      {showAdd ? (
        <AddTaskForm onSave={() => setShowAdd(false)} onCancel={() => setShowAdd(false)} />
      ) : (
        <Button variant="secondary" className="w-full" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Add prep task
        </Button>
      )}

      {/* Task groups */}
      {tasks.length === 0 ? (
        <EmptyState
          title="No prep tasks yet"
          body='Generate a prep checklist from Weekly Plan, or add tasks manually.'
        />
      ) : (
        <div className="space-y-5">
          {Object.entries(groups).map(([group, groupTasks]) => (
            <section key={group}>
              <SectionTitle>
                {group}
                <span className="ml-1 text-xs font-normal text-faint">
                  ({groupTasks.filter((t) => !t.completed).length} left)
                </span>
              </SectionTitle>
              <div className="space-y-2">
                {groupTasks.map((task) => (
                  <TaskRow key={task.id} task={task} recipes={recipes} smoothies={smoothies} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Future placeholders */}
      <section className="space-y-3 pt-2">
        <SectionTitle>Coming next</SectionTitle>
        {[
          { label: "Kitchen inventory", desc: "Track what you have so prep tasks can skip already-done steps." },
          { label: "Barcode scan", desc: "Scan pantry items and auto-update what you have in stock." },
          { label: "ICS calendar export", desc: "Send your prep schedule to Google Calendar or Apple Calendar." }
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
