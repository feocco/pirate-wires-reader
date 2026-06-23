import { readFile } from "node:fs/promises";
import type { Story } from "./types.js";

export async function readStoryJson(path: string): Promise<Story> {
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw) as Partial<Story>;

  if (
    !parsed.sourceUrl ||
    !parsed.title ||
    !parsed.text ||
    typeof parsed.wordCount !== "number" ||
    typeof parsed.characterCount !== "number" ||
    !parsed.extractedAt
  ) {
    throw new Error(`Invalid story JSON file: ${path}`);
  }

  return parsed as Story;
}

export function looksLikeUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
