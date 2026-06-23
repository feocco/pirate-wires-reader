import { describe, expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import { extractStoryFromHtml } from "../src/extractor.js";

describe("extractStoryFromHtml", () => {
  test("extracts only the story title and body from fixture HTML", async () => {
    const html = await readFile("tests/fixtures/pirate-story.html", "utf8");

    const story = extractStoryFromHtml(html, "https://www.piratewires.com/p/test-story");

    expect(story.title).toBe("The Test Story");
    expect(story.text).toBe(
      [
        "Preferred body paragraph one.",
        "Preferred body paragraph two.",
      ].join("\n\n"),
    );
    expect(story.text).not.toContain("This is not the story body.");
    expect(story.text).not.toContain("Home Politics Subscribe");
    expect(story.text).not.toContain("Subscribe now for more.");
    expect(story.text).not.toContain("Privacy Policy Terms");
    expect(story.wordCount).toBe(8);
    expect(story.characterCount).toBe(story.text.length);
  });
});
