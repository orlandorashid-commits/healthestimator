"use client";

import { useState } from "react";
import {
  Archive, Check, ChevronDown, ChevronUp, Copy, Pencil,
  Plus, ShoppingCart, Trash2, X
} from "lucide-react";
import {
  Badge, Button, Card, Chip, cx, EmptyState, Field,
  Input, PageHeader, SectionTitle, Select, Textarea
} from "@/components/ui";
import {
  addGroceryItem, addInventoryCategory, addInventoryItem, addInventoryLocation,
  removeInventoryCategory, removeInventoryItem, removeInventoryLocation,
  uid, updateInventoryCategory, updateInventoryItem, updateInventoryLocation, useDB
} from "@/lib/store";
import type {
  ExpirationEstimateRule, InventoryCategory, InventoryItem, InventoryLocation
} from "@/lib/types";

// ---- Expiration helpers ----

function estimateDaysUntilExpiry(item: InventoryItem, rules: ExpirationEstimateRule[]): number | null {
  if (item.usedUp) return null;
  const expDate = getEffectiveExpiry(item, rules);
  if (!expDate) return null;
  const today = new Date().toISOString().slice(0, 10);
  const diff = Math.floor(
    (new Date(expDate + "T12:00:00").getTime() - new Date(today + "T12:00:00").getTime())
    / (1000 * 60 * 60 * 24)
  );
  return diff;
}

function getEffectiveExpiry(item: InventoryItem, rules: ExpirationEstimateRule[]): string | null {
  if (item.expirationOverride && item.expirationDate) return item.expirationDate;
  if (item.purchaseDate) {
    const nameLower = item.name.toLowerCase();
    const locLower = item.location.toLowerCase();
    const rule = rules.find((r) => {
      const kwMatch = nameLower.includes(r.itemKeyword.toLowerCase());
      const locMatch = !r.storageLocation || locLower.includes(r.storageLocation.toLowerCase());
      return kwMatch && locMatch;
    });
    if (rule) {
      const d = new Date(item.purchaseDate + "T12:00:00");
      d.setDate(d.getDate() + rule.estimatedDaysFresh);
      return d.toISOString().slice(0, 10);
    }
  }
  return item.expirationDate ?? null;
}

type ItemStatus = "use-first" | "use-soon" | "expired" | "low-stock" | "fresh" | "shelf-stable" | "used-up";

function getStatus(item: InventoryItem, rules: ExpirationEstimateRule[]): ItemStatus {
  if (item.usedUp) return "used-up";
  if (item.useFirst) return "use-first";
  const days = estimateDaysUntilExpiry(item, rules);
  if (days !== null) {
    if (days < 0) return "expired";
    if (days <= 3 || item.useSoon) return "use-soon";
  } else if (item.useSoon) return "use-soon";
  if (item.lowStock) return "low-stock";
  if (days === null) return "shelf-stable";
  return "fresh";
}

function expiryLabel(item: InventoryItem, rules: ExpirationEstimateRule[]): string {
  const days = estimateDaysUntilExpiry(item, rules);
  const effDate = getEffectiveExpiry(item, rules);
  const override = item.expirationOverride;
  if (days === null) return "No expiry estimate";
  const prefix = override ? "Expires" : "Est. freshness";
  if (days < 0) return `${prefix}: check before using`;
  if (days === 0) return `${prefix}: today`;
  if (days === 1) return `${prefix}: tomorrow`;
  if (days <= 7) return `${prefix}: ${days} days`;
  if (effDate) return `${prefix}: ${new Date(effDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  return `${prefix}: ${days} days`;
}

const STATUS_LABELS: Record<ItemStatus, string> = {
  "use-first":    "Use First",
  "use-soon":     "Use Soon",
  "expired":      "Check Today",
  "low-stock":    "Low Stock",
  "fresh":        "Fresh",
  "shelf-stable": "Shelf Stable",
  "used-up":      "Used Up"
};

const STATUS_TONE: Record<ItemStatus, string> = {
  "use-first":    "bg-food-soft text-food-dark border-food/30",
  "use-soon":     "bg-amber-soft text-amber-dark border-amber/30",
  "expired":      "bg-clay-soft text-clay-dark border-clay/30",
  "low-stock":    "bg-amber-soft text-amber-dark border-amber/30",
  "fresh":        "bg-pine-soft text-pine-deep border-pine/20",
  "shelf-stable": "bg-line/50 text-muted border-line",
  "used-up":      "bg-line/30 text-faint border-line"
};

// ---- Item form ----

interface ItemForm {
  name: string; category: string; location: string;
  quantity: string; unit: string;
  purchaseDate: string; expirationDate: string; expirationOverride: boolean;
  opened: boolean; lowStock: boolean; useSoon: boolean; useFirst: boolean;
  preferredStore: string; notes: string;
}

function emptyItemForm(locations: string[], categories: string[]): ItemForm {
  return {
    name: "", category: categories[0] ?? "Produce", location: locations[0] ?? "Pantry",
    quantity: "", unit: "", purchaseDate: new Date().toISOString().slice(0, 10),
    expirationDate: "", expirationOverride: false,
    opened: false, lowStock: false, useSoon: false, useFirst: false,
    preferredStore: "", notes: ""
  };
}

function itemToForm(item: InventoryItem): ItemForm {
  return {
    name: item.name, category: item.category, location: item.location,
    quantity: item.quantity?.toString() ?? "", unit: item.unit ?? "",
    purchaseDate: item.purchaseDate ?? "", expirationDate: item.expirationDate ?? "",
    expirationOverride: item.expirationOverride,
    opened: item.opened, lowStock: item.lowStock,
    useSoon: item.useSoon, useFirst: item.useFirst,
    preferredStore: item.preferredStore ?? "", notes: item.notes ?? ""
  };
}

function formToItem(f: ItemForm, existing?: InventoryItem): InventoryItem {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? uid(),
    name: f.name, category: f.category, location: f.location,
    quantity: f.quantity ? +f.quantity : undefined, unit: f.unit || undefined,
    purchaseDate: f.purchaseDate || undefined,
    expirationDate: f.expirationDate || undefined,
    expirationOverride: f.expirationOverride,
    opened: f.opened, lowStock: f.lowStock,
    useSoon: f.useSoon, useFirst: f.useFirst, usedUp: existing?.usedUp ?? false,
    sourceGroceryItemId: existing?.sourceGroceryItemId,
    preferredStore: f.preferredStore || undefined,
    notes: f.notes || undefined,
    createdAt: existing?.createdAt ?? now, updatedAt: now
  };
}

function ItemFormPanel({ initial, locations, categories, onSave, onCancel }: {
  initial: ItemForm;
  locations: string[];
  categories: string[];
  onSave: (f: ItemForm) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState(initial);
  const p = <K extends keyof ItemForm>(k: K, v: ItemForm[K]) => setF((prev) => ({ ...prev, [k]: v }));

  return (
    <Card className="space-y-3 border-pine/30">
      <div className="flex items-center justify-between">
        <p className="font-bold text-pine-deep text-sm">{initial.name ? "Edit item" : "Add item"}</p>
        <button onClick={onCancel}><X size={16} className="text-faint hover:text-ink" /></button>
      </div>
      <Field label="Name">
        <Input value={f.name} onChange={(e) => p("name", e.target.value)} placeholder="Rotisserie chicken" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Location">
          <Select value={f.location} onChange={(e) => p("location", e.target.value)}>
            {locations.map((l) => <option key={l} value={l}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Category">
          <Select value={f.category} onChange={(e) => p("category", e.target.value)}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Quantity">
          <Input type="number" value={f.quantity} onChange={(e) => p("quantity", e.target.value)} placeholder="1" />
        </Field>
        <Field label="Unit">
          <Input value={f.unit} onChange={(e) => p("unit", e.target.value)} placeholder="lb, bag, count..." />
        </Field>
        <Field label="Purchase date">
          <Input type="date" value={f.purchaseDate} onChange={(e) => p("purchaseDate", e.target.value)} />
        </Field>
        <Field label="Expiration date (optional)">
          <Input type="date" value={f.expirationDate} onChange={(e) => {
            p("expirationDate", e.target.value);
            if (e.target.value) p("expirationOverride", true);
          }} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-3">
        {(["opened","lowStock","useSoon","useFirst"] as const).map((flag) => (
          <label key={flag} className="flex items-center gap-1.5 text-xs font-semibold text-ink cursor-pointer">
            <input type="checkbox" checked={f[flag] as boolean}
              onChange={(e) => p(flag, e.target.checked)} />
            {flag === "opened" ? "Opened" : flag === "lowStock" ? "Low stock" : flag === "useSoon" ? "Use soon" : "Use first"}
          </label>
        ))}
      </div>
      <Field label="Notes">
        <Input value={f.notes} onChange={(e) => p("notes", e.target.value)} placeholder="Any notes..." />
      </Field>
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => { if (f.name.trim()) onSave(f); }}>
          <Check size={14} /> Save item
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
  );
}

// ---- InventoryItemCard ----
function InventoryItemCard({ item, rules, locations, categories }: {
  item: InventoryItem;
  rules: ExpirationEstimateRule[];
  locations: string[];
  categories: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [addedToGrocery, setAddedToGrocery] = useState(false);

  const status = getStatus(item, rules);
  const expLabel = expiryLabel(item, rules);

  function toggle(field: "opened" | "lowStock" | "useSoon" | "useFirst" | "usedUp") {
    updateInventoryItem(item.id, { [field]: !item[field], updatedAt: new Date().toISOString() });
  }

  function handleAddToGrocery(markLowStock = false) {
    if (markLowStock) updateInventoryItem(item.id, { lowStock: true, updatedAt: new Date().toISOString() });
    const now = new Date().toISOString();
    addGroceryItem({
      id: uid(), name: item.name, category: item.category as "Produce",
      preferredStore: item.preferredStore, sourceRecipeIds: [], sourceSmoothieIds: [],
      alreadyHave: false, bought: false, pushToNextTrip: false,
      notes: `From Kitchen Inventory (${item.location})`,
      createdAt: now, updatedAt: now
    });
    setAddedToGrocery(true);
    setTimeout(() => setAddedToGrocery(false), 2000);
  }

  function duplicate() {
    const now = new Date().toISOString();
    addInventoryItem({ ...item, id: uid(), createdAt: now, updatedAt: now });
  }

  if (editing) {
    return (
      <ItemFormPanel
        initial={itemToForm(item)}
        locations={locations}
        categories={categories}
        onSave={(f) => { updateInventoryItem(item.id, formToItem(f, item)); setEditing(false); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <Card className={cx("space-y-2", item.usedUp && "opacity-50")}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cx("font-bold text-sm", item.usedUp ? "line-through text-faint" : "text-ink")}>{item.name}</p>
            <span className={cx(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              STATUS_TONE[status]
            )}>
              {STATUS_LABELS[status]}
            </span>
            {item.opened && <Badge tone="amber">Opened</Badge>}
          </div>
          <p className="text-xs text-faint mt-0.5">
            {item.location} &middot; {item.category}
            {item.quantity != null && <> &middot; {item.quantity}{item.unit ? ` ${item.unit}` : ""}</>}
          </p>
          {status !== "shelf-stable" && status !== "used-up" && (
            <p className={cx(
              "text-xs mt-0.5",
              status === "expired" ? "text-clay" :
              status === "use-soon" || status === "use-first" ? "text-amber" :
              "text-faint"
            )}>
              {expLabel}
            </p>
          )}
          {addedToGrocery && (
            <p className="text-xs text-pine font-semibold flex items-center gap-1 mt-0.5">
              <Check size={11} /> Added to Grocery List
            </p>
          )}
        </div>
        <button onClick={() => setOpen(!open)} className="text-faint hover:text-ink mt-0.5 flex-shrink-0">
          {open ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
        </button>
      </div>

      {open && (
        <div className="space-y-2 pt-2 border-t border-line/60">
          {item.purchaseDate && (
            <p className="text-xs text-faint">Purchased: {new Date(item.purchaseDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
          )}
          {item.notes && <p className="text-xs text-muted italic">{item.notes}</p>}
          {item.preferredStore && <p className="text-xs text-faint">{item.preferredStore}</p>}

          {/* Quick action chips */}
          <div className="flex flex-wrap gap-1.5">
            <Chip active={item.useFirst} onClick={() => toggle("useFirst")}>Use first</Chip>
            <Chip active={item.opened} onClick={() => toggle("opened")}>Opened</Chip>
            <Chip active={item.lowStock} onClick={() => toggle("lowStock")}>Low stock</Chip>
            <Chip active={item.usedUp} onClick={() => toggle("usedUp")}>Used up</Chip>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="secondary" className="text-xs px-2.5 py-1.5" onClick={() => handleAddToGrocery(false)}>
              <ShoppingCart size={12} /> Add to grocery list
            </Button>
            {!item.lowStock && (
              <Button variant="secondary" className="text-xs px-2.5 py-1.5" onClick={() => handleAddToGrocery(true)}>
                Low stock + add to list
              </Button>
            )}
            {item.usedUp && (
              <Button variant="secondary" className="text-xs px-2.5 py-1.5" onClick={() => {
                toggle("usedUp");
                handleAddToGrocery(false);
              }}>
                Used up + reorder
              </Button>
            )}
            <Button variant="secondary" className="text-xs px-2.5 py-1.5" onClick={() => setEditing(true)}>
              <Pencil size={12} /> Edit
            </Button>
            <Button variant="secondary" className="text-xs px-2.5 py-1.5" onClick={duplicate}>
              <Copy size={12} /> Duplicate
            </Button>
            {confirmDel ? (
              <>
                <Button variant="danger" className="text-xs px-2.5 py-1.5" onClick={() => removeInventoryItem(item.id)}>Confirm delete</Button>
                <Button variant="ghost" className="text-xs px-2.5 py-1.5" onClick={() => setConfirmDel(false)}>Cancel</Button>
              </>
            ) : (
              <Button variant="ghost" className="text-xs px-2.5 py-1.5" onClick={() => setConfirmDel(true)}>
                <Trash2 size={12} /> Delete
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// ---- Locations & Categories manager ----
function LocationManager({ locations }: { locations: InventoryLocation[] }) {
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  function add() {
    if (!newName.trim()) return;
    const now = new Date().toISOString();
    addInventoryLocation({ id: uid(), name: newName.trim(), hidden: false, createdAt: now, updatedAt: now });
    setNewName("");
  }

  return (
    <Card className="space-y-3">
      <SectionTitle>Locations</SectionTitle>
      <div className="flex gap-2">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New location name"
          onKeyDown={(e) => { if (e.key === "Enter") add(); }} className="text-sm" />
        <Button variant="secondary" onClick={add}><Plus size={14} /></Button>
      </div>
      <div className="space-y-1">
        {locations.map((loc) => (
          editId === loc.id ? (
            <div key={loc.id} className="flex gap-2">
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="text-sm flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") { updateInventoryLocation(loc.id, { name: editName, updatedAt: new Date().toISOString() }); setEditId(null); } }} />
              <Button variant="secondary" className="text-xs px-2 py-1.5" onClick={() => { updateInventoryLocation(loc.id, { name: editName, updatedAt: new Date().toISOString() }); setEditId(null); }}><Check size={12} /></Button>
              <Button variant="ghost" className="text-xs px-2 py-1.5" onClick={() => setEditId(null)}><X size={12} /></Button>
            </div>
          ) : (
            <div key={loc.id} className={cx("flex items-center gap-2 rounded-lg px-2 py-1.5", loc.hidden && "opacity-40")}>
              <span className="flex-1 text-sm text-ink">{loc.name}</span>
              <button onClick={() => { setEditId(loc.id); setEditName(loc.name); }} className="text-faint hover:text-ink p-1"><Pencil size={13} /></button>
              <button onClick={() => updateInventoryLocation(loc.id, { hidden: !loc.hidden, updatedAt: new Date().toISOString() })} className="text-faint hover:text-ink p-1 text-xs">{loc.hidden ? "Show" : "Hide"}</button>
              <button onClick={() => removeInventoryLocation(loc.id)} className="text-faint hover:text-clay p-1"><Trash2 size={13} /></button>
            </div>
          )
        ))}
      </div>
    </Card>
  );
}

function CategoryManager({ categories }: { categories: InventoryCategory[] }) {
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  function add() {
    if (!newName.trim()) return;
    const now = new Date().toISOString();
    addInventoryCategory({ id: uid(), name: newName.trim(), hidden: false, createdAt: now, updatedAt: now });
    setNewName("");
  }

  return (
    <Card className="space-y-3">
      <SectionTitle>Categories</SectionTitle>
      <div className="flex gap-2">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New category name"
          onKeyDown={(e) => { if (e.key === "Enter") add(); }} className="text-sm" />
        <Button variant="secondary" onClick={add}><Plus size={14} /></Button>
      </div>
      <div className="space-y-1">
        {categories.map((cat) => (
          editId === cat.id ? (
            <div key={cat.id} className="flex gap-2">
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="text-sm flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") { updateInventoryCategory(cat.id, { name: editName, updatedAt: new Date().toISOString() }); setEditId(null); } }} />
              <Button variant="secondary" className="text-xs px-2 py-1.5" onClick={() => { updateInventoryCategory(cat.id, { name: editName, updatedAt: new Date().toISOString() }); setEditId(null); }}><Check size={12} /></Button>
              <Button variant="ghost" className="text-xs px-2 py-1.5" onClick={() => setEditId(null)}><X size={12} /></Button>
            </div>
          ) : (
            <div key={cat.id} className={cx("flex items-center gap-2 rounded-lg px-2 py-1.5", cat.hidden && "opacity-40")}>
              <span className="flex-1 text-sm text-ink">{cat.name}</span>
              <button onClick={() => { setEditId(cat.id); setEditName(cat.name); }} className="text-faint hover:text-ink p-1"><Pencil size={13} /></button>
              <button onClick={() => updateInventoryCategory(cat.id, { hidden: !cat.hidden, updatedAt: new Date().toISOString() })} className="text-faint hover:text-ink p-1 text-xs">{cat.hidden ? "Show" : "Hide"}</button>
              <button onClick={() => removeInventoryCategory(cat.id)} className="text-faint hover:text-clay p-1"><Trash2 size={13} /></button>
            </div>
          )
        ))}
      </div>
    </Card>
  );
}

// ---- MAIN PAGE ----
type TabId = "items" | "settings";
type SortKey = "expiration" | "purchaseDate" | "location" | "category" | "name";

export default function KitchenPage() {
  const { db, ready } = useDB();
  const [tab, setTab] = useState<TabId>("items");
  const [search, setSearch] = useState("");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("expiration");
  const [showAdd, setShowAdd] = useState(false);
  const [showUsedUp, setShowUsedUp] = useState(false);

  const items = db.inventoryItems ?? [];
  const rules = db.expirationRules ?? [];
  const locs = db.inventoryLocations ?? [];
  const cats = db.inventoryCategories ?? [];

  const activeLocations = locs.filter((l) => !l.hidden).map((l) => l.name);
  const activeCategories = cats.filter((c) => !c.hidden).map((c) => c.name);

  const allLocations = Array.from(new Set(items.map((i) => i.location)));
  const allCategories = Array.from(new Set(items.map((i) => i.category)));
  const formLocations = activeLocations.length > 0 ? activeLocations : allLocations;
  const formCategories = activeCategories.length > 0 ? activeCategories : allCategories;

  // Summary counts
  const useSoonCount = items.filter((i) => !i.usedUp && ["use-soon","expired","use-first"].includes(getStatus(i, rules))).length;
  const lowStockCount = items.filter((i) => !i.usedUp && i.lowStock).length;
  const expiredCount = items.filter((i) => !i.usedUp && getStatus(i, rules) === "expired").length;
  const activeItems = items.filter((i) => !i.usedUp);

  // Filter and sort
  const visible = items
    .filter((i) => {
      if (!showUsedUp && i.usedUp) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!i.name.toLowerCase().includes(q) && !i.location.toLowerCase().includes(q) && !i.category.toLowerCase().includes(q)) return false;
      }
      if (filterLocation !== "all" && i.location !== filterLocation) return false;
      if (filterCategory !== "all" && i.category !== filterCategory) return false;
      if (filterStatus !== "all" && getStatus(i, rules) !== filterStatus) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortKey === "expiration") {
        const da = estimateDaysUntilExpiry(a, rules) ?? 9999;
        const db2 = estimateDaysUntilExpiry(b, rules) ?? 9999;
        if (a.usedUp) return 1; if (b.usedUp) return -1;
        return da - db2;
      }
      if (sortKey === "purchaseDate") return (b.purchaseDate ?? "").localeCompare(a.purchaseDate ?? "");
      if (sortKey === "location") return a.location.localeCompare(b.location);
      if (sortKey === "category") return a.category.localeCompare(b.category);
      return a.name.localeCompare(b.name);
    });

  // Group by status for the items view
  const STATUS_ORDER: ItemStatus[] = ["use-first","use-soon","expired","low-stock","fresh","shelf-stable","used-up"];
  const grouped: Partial<Record<ItemStatus, InventoryItem[]>> = {};
  for (const item of visible) {
    const s = getStatus(item, rules);
    if (!grouped[s]) grouped[s] = [];
    grouped[s]!.push(item);
  }

  function exportText() {
    const lines = activeItems.map((i) => {
      const s = getStatus(i, rules);
      return `[${STATUS_LABELS[s]}] ${i.name} | ${i.location} | ${i.category}${i.quantity != null ? ` | Qty: ${i.quantity}${i.unit ? " " + i.unit : ""}` : ""}`;
    });
    navigator.clipboard.writeText(`Kitchen Inventory\n\n${lines.join("\n")}`).catch(() => {});
    alert("Inventory copied to clipboard.");
  }

  if (!ready) return <div className="page-container"><PageHeader title="Kitchen Inventory" /></div>;

  return (
    <div className="page-container">
      <PageHeader title="Kitchen Inventory" sub="Track what I have, what to use first, and what needs restocking." />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-surface p-3 text-center shadow-card">
          <p className="readout text-2xl font-bold text-ink">{activeItems.length}</p>
          <p className="label-tick mt-1">Total items</p>
        </div>
        <div className={cx("rounded-xl border p-3 text-center shadow-card", useSoonCount > 0 ? "border-amber/30 bg-amber-soft" : "border-line bg-surface")}>
          <p className={cx("readout text-2xl font-bold", useSoonCount > 0 ? "text-amber-dark" : "text-ink")}>{useSoonCount}</p>
          <p className="label-tick mt-1">Use soon</p>
        </div>
        <div className={cx("rounded-xl border p-3 text-center shadow-card", lowStockCount > 0 ? "border-amber/30 bg-amber-soft" : "border-line bg-surface")}>
          <p className={cx("readout text-2xl font-bold", lowStockCount > 0 ? "text-amber-dark" : "text-ink")}>{lowStockCount}</p>
          <p className="label-tick mt-1">Low stock</p>
        </div>
        <div className={cx("rounded-xl border p-3 text-center shadow-card", expiredCount > 0 ? "border-clay/30 bg-clay-soft" : "border-line bg-surface")}>
          <p className={cx("readout text-2xl font-bold", expiredCount > 0 ? "text-clay" : "text-ink")}>{expiredCount}</p>
          <p className="label-tick mt-1">Check today</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-mist/60 p-1 border border-line/50">
        {([["items","Items"],["settings","Locations & Categories"]] as [TabId, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={cx("flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
              tab === id ? "bg-surface text-pine-deep shadow-sm border border-line/50" : "text-muted hover:text-ink"
            )}>
            {label}
          </button>
        ))}
      </div>

      {/* ITEMS TAB */}
      {tab === "items" && (
        <>
          {showAdd ? (
            <ItemFormPanel
              initial={emptyItemForm(formLocations, formCategories)}
              locations={formLocations}
              categories={formCategories}
              onSave={(f) => { addInventoryItem(formToItem(f)); setShowAdd(false); }}
              onCancel={() => setShowAdd(false)}
            />
          ) : (
            <Button variant="secondary" className="w-full" onClick={() => setShowAdd(true)}>
              <Plus size={15} /> Add item
            </Button>
          )}

          {/* Filters */}
          <div className="space-y-2">
            <Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}>
                <option value="all">All locations</option>
                {allLocations.map((l) => <option key={l} value={l}>{l}</option>)}
              </Select>
              <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="all">All categories</option>
                {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
              <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">All statuses</option>
                {STATUS_ORDER.slice(0, -1).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </Select>
              <Select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
                <option value="expiration">Sort: Expiry</option>
                <option value="purchaseDate">Sort: Purchase date</option>
                <option value="location">Sort: Location</option>
                <option value="category">Sort: Category</option>
                <option value="name">Sort: Name</option>
              </Select>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted cursor-pointer">
                <input type="checkbox" checked={showUsedUp} onChange={(e) => setShowUsedUp(e.target.checked)} />
                Show used up
              </label>
              <button onClick={exportText} className="text-xs text-faint hover:text-ink underline">Export</button>
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState title="No items" body="Add items manually or move bought groceries from your Grocery List." />
          ) : (
            <div className="space-y-5">
              {STATUS_ORDER.map((status) => {
                const group = grouped[status];
                if (!group?.length) return null;
                if (status === "used-up" && !showUsedUp) return null;
                return (
                  <section key={status}>
                    <SectionTitle>
                      {STATUS_LABELS[status]}
                      <span className="ml-1 text-xs font-normal text-faint">({group.length})</span>
                    </SectionTitle>
                    <div className="space-y-2">
                      {group.map((item) => (
                        <InventoryItemCard
                          key={item.id} item={item} rules={rules}
                          locations={formLocations} categories={formCategories}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          <p className="text-xs text-faint text-center pt-2">
            Expiry estimates are for general guidance only. Use your judgment. When in doubt, throw it out.
          </p>
        </>
      )}

      {/* SETTINGS TAB */}
      {tab === "settings" && (
        <div className="space-y-4">
          <LocationManager locations={locs} />
          <CategoryManager categories={cats} />
        </div>
      )}

      {/* Coming Next */}
      <section className="space-y-2 pt-2">
        <SectionTitle>Coming next</SectionTitle>
        {[
          { label: "Barcode scan",               desc: "Scan product barcodes to add items instantly." },
          { label: "Receipt scan",               desc: "Scan a grocery receipt and auto-populate your inventory." },
          { label: "Fridge photo scan",          desc: "Take a photo of your fridge to detect what you have." },
          { label: "Pantry photo scan",          desc: "Scan your pantry shelves and identify items automatically." },
          { label: "AI inventory cleanup",       desc: "Detect duplicates, guess expiration dates, and suggest what to use first." },
          { label: "Use inventory first meal planning", desc: "Auto-suggest meals that use items about to expire." },
          { label: "Consumption tracking",       desc: "Track how quickly you use items and predict restocking needs." }
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
