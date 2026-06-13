import { NextResponse } from "next/server";
import { HumeAnalysisSchema } from "@/lib/schemas";
import { callJSON, hasKey, modelFor } from "@/lib/ai";
import { simulateHume } from "@/lib/sim";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { imageDataUrl } = body;

  if (!hasKey() || !imageDataUrl) {
    return NextResponse.json(simulateHume());
  }

  try {
    const prompt = [
      "This is a screenshot from a Hume body scan app or similar body composition tool.",
      "Extract every value you can read with confidence. Skip anything unreadable.",
      "Return JSON with these optional number keys: weight (lb), bodyFat (percent), muscleMass (lb), visceralFat (index), metabolicAge (years), hydration (percent), and an optional string key notes for anything else useful you can read."
    ].join("\n");
    const raw = await callJSON({
      model: modelFor("efficient"),
      system: "You extract structured numbers from health app screenshots. Do not use em dashes.",
      prompt,
      imageDataUrl
    });
    const parsed = HumeAnalysisSchema.parse(raw);
    return NextResponse.json({ ...parsed, simulated: false });
  } catch (err) {
    console.error("analyze-hume failed, falling back to simulation:", err);
    return NextResponse.json(simulateHume());
  }
}
