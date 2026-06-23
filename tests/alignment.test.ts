import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { writeAlignment, type AlignmentResult } from "../src/alignment.js";

let tempDir: string | undefined;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
});

describe("audio alignment", () => {
  test("writes optional word timing metadata under the library alignment directory", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "pirate-alignment-"));
    const audioPath = join(tempDir, "audio", "test-story.mp3");
    await mkdir(join(tempDir, "audio"), { recursive: true });
    await writeFile(audioPath, Buffer.from("mock mp3"));

    const result = await writeAlignment({
      libraryDir: tempDir,
      slug: "test-story",
      audioPath,
      transcribe: async () => ({
        words: [
          { word: "First", start: 0, end: 0.25 },
          { word: "paragraph", start: 0.26, end: 0.8 },
        ],
      }),
    });

    expect(result).toEqual({
      alignmentPath: join(tempDir, "alignment", "test-story.json"),
      alignmentUrl: "/alignment/test-story.json",
    });
    const written = JSON.parse(await readFile(result.alignmentPath, "utf8")) as AlignmentResult;
    expect(written.words).toEqual([
      { word: "First", start: 0, end: 0.25 },
      { word: "paragraph", start: 0.26, end: 0.8 },
    ]);
  });
});
