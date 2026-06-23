import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { writeStoryOutputs } from "../src/output.js";
import type { Story } from "../src/types.js";

let tempDir: string | undefined;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
});

describe("writeStoryOutputs", () => {
  test("writes txt and json files with a stable story shape", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "pwr-output-"));
    const story: Story = {
      sourceUrl: "https://www.piratewires.com/p/test-story",
      title: "The Test Story",
      text: "First paragraph.\n\nSecond paragraph.",
      wordCount: 4,
      characterCount: 35,
      extractedAt: "2026-06-08T01:00:00.000Z",
    };

    const written = await writeStoryOutputs(story, tempDir);

    expect(written.slug).toBe("test-story");
    expect(await readFile(written.textPath, "utf8")).toBe(
      "The Test Story\n\nFirst paragraph.\n\nSecond paragraph.\n",
    );
    expect(JSON.parse(await readFile(written.jsonPath, "utf8"))).toEqual(story);
  });
});
