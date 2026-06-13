"use client";

import { useEffect, useState } from "react";
import { Button, Card, Chip, Field, Input, PageHeader, SectionTitle, Textarea } from "@/components/ui";
import { setProfile, useDB } from "@/lib/store";
import type { Profile } from "@/lib/types";

const GOAL_CHIPS = [
  "Lose weight",
  "Reach 190 pounds",
  "Improve blood pressure",
  "Improve cholesterol",
  "Build muscle",
  "Improve energy",
  "Improve sleep",
  "Reduce late heavy meals",
  "Learn my patterns"
];

export default function ProfilePage() {
  const { db, ready } = useDB();
  const [form, setForm] = useState<Profile>({ mainGoals: [] });
  const [heightFeet, setHeightFeet] = useState<number | "">("");
  const [heightIn, setHeightIn] = useState<number | "">("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (ready) {
      setForm(db.profile);
      if (db.profile.heightInches != null) {
        setHeightFeet(Math.floor(db.profile.heightInches / 12));
        setHeightIn(db.profile.heightInches % 12);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!ready) return <PageHeader title="My Profile" />;

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function num(value: string): number | undefined {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : undefined;
  }

  function toggleGoal(goal: string) {
    setForm((f) => ({
      ...f,
      mainGoals: f.mainGoals.includes(goal)
        ? f.mainGoals.filter((g) => g !== goal)
        : [...f.mainGoals, goal]
    }));
    setSaved(false);
  }

  function save() {
    const feetVal = typeof heightFeet === "number" ? heightFeet : 0;
    const inVal = typeof heightIn === "number" ? heightIn : 0;
    const totalInches =
      heightFeet !== "" || heightIn !== ""
        ? feetVal * 12 + inVal
        : undefined;
    setProfile({ ...form, heightInches: totalInches });
    setSaved(true);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="My Profile"
        sub="The AI reads this context before every analysis. The more honest it is, the more useful the answers get."
      />

      <Card className="space-y-4">
        <SectionTitle>Basics</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age">
            <Input
              type="number"
              inputMode="numeric"
              value={form.age ?? ""}
              onChange={(e) => set("age", num(e.target.value))}
            />
          </Field>
          <Field label="Sex">
            <Input
              value={form.sex ?? ""}
              onChange={(e) => set("sex", e.target.value)}
              placeholder="Male"
            />
          </Field>

          {/* Height split into feet and inches */}
          <Field label="Height (ft)" hint="Feet only">
            <Input
              type="number"
              inputMode="numeric"
              min="3"
              max="8"
              placeholder="6"
              value={heightFeet}
              onChange={(e) => {
                setHeightFeet(e.target.value === "" ? "" : parseInt(e.target.value, 10));
                setSaved(false);
              }}
            />
          </Field>
          <Field label="Height (in)" hint="Remaining inches (0-11)">
            <Input
              type="number"
              inputMode="numeric"
              min="0"
              max="11"
              placeholder="1"
              value={heightIn}
              onChange={(e) => {
                setHeightIn(e.target.value === "" ? "" : parseInt(e.target.value, 10));
                setSaved(false);
              }}
            />
          </Field>

          <Field label="Current weight (lb)">
            <Input
              type="number"
              inputMode="decimal"
              value={form.currentWeight ?? ""}
              onChange={(e) => set("currentWeight", num(e.target.value))}
            />
          </Field>
          <Field label="Goal weight (lb)">
            <Input
              type="number"
              inputMode="decimal"
              value={form.goalWeight ?? ""}
              onChange={(e) => set("goalWeight", num(e.target.value))}
            />
          </Field>
        </div>
      </Card>

      <Card className="space-y-4">
        <SectionTitle>Health context</SectionTitle>
        <Field label="Known conditions">
          <Textarea
            value={form.conditions ?? ""}
            onChange={(e) => set("conditions", e.target.value)}
            placeholder="Borderline high blood pressure"
          />
        </Field>
        <Field label="Medications">
          <Textarea
            value={form.medications ?? ""}
            onChange={(e) => set("medications", e.target.value)}
            placeholder="None"
          />
        </Field>
        <Field label="Supplements">
          <Textarea
            value={form.supplements ?? ""}
            onChange={(e) => set("supplements", e.target.value)}
            placeholder="Vitamin D, fish oil"
          />
        </Field>
      </Card>

      <Card className="space-y-4">
        <SectionTitle>Eating rhythm</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Meals per day">
            <Input
              type="number"
              inputMode="numeric"
              value={form.mealsPerDay ?? ""}
              onChange={(e) => set("mealsPerDay", num(e.target.value))}
            />
          </Field>
          <Field label="First meal">
            <Input
              type="time"
              value={form.firstMealTime ?? ""}
              onChange={(e) => set("firstMealTime", e.target.value)}
            />
          </Field>
          <Field label="Last meal">
            <Input
              type="time"
              value={form.lastMealTime ?? ""}
              onChange={(e) => set("lastMealTime", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Diet preferences">
          <Textarea
            value={form.dietPreferences ?? ""}
            onChange={(e) => set("dietPreferences", e.target.value)}
            placeholder="Mostly whole foods, likes Mediterranean flavors"
          />
        </Field>
        <Field label="Foods to avoid">
          <Textarea
            value={form.foodsToAvoid ?? ""}
            onChange={(e) => set("foodsToAvoid", e.target.value)}
            placeholder="Deep fried food on weekdays"
          />
        </Field>
      </Card>

      <Card className="space-y-4">
        <SectionTitle>Lifestyle</SectionTitle>
        <Field label="Exercise routine">
          <Textarea
            value={form.exerciseRoutine ?? ""}
            onChange={(e) => set("exerciseRoutine", e.target.value)}
            placeholder="Walks 4x per week, light weights 2x"
          />
        </Field>
        <Field label="Sleep notes">
          <Textarea
            value={form.sleepNotes ?? ""}
            onChange={(e) => set("sleepNotes", e.target.value)}
            placeholder="Usually 6.5 hours, wants 7+"
          />
        </Field>
      </Card>

      <Card className="space-y-3">
        <SectionTitle>Main goals</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {GOAL_CHIPS.map((g) => (
            <Chip key={g} active={form.mainGoals.includes(g)} onClick={() => toggleGoal(g)}>
              {g}
            </Chip>
          ))}
        </div>
      </Card>

      <div className="sticky bottom-24 md:bottom-4">
        <Button className="w-full shadow-lift" onClick={save}>
          {saved ? "Profile saved" : "Save profile"}
        </Button>
      </div>
    </div>
  );
}
