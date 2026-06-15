"use client";

import Link from "next/link";
import {
  Archive, BookOpen, CalendarDays, CalendarDays as CalPlan, ChefHat,
  ClipboardList, FileInput, GlassWater, Leaf, Package, Settings,
  ShoppingCart, Sparkles, Target, Utensils, User
} from "lucide-react";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { useDB } from "@/lib/store";

const HEALTH_SECTIONS = [
  { href: "/profile",     icon: User,          label: "My Profile",      desc: "Age, height, weight goal, dietary style, and health conditions." },
  { href: "/meals",       icon: Utensils,      label: "Meal Analysis",   desc: "Review past meal breakdowns and nutrition estimates." },
  { href: "/goals",       icon: Target,        label: "Goals",           desc: "Targets and active lifestyle experiments." },
  { href: "/diet-styles", icon: Leaf,          label: "Diet Styles",     desc: "15 eating approaches explained. Set one as your active experiment." },
  { href: "/insights",    icon: Sparkles,      label: "Saved Insights",  desc: "AI observations saved from meals, labs, and check-ins." },
  { href: "/settings",    icon: Settings,      label: "Settings",        desc: "API key status, model selection, data export, and storage." }
];

const FOOD_SECTIONS = [
  { href: "/smoothies",     icon: GlassWater,   label: "Smoothies",      desc: "Morning smoothie recipes, taste profile, history, and grocery list." },
  { href: "/recipes",       icon: BookOpen,     label: "Recipe Library",  desc: "Browse, add, and manage your full recipe collection." },
  { href: "/recipe-importer", icon: FileInput,    label: "Recipe Importer", desc: "Paste recipe text and turn it into structured recipe cards." },
  { href: "/weekly-plan",   icon: CalendarDays, label: "Weekly Plan",    desc: "Plan meals for the week and generate a grocery list." },
  { href: "/grocery-list",  icon: ShoppingCart, label: "Grocery List",   desc: "Your active grocery list, organized by category or store." },
  { href: "/prep-schedule", icon: ClipboardList,label: "Prep Schedule",  desc: "Weekly prep checklist: chopping, cooking, portioning, and smoothie bags." },
  { href: "/kitchen",       icon: Archive,      label: "Kitchen",        desc: "Track what you have, where it is, and what to use first." }
];

const COMING_NEXT = [
  { icon: Package,   label: "Kitchen Inventory", desc: "Track what you have on hand. Get recipes based on your actual fridge and pantry." },
  { icon: ChefHat,   label: "PDF Recipe Importer", desc: "Upload a PDF and extract recipes automatically." },
  { icon: CalPlan,   label: "ICS Calendar Export", desc: "Export your weekly meal plan to your calendar app." },
  { icon: ShoppingCart, label: "Receipt Scan",  desc: "Scan a grocery receipt to auto-update what you have." }
];

export default function MorePage() {
  const { db, ready } = useDB();
  const mealCount = db.meals.length;
  const insightCount = db.insights.length;
  const recipeCount = db.recipes?.length ?? 0;
  const smoothieCount = db.smoothies?.length ?? 0;

  const badgeFor: Record<string, string | undefined> = {
    "/meals": ready && mealCount > 0 ? `${mealCount} meal${mealCount !== 1 ? "s" : ""}` : undefined,
    "/insights": ready && insightCount > 0 ? `${insightCount} saved` : undefined,
    "/recipes": ready && recipeCount > 0 ? `${recipeCount} recipes` : undefined,
    "/smoothies": ready && smoothieCount > 0 ? `${smoothieCount} recipes` : undefined
  };

  function SectionList({ sections }: { sections: typeof HEALTH_SECTIONS }) {
    return (
      <div className="space-y-3">
        {sections.map(({ href, icon: Icon, label, desc }) => (
          <Link key={href} href={href}>
            <Card className="flex items-start gap-4 hover:shadow-lift transition-shadow cursor-pointer">
              <div className="mt-0.5 flex-shrink-0 w-10 h-10 rounded-lg bg-pine-soft flex items-center justify-center border border-pine/15">
                <Icon className="w-5 h-5 text-pine" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-ink text-sm">{label}</p>
                  {badgeFor[href] && (
                    <span className="text-xs text-faint bg-line/80 rounded-full px-2 py-0.5">{badgeFor[href]}</span>
                  )}
                </div>
                <p className="text-muted text-sm mt-0.5">{desc}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader title="More" sub="Profile, goals, food planning, and settings" />

      <section className="space-y-3">
        <SectionTitle>Health</SectionTitle>
        <SectionList sections={HEALTH_SECTIONS} />
      </section>

      <section className="space-y-3">
        <SectionTitle>Food Planning</SectionTitle>
        <SectionList sections={FOOD_SECTIONS} />
      </section>

      <section className="space-y-3">
        <SectionTitle>Coming next</SectionTitle>
        {COMING_NEXT.map(({ icon: Icon, label, desc }) => (
          <Card key={label} className="flex items-start gap-4 opacity-70 border-dashed">
            <div className="mt-0.5 flex-shrink-0 w-10 h-10 rounded-lg bg-line/40 flex items-center justify-center">
              <Icon className="w-5 h-5 text-faint" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-muted text-sm">{label}</p>
                <span className="text-[10px] font-bold uppercase tracking-wide text-faint bg-line/60 rounded-full px-2 py-0.5">Soon</span>
              </div>
              <p className="text-faint text-sm mt-0.5">{desc}</p>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
