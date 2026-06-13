import { NextResponse } from "next/server";
import { hasKey, modelFor } from "@/lib/ai";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    hasKey: hasKey(),
    efficientModel: modelFor("efficient"),
    strongModel: modelFor("strong")
  });
}
