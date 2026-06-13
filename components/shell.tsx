"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, Camera, FlaskConical, Gauge, Home, Leaf, ListChecks,
  Menu, ScanLine, Settings, Sparkles, Target, User, Utensils, Weight
} from "lucide-react";
import { cx } from "./ui";
import type { ReactNode } from "react";

const NAV = [
  { href: "/",            label: "Dashboard",      icon: Home },
  { href: "/profile",     label: "My Profile",     icon: User },
  { href: "/food",        label: "Food Photo Log", icon: Camera },
  { href: "/meals",       label: "Meal Analysis",  icon: Utensils },
  { href: "/weight",      label: "Weight Log",     icon: Weight },
  { href: "/blood-pressure", label: "Blood Pressure", icon: Gauge },
  { href: "/hume",        label: "Hume Scans",     icon: ScanLine },
  { href: "/labs",        label: "Lab Reports",    icon: FlaskConical },
  { href: "/insights",    label: "Saved Insights", icon: Sparkles },
  { href: "/goals",       label: "Goals",          icon: Target },
  { href: "/diet-styles", label: "Diet Styles",    icon: Leaf },
  { href: "/settings",    label: "Settings",       icon: Settings }
];

const MOBILE_NAV = [
  { href: "/",        label: "Home",     icon: Home },
  { href: "/food",    label: "Food",     icon: Camera },
  { href: "/track",   label: "Track",    icon: Activity },
  { href: "/insights", label: "Insights", icon: Sparkles },
  { href: "/more",    label: "More",     icon: Menu }
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl">

      {/* Desktop sidebar - dark premium */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-pine-deep px-4 py-6 md:flex">
        <Link href="/" className="mb-7 block px-2">
          <span className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-white">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/15 text-white border border-white/20">
              <ListChecks size={16} />
            </span>
            HealthEstimator
          </span>
          <span className="mt-1 block px-10 text-[11px] font-medium text-white/40">
            My health data, explained.
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cx(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "bg-white/15 text-white shadow-sm border border-white/10"
                    : "text-white/55 hover:bg-white/8 hover:text-white/80"
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        <p className="px-3 text-[11px] text-white/30">
          Private. Data stays on this device.
        </p>
      </aside>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-line bg-surface/90 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/" className="flex items-center gap-2 text-base font-extrabold tracking-tight text-pine-deep">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-pine-deep text-white">
              <ListChecks size={14} />
            </span>
            HealthEstimator
          </Link>
          <span className="text-[11px] font-medium text-faint">Private</span>
        </header>

        <main className="px-4 pb-28 pt-5 md:px-8 md:pb-12 md:pt-8">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "var(--safe-bottom)" }}
      >
        <div className="mx-auto flex max-w-md items-stretch justify-between px-2">
          {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cx(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-bold transition-colors",
                  active ? "text-pine-deep" : "text-faint"
                )}
              >
                <span className={cx(
                  "grid h-7 w-12 place-items-center rounded-full transition-colors",
                  active && "bg-pine-soft"
                )}>
                  <Icon size={18} />
                </span>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
