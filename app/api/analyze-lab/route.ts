import { NextResponse } from "next/server";
import { LabAnalysisSchema } from "@/lib/schemas";
import { callJSON, hasKey, modelFor, modeRules, profileContext, toneRules } from "@/lib/ai";
import { simulateLab } from "@/lib/sim";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { imageDataUrl, profile, mode } = body;
  const explainMode = mode || "normal";

  if (!hasKey() || !imageDataUrl) {
    return NextResponse.json({ ...simulateLab(explainMode), mode: explainMode });
  }

  try {
    const prompt = [
      "This image is a lab report or a screenshot of lab results.",
      "Extract every lab marker you can read into a structured table, then explain each one.",
      `User profile for context: ${profileContext(profile)}`,
      modeRules(explainMode),
      "For each marker, write the explanation in the requested mode, then explain why it matters specifically for this user's profile and goals, and list 0 to 3 practical questions the user could ask a clinician later.",
      "This is an interpretation aid for personal learning, not a diagnosis. Frame uncertainty honestly with flag 'unknown' when a range is unclear.",
      "Return JSON: { summary: string, markers: [{ marker, result, unit, referenceRange, flag ('low'|'normal'|'high'|'unknown'), explanation, whyItMatters, questions (string array) }] }."
    ].join("\n");
    const raw = await callJSON({
      model: modelFor("strong"),
      system: "You are a careful lab report explainer inside a private personal health app. " + toneRules(),
      prompt,
      imageDataUrl
    });
    const parsed = LabAnalysisSchema.parse(raw);
    return NextResponse.json({ ...parsed, mode: explainMode, simulated: false });
  } catch (err) {
    console.error("analyze-lab failed, falling back to simulation:", err);
    return NextResponse.json({ ...simulateLab(explainMode), mode: explainMode });
  }
}
