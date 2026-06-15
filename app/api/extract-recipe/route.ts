import { NextResponse } from "next/server";
import { hasKey, callJSON, modelFor } from "@/lib/ai";
import { parseRecipeText } from "@/lib/parseRecipe";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { text } = body as { text?: string };

  if (!text || typeof text !== "string" || text.trim().length < 5) {
    return NextResponse.json({ error: "Recipe text is required." }, { status: 400 });
  }

  // Fall back to local parser when no API key is set
  if (!hasKey()) {
    const parsed = parseRecipeText(text);
    return NextResponse.json({ ...parsed, simulated: true });
  }

  try {
    const result = await callJSON({
      model: modelFor("efficient"),
      system: [
        "You are a recipe parser. Extract the recipe from the text into structured JSON fields.",
        "Return ONLY a JSON object with these fields: parsedName (string), parsedIngredients (array of concise strings like '2 cups flour'), parsedInstructions (array of clear step strings), parsedServings (number or null), parsedPrepTimeMinutes (number or null), parsedCookTimeMinutes (number or null), parsedDietStyle (string or null), parsedTags (array of short tag strings).",
        "Never reproduce long passages of the original text verbatim.",
        "Summarize each step concisely in your own words.",
        "If a field is missing from the recipe, omit it or return null.",
      ].join(" "),
      prompt: `Parse this recipe text:\n\n${text.slice(0, 4000)}`
    });

    if (typeof result !== "object" || result === null) {
      throw new Error("Invalid response from AI");
    }

    return NextResponse.json({ ...(result as object), simulated: false });
  } catch {
    // Fall back to local parser on any AI error
    const parsed = parseRecipeText(text);
    return NextResponse.json({ ...parsed, simulated: true });
  }
}
