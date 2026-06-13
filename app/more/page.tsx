"use client";

import Link from "next/link";
import { CalendarDays, ChefHat, Leaf, Package, Settings, ShoppingCart, Sparkles, Target, Utensils, User } from "lucide-react";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { useDB } from "@/lib/store";

const SECTIONS = [
  {
    href: "/profile",
    icon: User,
    label: "My Profile",
    desc: "Age, height, weight goal, dietary style, and health conditions."
  },
  {
    href: "/meals",
    icon: Utensils,
    label: "Meal Analysis",
    desc: "Review past meal breakdowns and nutrition estimates."
  },
  {
    href: "/goals",
    icon: Target,
    label: "Goals",
    desc: "Targets and active lifestyle experiments."
  },
  {
    href: "/diet-styles",
    icon: Leaf,
    label: "Diet Styles",
    desc: "15 eating approaches explained. Set one as your active experiment."
  },
  {
    href: "/insights",
    icon: Sparkles,
    label: "Saved Insights",
    desc: "AI observations saved from meals, labs, and check-ins."
  },
  {
    href: "/settings",
    icon: Settings,
    label: "Settings",
    desc: "API key status, model selection, data export, and storage."
  }
];

const COMING_NEXT = [
  {
    icon: Package,
    label: "Kitchen Inventory",
    desc: "Track what you have on hand. Let the AI suggest meals from your actual fridge and pantry."
  },
  {
    icon: ShoppingCart,
    label: "Shopping List",
    desc: "Auto-generate a grocery list from your goals, experiments, and low-stock inventory."
  },
  {
    icon: ChefHat,
    label: "Recipe Library",
    desc: "Save and rate recipes. Filter by diet style, protein target, or ingredients you already have."
  },
  {
    icon: CalendarDays,
    label: "Calendar Planning",
    desc: "Plan meals for the week. See your nutrition targets mapped across each day."
  }
];

export default function MorePage() {
  const { db, ready } = useDB();

  const mealCount = db.meals.length;
  const insightCount = db.insights.length;

  const badgeFor: Record<string, string | undefined> = {
    "/meals": ready && mealCount > 0 ? `${mealCount} meal${mealCount !== 1 ? "s" : ""}` : undefined,
    "/insights": ready && insightCount > 0 ? `${insightCount} saved` : undefined
  };

  return (
    <div className="page-container">
      <PageHeader title="More" sub="Profile, goals, diet styles, and settings" />

      <div className="space-y-3">
        {SECTIONS.map(({ href, icon: Icon, label, desc }) => (
          <Link key={href} href={href}>
            <Card className="flex items-start gap-4 hover:shadow-lift transition-shadow cursor-pointer">
              <div className="mt-0.5 flex-shrink-0 w-10 h-10 rounded-lg bg-pine-soft flex items-center justify-center border border-pine/15">
                <Icon className="w-5 h-5 text-pine" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-ink text-sm">{label}</p>
                  {badgeFor[href] && (
                    <span className="text-xs text-faint bg-line/80 rounded-full px-2 py-0.5">
                      {badgeFor[href]}
                    </span>
                  )}
                </div>
                <p className="text-muted text-sm mt-0.5">{desc}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <section className="space-y-3">
        <SectionTitle>Coming next</SectionTitle>
        <p className="text-sm text-muted -mt-1">These features are planned for future releases.</p>
        {COMING_NEXT.map(({ icon: Icon, label, desc }) => (
          <Card key={label} className="flex items-start gap-4 opacity-70 border-dashed">
            <div className="mt-0.5 flex-shrink-0 w-10 h-10 rounded-lg bg-line/40 flex items-center justify-center">
              <Icon className="w-5 h-5 text-faint" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-muted text-sm">{label}</p>
                <span className="text-[10px] font-bold uppercase tracking-wide text-faint bg-line/60 rounded-full px-2 py-0.5">
                  Soon
                </span>
              </div>
              <p className="text-faint text-sm mt-0.5">{desc}</p>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
