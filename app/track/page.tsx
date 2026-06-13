"use client";

import Link from "next/link";
import { Activity, FlaskConical, Gauge, ScanLine, Scale } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { useDB } from "@/lib/store";
import { fmtDate } from "@/lib/utils";

const SECTIONS = [
  {
    href: "/weight",
    icon: Scale,
    label: "Weight Log",
    desc: "Track your weight trend over time.",
  },
  {
    href: "/blood-pressure",
    icon: Gauge,
    label: "Blood Pressure",
    desc: "Log readings with context like timing and stress.",
  },
  {
    href: "/hume",
    icon: ScanLine,
    label: "Hume Scans",
    desc: "Upload screenshots from your Hume device.",
  },
  {
    href: "/labs",
    icon: FlaskConical,
    label: "Lab Reports",
    desc: "Upload and decode bloodwork and lab panels.",
  },
];

export default function TrackPage() {
  const { db, ready } = useDB();

  const latestWeight = db.weights[0];
  const latestBP = db.bps[0];
  const latestHume = db.hume[0];
  const latestLab = db.labs[0];

  const latestFor: Record<string, string | undefined> = {
    "/weight": ready && latestWeight ? `${latestWeight.weight} lb on ${fmtDate(latestWeight.date)}` : undefined,
    "/blood-pressure": ready && latestBP ? `${latestBP.systolic}/${latestBP.diastolic} on ${fmtDate(latestBP.date)}` : undefined,
    "/hume": ready && latestHume ? `Scan on ${fmtDate(latestHume.date)}` : undefined,
    "/labs": ready && latestLab ? `Report on ${fmtDate(latestLab.date)}` : undefined,
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Track"
        sub="Log and review your health measurements"
      />

      <div className="space-y-3">
        {SECTIONS.map(({ href, icon: Icon, label, desc }) => (
          <Link key={href} href={href}>
            <Card className="flex items-start gap-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="mt-0.5 flex-shrink-0 w-10 h-10 rounded-lg bg-pine-soft flex items-center justify-center">
                <Icon className="w-5 h-5 text-pine" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink text-sm">{label}</p>
                <p className="text-muted text-sm mt-0.5">{desc}</p>
                {latestFor[href] && (
                  <p className="text-xs text-faint mt-1">{latestFor[href]}</p>
                )}
              </div>
              <Activity className="w-4 h-4 text-faint flex-shrink-0 mt-1" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
