import { NextResponse } from "next/server";
import { HealthInsightSchema } from "@/lib/schemas";
import { callJSON, hasKey, modelFor, modeRules, profileContext, toneRules } from "@/lib/ai";
import { simulateAsk } from "@/lib/sim";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { question, profile, mode, recentData } = body;

  if (!hasKey()) {
    return NextResponse.json(simulateAsk(question || "my recent health data"));
  }

  try {
    const prompt = [
      `The user asks: ${question || "Give me a useful reflection on my recent data."}`,
      `User profile: ${profileContext(profile)}`,
      recentData ? `Recent logged data as JSON: ${JSON.stringify(recentData).slice(0, 12000)}` : "No recent data attached.",
      modeRules(mode || "normal"),
      "Be specific to this user's data and goals. Point at patterns, not single events. Offer one or two practical next moves.",
      "Return JSON: { summary: string (one sentence), full: string (the complete answer) }."
    ].join("\n");
    const raw = await callJSON({
      model: modelFor("strong"),
      system: "You are a practical personal health coach inside a private app. You interpret data and patterns. You do not diagnose. " + toneRules(),
      prompt
    });
    const parsed = HealthInsightSchema.parse(raw);
    return NextResponse.json({ ...parsed, simulated: false });
  } catch (err) {
    console.error("ask-health failed, falling back to simulation:", err);
    return NextResponse.json(simulateAsk(question || "my recent health data"));
  }
}
