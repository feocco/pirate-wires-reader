import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { appendLibraryItem, readLibraryManifest } from "../src/library.js";

let tempDir: string | undefined;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
});

describe("library manifest", () => {
  test("stores MP3 metadata without embedding audio bytes in the manifest", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "pirate-library-"));
    const audioPath = join(tempDir, "audio", "inside-microns-attempts.mp3");
    await mkdir(join(tempDir, "audio"), { recursive: true });
    await writeFile(audioPath, Buffer.alloc(1024, 1));

    await appendLibraryItem(tempDir, {
      slug: "inside-microns-attempts",
      title: "Inside Micron's Attempts",
      sourceUrl: "https://piratewires.substack.com/p/inside-microns-attempts",
      audioPath,
      jsonPath: join(tempDir, "stories", "inside-microns-attempts.json"),
      textPath: join(tempDir, "text", "inside-microns-attempts.txt"),
      publishedAt: "Mon, 22 Jun 2026 17:07:10 GMT",
      generatedAt: "2026-06-23T01:00:00.000Z",
      estimatedCostUsd: 0.08,
      wordCount: 100,
      characterCount: 500,
    });

    const manifest = await readLibraryManifest(tempDir);
    const rawManifest = await readFile(join(tempDir, "index.json"), "utf8");

    expect(manifest.items).toHaveLength(1);
    expect(manifest.items[0].audioUrl).toBe("/audio/inside-microns-attempts.mp3");
    expect(rawManifest.length).toBeLessThan(2000);
    expect(rawManifest).not.toContain(Buffer.alloc(16, 1).toString("base64"));
  });
});
