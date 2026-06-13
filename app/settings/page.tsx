"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Field, Input, PageHeader, SectionTitle } from "@/components/ui";
import { clearDemoData, exportData, setSettings, useDB } from "@/lib/store";
import ModePicker from "@/components/ModePicker";
import type { Settings } from "@/lib/types";

interface ApiStatus {
  hasKey: boolean;
  efficientModel: string;
  strongModel: string;
}

export default function SettingsPage() {
  const { db, ready } = useDB();
  const [form, setForm] = useState<Settings | null>(null);
  const [status, setStatus] = useState<ApiStatus | null>(null);
  const [saved, setSaved] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (ready && !form) setForm(db.settings);
  }, [ready, db.settings, form]);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setStatus(d))
      .catch(() => {});
  }, []);

  function patch(key: keyof Settings, value: string) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  function save() {
    if (!form) return;
    setSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleExport() {
    const json = exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `healthestimator-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClear() {
    if (!clearing) {
      setClearing(true);
      return;
    }
    clearDemoData();
    setClearing(false);
  }

  if (!ready || !form) {
    return (
      <div className="page-container">
        <PageHeader title="Settings" />
        <p className="text-muted text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader title="Settings" sub="App configuration and data controls" />

      <section className="space-y-4">
        <SectionTitle>API Status</SectionTitle>
        <Card>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-ink">OpenAI API Key</span>
            {status === null ? (
              <Badge tone="gray">Checking...</Badge>
            ) : status.hasKey ? (
              <Badge tone="pine">Connected</Badge>
            ) : (
              <Badge tone="gray">Not configured</Badge>
            )}
          </div>
          {status && !status.hasKey && (
            <p className="text-sm text-muted">
              Add{" "}
              <code className="font-mono text-xs bg-faint/30 px-1 rounded">OPENAI_API_KEY</code> to{" "}
              <code className="font-mono text-xs bg-faint/30 px-1 rounded">.env.local</code> to
              enable real AI analysis. The app works without it using simulated responses.
            </p>
          )}
          {status && status.hasKey && (
            <div className="space-y-1 text-sm text-muted">
              <div>
                Fast model:{" "}
                <span className="font-mono text-ink text-xs">{status.efficientModel}</span>
              </div>
              <div>
                Strong model:{" "}
                <span className="font-mono text-ink text-xs">{status.strongModel}</span>
              </div>
            </div>
          )}
        </Card>
      </section>

      <section className="space-y-4">
        <SectionTitle>Model Override</SectionTitle>
        <Card>
          <p className="text-sm text-muted mb-4">
            Leave blank to use the defaults (gpt-4o-mini and gpt-4o). Only change these if you
            want to point the app at a specific model version.
          </p>
          <div className="space-y-3">
            <Field label="Fast Model (analysis, quick tasks)">
              <Input
                placeholder="gpt-4o-mini"
                value={form.efficientModel}
                onChange={(e) => patch("efficientModel", e.target.value)}
              />
            </Field>
            <Field label="Strong Model (lab reports, deep analysis)">
              <Input
                placeholder="gpt-4o"
                value={form.strongModel}
                onChange={(e) => patch("strongModel", e.target.value)}
              />
            </Field>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <SectionTitle>Default Explanation Mode</SectionTitle>
        <Card>
          <p className="text-sm text-muted mb-4">
            How AI explanations are written by default. You can override this per analysis.
          </p>
          <ModePicker
            value={form.defaultMode}
            onChange={(m) => patch("defaultMode", m)}
          />
        </Card>
      </section>

      <section className="space-y-4">
        <SectionTitle>Storage</SectionTitle>
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink">Storage mode</span>
            <Badge tone="gray">Local device</Badge>
          </div>
          <p className="text-sm text-muted mt-2">
            All data is stored on this device only. Nothing is sent to any server except OpenAI
            when you trigger an analysis.
          </p>
        </Card>
      </section>

      <div>
        <Button variant="primary" onClick={save} className="w-full">
          {saved ? "Saved" : "Save settings"}
        </Button>
      </div>

      <section className="space-y-4">
        <SectionTitle>Data Controls</SectionTitle>
        <Card className="space-y-3">
          <div>
            <p className="text-sm font-medium text-ink mb-1">Export all data</p>
            <p className="text-sm text-muted mb-3">
              Downloads a JSON file with every entry: meals, weights, blood pressure, labs,
              insights, and your profile.
            </p>
            <Button variant="secondary" onClick={handleExport}>
              Export data
            </Button>
          </div>
          <div className="border-t border-line pt-3">
            <p className="text-sm font-medium text-clay mb-1">Clear demo data</p>
            <p className="text-sm text-muted mb-3">
              Removes all seeded demo entries. Your settings are kept. This cannot be undone.
            </p>
            <Button
              variant="ghost"
              onClick={handleClear}
              className="border border-clay/40 text-clay hover:bg-clay/10"
            >
              {clearing ? "Tap again to confirm" : "Clear demo data"}
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
