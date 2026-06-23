import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Story, WrittenStoryOutputs } from "./types.js";

export async function writeStoryOutputs(
  story: Story,
  outputRoot = "output",
): Promise<WrittenStoryOutputs> {
  const slug = storySlug(story);
  const textDir = join(outputRoot, "text");
  const jsonDir = join(outputRoot, "json");
  await mkdir(textDir, { recursive: true });
  await mkdir(jsonDir, { recursive: true });

  const textPath = join(textDir, `${slug}.txt`);
  const jsonPath = join(jsonDir, `${slug}.json`);

  await writeFile(textPath, `${story.title}\n\n${story.text}\n`, "utf8");
  await writeFile(jsonPath, `${JSON.stringify(story, null, 2)}\n`, "utf8");

  return { slug, textPath, jsonPath };
}

export function storySlug(story: Pick<Story, "sourceUrl" | "title">): string {
  try {
    const pathname = new URL(story.sourceUrl).pathname;
    const urlSlug = pathname.split("/").filter(Boolean).at(-1);
    if (urlSlug) {
      return sanitizeSlug(urlSlug);
    }
  } catch {
    // Fall back to title below.
  }

  return sanitizeSlug(story.title);
}

function sanitizeSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "story"
  );
}
