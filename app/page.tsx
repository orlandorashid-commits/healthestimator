"use client";

import Link from "next/link";
import { useState } from "react";
import { Camera, FlaskConical, Gauge, MessageCircleQuestion, ScanLine, Weight } from "lucide-react";
import { Badge, Button, Card, Metric, PageHeader, SectionTitle, Spinner, Textarea } from "@/components/ui";
import { addInsight, uid, useDB } from "@/lib/store";
import { fmtDateTime, isToday, todayISO } from "@/lib/utils";

const ACTIONS = [
  { href: "/food", label: "Log meal photo", icon: Camera },
  { href: "/weight", label: "Log weight", icon: Weight },
  { href: "/blood-pressure", label: "Log blood pressure", icon: Gauge },
  { href: "/hume", label: "Upload Hume screenshot", icon: ScanLine },
  { href: "/labs", label: "Upload lab report", icon: FlaskConical }
];

export default function Dashboard() {
  const { db, ready } = useDB();
  const [askOpen, setAskOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);

  if (!ready) return <PageHeader title="Dashboard" sub="Loading your data" />;

  const { profile, meals, weights, bps, hume, insights, goals } = db;
  const current = weights.length ? weights[weights.length - 1].weight : profile.currentWeight;
  const goal = goals.targetWeight ?? profile.goalWeight;
  const remaining = current != null && goal != null ? Math.max(0, +(current - goal).toFixed(1)) : null;

  const todays = meals.filter((m) => isToday(m.createdAt) && m.analysis);
  const calsToday = todays.reduce((s, m) => s + (m.analysis?.calories ?? 0), 0);
  const proteinToday = todays.reduce((s, m) => s + (m.analysis?.protein ?? 0), 0);
  const lastBP = bps[0];
  const lastHume = hume[0];
  const latestInsight = insights[0];

  async function ask() {
    if (!question.trim()) return;
    setAsking(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/ask-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          profile,
          mode: db.settings.defaultMode,
          recentData: {
            weights: weights.slice(-10),
            bloodPressure: bps.slice(0, 6),
            meals: meals.slice(0, 6).map((m) => ({ when: m.createdAt, type: m.mealType, analysis: m.analysis })),
            goals
          }
        })
      });
      const data = await res.json();
      setAnswer(data.full);
      addInsight({ id: uid(), date: todayISO(), type: "reflection", summary: data.summary, related: question, full: data.full });
    } catch {
      setAnswer("Could not reach the AI route. Check your connection and try again.");
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader title="Dashboard" sub="Your private health command center." />

      <section>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Current weight" value={current ?? "--"} unit="lb" />
          <Metric label="Goal weight" value={goal ?? "--"} unit="lb" />
          <Metric label="Pounds remaining" value={remaining ?? "--"} unit="lb" tone="pine" sub={remaining != null ? "Keep the trend, not the sprint" : undefined} />
          <Metric label="Calories today" value={calsToday || "--"} unit={calsToday ? "kcal" : undefined} sub={`${todays.length} analyzed meal${todays.length === 1 ? "" : "s"}`} />
          <Metric label="Protein today" value={proteinToday || "--"} unit={proteinToday ? "g" : undefined} sub={goals.proteinTarget ? `Target ${goals.proteinTarget} g` : undefined} />
          <Metric
            label="Last blood pressure"
            value={lastBP ? `${lastBP.systolic}/${lastBP.diastolic}` : "--"}
            sub={lastBP ? fmtDateTime(lastBP.date) : "No readings yet"}
          />
          <Metric
            label="Last Hume scan"
            value={lastHume?.bodyFat != null ? lastHume.bodyFat : "--"}
            unit={lastHume?.bodyFat != null ? "% fat" : undefined}
            sub={lastHume ? fmtDateTime(lastHume.date) : "No scans yet"}
          />
          <Metric label="Current experiment" value="" sub={goals.experiment || "None active"} />
        </div>
      </section>

      <section>
        <SectionTitle>Today</SectionTitle>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ACTIONS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="group">
              <Card className="flex h-full items-center gap-3 py-3 transition-shadow group-hover:shadow-lift">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-pine-soft text-pine-deep">
                  <Icon size={17} />
                </span>
                <span className="text-sm font-bold leading-tight">{label}</span>
              </Card>
            </Link>
          ))}
          <button onClick={() => setAskOpen((v) => !v)} className="text-left">
            <Card className="flex h-full items-center gap-3 py-3 transition-shadow hover:shadow-lift">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sea-soft text-sea">
                <MessageCircleQuestion size={17} />
              </span>
              <span className="text-sm font-bold leading-tight">Ask AI</span>
            </Card>
          </button>
        </div>
      </section>

      {askOpen && (
        <Card className="space-y-3">
          <SectionTitle>Ask about your data</SectionTitle>
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Example: What pattern do you see between my late meals and my morning blood pressure?"
          />
          <Button onClick={ask} disabled={asking || !question.trim()}>
            {asking ? <Spinner /> : null}
            {asking ? "Thinking" : "Ask AI"}
          </Button>
          {answer && (
            <div className="rounded-xl bg-mist p-3 text-sm leading-relaxed">
              {answer}
              <p className="mt-2 text-xs text-faint">Saved to your insights.</p>
            </div>
          )}
        </Card>
      )}

      <section>
        <SectionTitle action={<Link href="/insights" className="text-xs font-bold text-pine">View all</Link>}>
          Latest AI insight
        </SectionTitle>
        {latestInsight ? (
          <Card className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge tone="pine">{latestInsight.type}</Badge>
              <span className="text-xs text-faint">{fmtDateTime(latestInsight.date)}</span>
            </div>
            <p className="text-sm font-bold">{latestInsight.summary}</p>
            <p className="text-sm leading-relaxed text-muted">{latestInsight.full}</p>
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-muted">No insights yet. Analyze a meal, lab, or scan and save the result.</p>
          </Card>
        )}
      </section>
    </div>
  );
}
