// Local recipe text parser.
// Looks for common headings and structures recipe text into fields.
// No AI required. Falls back gracefully when structure is unclear.

export interface ParsedRecipe {
  parsedName: string;
  parsedIngredients: string[];
  parsedInstructions: string[];
  parsedServings?: number;
  parsedPrepTimeMinutes?: number;
  parsedCookTimeMinutes?: number;
  parsedMealSlot?: string;
  parsedDietStyle?: string;
  parsedTags: string[];
  confidence: "low" | "medium" | "high";
  needsReview: boolean;
}

const ING_HEADS = ["ingredients", "ingredient list", "what you need", "you will need", "what you'll need"];
const INSTR_HEADS = ["instructions", "directions", "method", "steps", "preparation", "how to make", "how to prepare", "procedure"];
const SERVE_HEADS = ["servings", "serves", "yield", "yields", "makes"];
const PREP_HEADS = ["prep time", "preparation time", "prep"];
const COOK_HEADS = ["cook time", "cooking time", "bake time", "baking time", "total time", "time"];

function headMatch(line: string, heads: string[]): boolean {
  const l = line.toLowerCase().replace(/[:\-\s]+$/, "").trim();
  return heads.some((h) => l === h || l.startsWith(h + " ") || l.startsWith(h + ":"));
}

function extractMinutes(line: string): number | undefined {
  const hourMatch = line.match(/(\d+)\s*h/i);
  const minMatch = line.match(/(\d+)\s*m/i);
  const rawMatch = line.match(/\d+/);
  if (hourMatch && minMatch) return parseInt(hourMatch[1], 10) * 60 + parseInt(minMatch[1], 10);
  if (hourMatch) return parseInt(hourMatch[1], 10) * 60;
  if (minMatch) return parseInt(minMatch[1], 10);
  if (rawMatch) return parseInt(rawMatch[0], 10);
  return undefined;
}

function extractServings(line: string): number | undefined {
  const m = line.match(/\d+/);
  return m ? parseInt(m[0], 10) : undefined;
}

function cleanIngredient(line: string): string {
  return line.replace(/^[\-\*\+\u2022\u25AA]\s*/, "").replace(/^\d+[\.\)]\s*/, "").trim();
}

function cleanInstruction(line: string): string {
  return line.replace(/^\d+[\.\)]\s*/, "").replace(/^[\-\*\+\u2022]\s*/, "").trim();
}

export function parseRecipeText(raw: string): ParsedRecipe {
  const lines = raw.split("\n").map((l) => l.trim());
  const nonEmpty = lines.filter(Boolean);

  let parsedName = "Untitled Recipe";
  const parsedIngredients: string[] = [];
  const parsedInstructions: string[] = [];
  let parsedServings: number | undefined;
  let parsedPrepTimeMinutes: number | undefined;
  let parsedCookTimeMinutes: number | undefined;
  let hasIngSection = false;
  let hasInstrSection = false;

  // Name: first non-empty line that is not a section heading
  for (const line of nonEmpty) {
    if (!headMatch(line, [...ING_HEADS, ...INSTR_HEADS, ...SERVE_HEADS, ...PREP_HEADS, ...COOK_HEADS])) {
      parsedName = line.replace(/^[#*\-\s]+/, "").trim() || "Untitled Recipe";
      break;
    }
  }

  // Section pass
  type Section = "ingredients" | "instructions" | "meta" | "none";
  let section: Section = "none";

  for (const line of lines) {
    if (!line) continue;

    if (headMatch(line, ING_HEADS)) { section = "ingredients"; hasIngSection = true; continue; }
    if (headMatch(line, INSTR_HEADS)) { section = "instructions"; hasInstrSection = true; continue; }
    if (headMatch(line, SERVE_HEADS)) { parsedServings = extractServings(line); section = "meta"; continue; }
    if (headMatch(line, PREP_HEADS)) { parsedPrepTimeMinutes = extractMinutes(line); section = "meta"; continue; }
    if (headMatch(line, COOK_HEADS)) { parsedCookTimeMinutes = extractMinutes(line); section = "meta"; continue; }

    // Inline key: value detection (e.g. "Serves: 4" or "Prep: 15 min")
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0 && colonIdx < 20) {
      const key = line.slice(0, colonIdx).toLowerCase().trim();
      const val = line.slice(colonIdx + 1).trim();
      if (SERVE_HEADS.some((h) => key === h)) { parsedServings = extractServings(val); continue; }
      if (PREP_HEADS.some((h) => key === h)) { parsedPrepTimeMinutes = extractMinutes(val); continue; }
      if (COOK_HEADS.some((h) => key === h)) { parsedCookTimeMinutes = extractMinutes(val); continue; }
    }

    if (section === "ingredients") {
      const cleaned = cleanIngredient(line);
      if (cleaned.length > 1) parsedIngredients.push(cleaned);
    } else if (section === "instructions") {
      const cleaned = cleanInstruction(line);
      if (cleaned.length > 3) parsedInstructions.push(cleaned);
    }
  }

  // Heuristic fallback when no section headings found
  if (!hasIngSection && !hasInstrSection && parsedIngredients.length === 0) {
    const bulleted = nonEmpty.filter((l) => l.match(/^[\-\*\+\u2022]/));
    const numbered = nonEmpty.filter((l) => l.match(/^\d+[\.\)]/));
    if (bulleted.length > 0) bulleted.forEach((l) => parsedIngredients.push(cleanIngredient(l)));
    if (numbered.length > 0) numbered.forEach((l) => parsedInstructions.push(cleanInstruction(l)));
  }

  const confidence: "low" | "medium" | "high" =
    hasIngSection && hasInstrSection ? "high" :
    hasIngSection || hasInstrSection ? "medium" :
    "low";

  return {
    parsedName,
    parsedIngredients,
    parsedInstructions,
    parsedServings,
    parsedPrepTimeMinutes,
    parsedCookTimeMinutes,
    parsedTags: [],
    confidence,
    needsReview: confidence === "low"
  };
}

// Split pasted text into multiple recipe blocks.
// Tries double-blank-line separation first, then falls back to single recipe.
export function splitBatchText(raw: string): string[] {
  const byTriple = raw.split(/\n{3,}/);
  if (byTriple.length > 1) return byTriple.map((s) => s.trim()).filter((s) => s.length > 20);

  const byDouble = raw.split(/\n{2,}/);
  if (byDouble.length > 2) {
    // Merge small chunks: if a block is < 40 chars it is probably a heading, merge with next
    const merged: string[] = [];
    let buf = "";
    for (const block of byDouble) {
      if (!block.trim()) continue;
      if (buf && block.trim().length < 40 && !merged.length) { buf += "\n\n" + block; continue; }
      if (buf) merged.push(buf.trim());
      buf = block;
    }
    if (buf) merged.push(buf.trim());
    if (merged.length > 1) return merged.filter((s) => s.length > 20);
  }

  return [raw.trim()].filter((s) => s.length > 5);
}
