import { describe, expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import { extractStoryFromHtml } from "../src/extractor.js";

describe("extractStoryFromHtml", () => {
  test("extracts focused story content and reader metadata from fixture HTML", async () => {
    const html = await readFile("tests/fixtures/pirate-story.html", "utf8");

    const story = extractStoryFromHtml(html, "https://www.piratewires.com/p/test-story");

    expect(story.title).toBe("The Test Story");
    expect(story.text).toBe(
      [
        "Enter: The Test Section",
        "Preferred body paragraph one.",
        "A quoted line from the story.",
        "A list item from the article.",
        "American Test Redux",
        "Preferred body paragraph two.",
      ].join("\n\n"),
    );
    expect(story.tagline).toBe("A visible article tagline with the article's full deck.");
    expect(story.heroImageOriginalUrl).toContain("substack-post-media.s3.amazonaws.com");
    expect(story.heroImageOriginalUrl).toContain("hero.png");
    expect(story.heroImageOriginalUrl).not.toContain("recommendation.png");
    expect(story.sectionTitles).toEqual(["Enter: The Test Section", "American Test Redux"]);
    expect(story.contentBlocks).toEqual([
      { type: "heading", text: "Enter: The Test Section" },
      { type: "paragraph", text: "Preferred body paragraph one." },
      { type: "quote", text: "A quoted line from the story." },
      { type: "list", text: "A list item from the article." },
      { type: "heading", text: "American Test Redux" },
      { type: "paragraph", text: "Preferred body paragraph two." },
    ]);
    expect(story.text).not.toContain("This is not the story body.");
    expect(story.text).not.toContain("Home Politics Subscribe");
    expect(story.text).not.toContain("Subscribe now for more.");
    expect(story.text).not.toContain("Privacy Policy Terms");
    expect(story.wordCount).toBe(27);
    expect(story.characterCount).toBe(story.text.length);
  });
});
