import { mkdtemp, rm } from "node:fs/promises";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createInitialState, handleArticleDecision } from "../src/workflow.js";
import type { PirateArticle } from "../src/feed.js";

let tempDir: string | undefined;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
});

describe("approval workflow", () => {
  const article: PirateArticle = {
    id: "https://piratewires.substack.com/p/inside-microns-attempts",
    title: "Inside Micron's Attempts",
    url: "https://piratewires.substack.com/p/inside-microns-attempts",
    author: "Ryan Hassan",
    publishedAt: "Mon, 22 Jun 2026 17:07:10 GMT",
    description: "following nonsense regulations",
  };

  test("skip records a skipped article without generating audio", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "pirate-workflow-"));
    const synthesize = vi.fn();
    const state = createInitialState();
    state.pending[article.slug ?? "inside-microns-attempts"] = article;

    const result = await handleArticleDecision({
      decision: "skip",
      slug: "inside-microns-attempts",
      state,
      libraryDir: tempDir,
      readArticle: vi.fn(),
      synthesize,
    });

    expect(result.status).toBe("skipped");
    expect(synthesize).not.toHaveBeenCalled();
    expect(state.skipped[article.id]).toBeDefined();
  });

  test("accept reads the article, generates audio, and records library metadata", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "pirate-workflow-"));
    const state = createInitialState();
    state.pending["inside-microns-attempts"] = article;

    const result = await handleArticleDecision({
      decision: "accept",
      slug: "inside-microns-attempts",
      state,
      libraryDir: tempDir,
      readArticle: vi.fn(async () => ({
        sourceUrl: article.url,
        title: article.title,
        text: "Body text.",
        wordCount: 2,
        characterCount: 10,
        extractedAt: "2026-06-23T01:00:00.000Z",
      })),
      synthesize: vi.fn(async ({ outputPath }) => {
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, Buffer.from("mock mp3"));
        return {
          provider: "mock",
          outputPath,
          estimatedCostUsd: 0.01,
        };
      }),
    });

    expect(result.status).toBe("accepted");
    expect(result.libraryItem?.audioUrl).toBe("/audio/inside-microns-attempts.mp3");
    expect(state.approved[article.id]).toBeDefined();
  });

  test("accept can recover an article that was already skipped", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "pirate-workflow-"));
    const state = createInitialState();
    state.skipped[article.id] = { article, decidedAt: "2026-06-23T01:00:00.000Z" };

    const result = await handleArticleDecision({
      decision: "accept",
      slug: "inside-microns-attempts",
      state,
      libraryDir: tempDir,
      readArticle: vi.fn(async () => ({
        sourceUrl: article.url,
        title: article.title,
        text: "Body text.",
        wordCount: 2,
        characterCount: 10,
        extractedAt: "2026-06-23T01:00:00.000Z",
      })),
      synthesize: vi.fn(async ({ outputPath }) => {
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, Buffer.from("mock mp3"));
        return {
          provider: "mock",
          outputPath,
          estimatedCostUsd: 0.01,
        };
      }),
    });

    expect(result.status).toBe("accepted");
    expect(state.skipped[article.id]).toBeUndefined();
    expect(state.approved[article.id]).toBeDefined();
  });
});
