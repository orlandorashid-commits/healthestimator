"use client";

import { useState } from "react";
import { Archive, Check, Pencil, ShoppingCart, Trash2, X } from "lucide-react";
import {
  Badge, Button, Card, cx, EmptyState, Field, Input,
  PageHeader, SectionTitle, Select
} from "@/components/ui";
import {
  addGroceryItem, addInventoryItem, clearBoughtGroceryItems, removeGroceryItem,
  uid, updateGroceryItem, useDB
} from "@/lib/store";
import type { FoodCategory, GroceryItem, InventoryItem } from "@/lib/types";

const FOOD_CATS: FoodCategory[] = [
  "Produce","Protein","Dairy","Frozen","Pantry","Grains",
  "Spices","Condiments","Drinks","Supplements","Other"
];
const STORES = ["HEB","Trader Joe's","Grocery Market","Riverside Produce","Walmart","Other"];
const ALL_CATS: FoodCategory[] = FOOD_CATS;

// ---- Move to Kitchen form (inline, shown on bought items) ----
function MoveToKitchenForm({
  item,
  locations,
  onSave,
  onCancel
}: {
  item: GroceryItem;
  locations: string[];
  onSave: (inv: InventoryItem) => void;
  onCancel: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState(item.name);
  const [location, setLocation] = useState(locations[0] ?? "Pantry");
  const [category, setCategory] = useState(item.category as string);
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState(item.unit ?? "");
  const [purchaseDate, setPurchaseDate] = useState(today);
  const [opened, setOpened] = useState(false);
  const [notes, setNotes] = useState(item.notes ?? "");

  function save() {
    const now = new Date().toISOString();
    onSave({
      id: uid(), name, category, location,
      quantity: quantity ? +quantity : undefined, unit: unit || undefined,
      purchaseDate, expirationDate: undefined, expirationOverride: false,
      opened, lowStock: false, useSoon: false, useFirst: false, usedUp: false,
      sourceGroceryItemId: item.id,
      preferredStore: item.preferredStore,
      notes: notes || undefined,
      createdAt: now, updatedAt: now
    });
  }

  return (
    <div className="mt-2 rounded-xl border border-pine/30 bg-pine-soft/20 p-3 space-y-2">
      <p className="text-xs font-bold text-pine-deep">Move to Kitchen</p>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} className="text-xs" />
        </Field>
        <Field label="Location">
          <Select value={location} onChange={(e) => setLocation(e.target.value)} className="text-xs">
            {locations.map((l) => <option key={l} value={l}>{l}</option>)}
            <option value="Other">Other</option>
          </Select>
        </Field>
        <Field label="Category">
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="text-xs">
            {ALL_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Purchase date">
          <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="text-xs" />
        </Field>
        <Field label="Quantity">
          <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="1" className="text-xs" />
        </Field>
        <Field label="Unit">
          <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="lb, bag, count..." className="text-xs" />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
        <input type="checkbox" checked={opened} onChange={(e) => setOpened(e.target.checked)} />
        Opened
      </label>
      <Field label="Notes">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes..." className="text-xs" />
      </Field>
      <div className="flex gap-2">
        <Button className="text-xs px-3 py-1.5" onClick={save}>
          <Archive size={12} /> Add to Kitchen
        </Button>
        <Button variant="ghost" className="text-xs px-3 py-1.5" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// ---- GroceryRow ----
function GroceryRow({ item, recipes, smoothies, kitchenLocations }: {
  item: GroceryItem;
  recipes: { id: string; name: string }[];
  smoothies: { id: string; name: string }[];
  kitchenLocations: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [movingToKitchen, setMovingToKitchen] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editStore, setEditStore] = useState(item.preferredStore ?? "");
  const [editCat, setEditCat] = useState(item.category);
  const [editNotes, setEditNotes] = useState(item.notes ?? "");

  const sourceNames = [
    ...item.sourceRecipeIds.map((id) => recipes.find((r) => r.id === id)?.name).filter(Boolean),
    ...item.sourceSmoothieIds.map((id) => smoothies.find((s) => s.id === id)?.name).filter(Boolean)
  ] as string[];

  function saveEdit() {
    updateGroceryItem(item.id, {
      name: editName, preferredStore: editStore || undefined,
      category: editCat, notes: editNotes || undefined,
      updatedAt: new Date().toISOString()
    });
    setEditing(false);
  }

  function handleMoveToKitchen(inv: InventoryItem) {
    addInventoryItem(inv);
    updateGroceryItem(item.id, { notes: `Moved to Kitchen on ${new Date().toLocaleDateString()}`, updatedAt: new Date().toISOString() });
    setMovingToKitchen(false);
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-pine/30 bg-surface p-3 space-y-2">
        <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <Select value={editCat} onChange={(e) => setEditCat(e.target.value as FoodCategory)}>
            {ALL_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select value={editStore} onChange={(e) => setEditStore(e.target.value)}>
            <option value="">No store</option>
            {STORES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Notes..." className="text-xs" />
        <div className="flex gap-2">
          <Button className="text-xs px-3 py-1.5" onClick={saveEdit}><Check size={12} /> Save</Button>
          <Button variant="ghost" className="text-xs px-3 py-1.5" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cx("rounded-xl border bg-surface px-3 py-2.5 transition-opacity", item.bought && "opacity-60")}>
      <div className="flex items-start gap-3">
        {/* Bought checkbox */}
        <button
          onClick={() => updateGroceryItem(item.id, { bought: !item.bought, updatedAt: new Date().toISOString() })}
          className={cx(
            "flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
            item.bought ? "bg-pine border-pine" : "border-line"
          )}
        >
          {item.bought && <Check size={11} className="text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          <p className={cx("text-sm font-semibold", item.bought ? "line-through text-faint" : "text-ink")}>
            {item.name}
          </p>
          {item.notes && <p className="text-xs text-faint mt-0.5">{item.notes}</p>}
          {sourceNames.length > 0 && (
            <p className="text-[11px] text-faint mt-0.5">For: {sourceNames.join(", ")}</p>
          )}
          {item.preferredStore && (
            <p className="text-[11px] text-faint">{item.preferredStore}</p>
          )}
          {item.pushToNextTrip && <Badge tone="amber">Next trip</Badge>}
        </div>

        <div className="flex gap-1 flex-shrink-0">
          {!item.bought && (
            <button
              onClick={() => updateGroceryItem(item.id, { alreadyHave: !item.alreadyHave, updatedAt: new Date().toISOString() })}
              className={cx(
                "text-[10px] font-bold rounded-full px-2 py-1 border transition-all",
                item.alreadyHave
                  ? "bg-pine-soft text-pine-deep border-pine/20"
                  : "text-faint border-line hover:text-ink"
              )}
            >
              {item.alreadyHave ? "Have it" : "Have?"}
            </button>
          )}
          {item.bought && (
            <button
              onClick={() => setMovingToKitchen(!movingToKitchen)}
              className={cx(
                "text-[10px] font-bold rounded-full px-2 py-1 border transition-all",
                movingToKitchen
                  ? "bg-pine-soft text-pine-deep border-pine/20"
                  : "text-faint border-line hover:text-pine"
              )}
              title="Move to Kitchen Inventory"
            >
              <Archive size={12} />
            </button>
          )}
          <button
            onClick={() => updateGroceryItem(item.id, { pushToNextTrip: !item.pushToNextTrip, updatedAt: new Date().toISOString() })}
            className="text-faint hover:text-amber p-1"
            title="Push to next trip"
          >
            <ShoppingCart size={13} />
          </button>
          <button onClick={() => setEditing(true)} className="text-faint hover:text-ink p-1"><Pencil size={13} /></button>
          <button onClick={() => removeGroceryItem(item.id)} className="text-faint hover:text-clay p-1"><Trash2 size={13} /></button>
        </div>
      </div>

      {movingToKitchen && (
        <MoveToKitchenForm
          item={item}
          locations={kitchenLocations}
          onSave={handleMoveToKitchen}
          onCancel={() => setMovingToKitchen(false)}
        />
      )}
    </div>
  );
}

export default function GroceryListPage() {
  const { db, ready } = useDB();
  const [view, setView] = useState<"category" | "store">("category");
  const [filterBought, setFilterBought] = useState<"all" | "not-bought" | "bought">("not-bought");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState<FoodCategory>("Produce");
  const [newStore, setNewStore] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newUnit, setNewUnit] = useState("");

  const items = db.groceryItems ?? [];
  const recipes = db.recipes ?? [];
  const smoothies = db.smoothies ?? [];
  const kitchenLocations = (db.inventoryLocations ?? [])
    .filter((l) => !l.hidden)
    .map((l) => l.name);
  const locationsForForm = kitchenLocations.length > 0
    ? kitchenLocations
    : ["Refrigerator","Freezer 1","Pantry","Other"];

  const visible = items.filter((i) => {
    if (filterBought === "bought") return i.bought;
    if (filterBought === "not-bought") return !i.bought;
    return true;
  });

  function addItem() {
    if (!newName.trim()) return;
    const now = new Date().toISOString();
    addGroceryItem({
      id: uid(), name: `${newQty} ${newUnit} ${newName}`.replace(/^\s+/, "").trim(),
      category: newCat, preferredStore: newStore || undefined,
      sourceRecipeIds: [], sourceSmoothieIds: [],
      alreadyHave: false, bought: false, pushToNextTrip: false,
      createdAt: now, updatedAt: now
    });
    setNewName(""); setNewQty(""); setNewUnit("");
    setShowAdd(false);
  }

  function exportText() {
    const notBought = items.filter((i) => !i.bought && !i.alreadyHave);
    const byCategory: Record<string, GroceryItem[]> = {};
    for (const item of notBought) {
      if (!byCategory[item.category]) byCategory[item.category] = [];
      byCategory[item.category].push(item);
    }
    const lines = Object.entries(byCategory).map(([cat, catItems]) => {
      return `${cat}\n${catItems.map((i) => `  - ${i.name}`).join("\n")}`;
    });
    const text = `Grocery List\n\n${lines.join("\n\n")}`;
    navigator.clipboard.writeText(text).catch(() => {});
    alert("Grocery list copied to clipboard.");
  }

  function groupBy(key: "category" | "store") {
    const grouped: Record<string, GroceryItem[]> = {};
    for (const item of visible) {
      const k = key === "category" ? item.category : (item.preferredStore ?? "No store assigned");
      if (!grouped[k]) grouped[k] = [];
      grouped[k].push(item);
    }
    return grouped;
  }

  const boughtCount = items.filter((i) => i.bought).length;
  const totalCount = items.filter((i) => !i.alreadyHave).length;

  if (!ready) return <div className="page-container"><PageHeader title="Grocery List" /></div>;

  const grouped = groupBy(view === "category" ? "category" : "store");

  return (
    <div className="page-container">
      <PageHeader
        title="Grocery List"
        sub={`${totalCount - boughtCount} items left to buy.`}
      />

      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex rounded-xl border border-line overflow-hidden flex-shrink-0">
          <button
            onClick={() => setView("category")}
            className={cx("px-3 py-1.5 text-xs font-bold", view === "category" ? "bg-pine-soft text-pine-deep" : "text-faint")}
          >
            By category
          </button>
          <button
            onClick={() => setView("store")}
            className={cx("px-3 py-1.5 text-xs font-bold", view === "store" ? "bg-pine-soft text-pine-deep" : "text-faint")}
          >
            By store
          </button>
        </div>
        <Select
          value={filterBought}
          onChange={(e) => setFilterBought(e.target.value as typeof filterBought)}
          className="text-xs"
        >
          <option value="not-bought">Not bought</option>
          <option value="bought">Bought</option>
          <option value="all">Show all</option>
        </Select>
      </div>

      {/* Add item */}
      {showAdd ? (
        <Card className="space-y-3 border-pine/30">
          <p className="font-bold text-pine-deep text-sm">Add item</p>
          <div className="flex gap-2">
            <Input value={newQty} onChange={(e) => setNewQty(e.target.value)} placeholder="Qty" className="w-16 text-xs" />
            <Input value={newUnit} onChange={(e) => setNewUnit(e.target.value)} placeholder="Unit" className="w-20 text-xs" />
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Item name" className="flex-1 text-sm"
              onKeyDown={(e) => { if (e.key === "Enter") addItem(); }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={newCat} onChange={(e) => setNewCat(e.target.value as FoodCategory)}>
              {ALL_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select value={newStore} onChange={(e) => setNewStore(e.target.value)}>
              <option value="">No store</option>
              {STORES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1 text-sm" onClick={addItem}><Check size={14} /> Add</Button>
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </Card>
      ) : (
        <Button variant="secondary" className="w-full" onClick={() => setShowAdd(true)}>+ Add item manually</Button>
      )}

      {/* Tip for Move to Kitchen */}
      {boughtCount > 0 && (
        <p className="text-xs text-faint flex items-center gap-1.5">
          <Archive size={12} /> Tap the shelf icon on bought items to move them to Kitchen Inventory.
        </p>
      )}

      {/* Grouped list */}
      {Object.keys(grouped).length === 0 ? (
        <EmptyState
          title="Nothing here"
          body="Add items manually or generate a list from your Weekly Plan."
        />
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped)
            .sort(([a], [b]) => {
              if (view === "category") {
                const order = FOOD_CATS as string[];
                return (order.indexOf(a) ?? 99) - (order.indexOf(b) ?? 99);
              }
              return a.localeCompare(b);
            })
            .map(([group, groupItems]) => (
              <section key={group}>
                <SectionTitle>
                  {group}
                  <span className="ml-1 text-xs font-normal text-faint">({groupItems.length})</span>
                </SectionTitle>
                <div className="space-y-2">
                  {groupItems.map((item) => (
                    <GroceryRow
                      key={item.id} item={item} recipes={recipes} smoothies={smoothies}
                      kitchenLocations={locationsForForm}
                    />
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}

      {/* Footer actions */}
      {(boughtCount > 0 || items.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {boughtCount > 0 && (
            <Button variant="ghost" onClick={clearBoughtGroceryItems} className="text-sm">
              <Trash2 size={14} /> Clear {boughtCount} bought item{boughtCount !== 1 ? "s" : ""}
            </Button>
          )}
          <Button variant="ghost" onClick={exportText} className="text-sm">
            Export list
          </Button>
        </div>
      )}

      {/* Coming next placeholder */}
      <section className="space-y-2 pt-2">
        <p className="label-tick">Coming next</p>
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-line/60 bg-surface/60 px-4 py-3 opacity-70">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-muted">Remove items I already have from inventory</p>
              <span className="text-[10px] font-bold uppercase text-faint bg-line/60 rounded-full px-2 py-0.5">Soon</span>
            </div>
            <p className="text-xs text-faint mt-0.5">Auto-skip grocery items you already have in your Kitchen Inventory.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
