import { mkdtemp, rm } from "node:fs/promises";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createInitialState, handleArticleDecision, refreshLibraryArticle } from "../src/workflow.js";
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

  test("failed accept preserves the pending article for retry", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "pirate-workflow-"));
    const state = createInitialState();
    state.pending["inside-microns-attempts"] = article;

    await expect(
      handleArticleDecision({
        decision: "accept",
        slug: "inside-microns-attempts",
        state,
        libraryDir: tempDir,
        readArticle: vi.fn(async () => {
          throw new Error("Pirate Wires login required");
        }),
        synthesize: vi.fn(),
      }),
    ).rejects.toThrow("Pirate Wires login required");

    expect(state.pending["inside-microns-attempts"]).toEqual(article);
    expect(state.approved[article.id]).toBeUndefined();
  });

  test("refresh backfills article metadata without regenerating audio", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "pirate-workflow-"));
    const libraryDir = tempDir;
    const audioPath = join(libraryDir, "audio", "inside-microns-attempts.mp3");
    await mkdir(dirname(audioPath), { recursive: true });
    await writeFile(audioPath, Buffer.from("mock mp3"));
    const state = createInitialState();
    state.approved[article.id] = { article, decidedAt: "2026-06-23T01:00:00.000Z" };
    await handleArticleDecision({
      decision: "accept",
      slug: "inside-microns-attempts",
      state: { ...state, pending: { "inside-microns-attempts": article }, approved: {} },
      libraryDir,
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
        return { provider: "mock", outputPath, estimatedCostUsd: 0.01 };
      }),
    });

    const result = await refreshLibraryArticle({
      slug: "inside-microns-attempts",
      libraryDir,
      readArticle: vi.fn(async () => ({
        sourceUrl: article.url,
        title: article.title,
        tagline: "Updated tagline.",
        heroImageOriginalUrl: "https://cdn.example.com/hero.png",
        heroImagePath: join(libraryDir, "images", "inside-microns-attempts.png"),
        heroImageUrl: "/images/inside-microns-attempts.png",
        sectionTitles: ["Updated Section"],
        contentBlocks: [{ type: "heading" as const, text: "Updated Section" }],
        text: "Updated Section",
        wordCount: 2,
        characterCount: 15,
        extractedAt: "2026-06-23T02:00:00.000Z",
      })),
      cacheImage: vi.fn(async () => ({
        imagePath: join(libraryDir, "images", "inside-microns-attempts.png"),
        imageUrl: "/images/inside-microns-attempts.png",
      })),
    });

    expect(result.status).toBe("refreshed");
    expect(result.libraryItem).toBeDefined();
    expect(result.libraryItem!.audioPath).toBe(audioPath);
    expect(result.libraryItem!.tagline).toBe("Updated tagline.");
    expect(result.libraryItem!.imageUrl).toBe("/images/inside-microns-attempts.png");
  });

  test("refresh can regenerate audio when backfilling a truncated article", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "pirate-workflow-"));
    const libraryDir = tempDir;
    const state = createInitialState();
    await handleArticleDecision({
      decision: "accept",
      slug: "inside-microns-attempts",
      state: { ...state, pending: { "inside-microns-attempts": article }, approved: {} },
      libraryDir,
      readArticle: vi.fn(async () => ({
        sourceUrl: article.url,
        title: article.title,
        text: "Short preview.",
        wordCount: 2,
        characterCount: 14,
        extractedAt: "2026-06-23T01:00:00.000Z",
      })),
      synthesize: vi.fn(async ({ outputPath }) => {
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, Buffer.from("short mp3"));
        return { provider: "mock", outputPath, estimatedCostUsd: 0.01 };
      }),
    });

    const result = await refreshLibraryArticle({
      slug: "inside-microns-attempts",
      libraryDir,
      readArticle: vi.fn(async () => ({
        sourceUrl: article.url,
        title: article.title,
        text: "Full article text with the missing paragraph.",
        wordCount: 7,
        characterCount: 45,
        extractedAt: "2026-06-23T02:00:00.000Z",
      })),
      regenerateAudio: true,
      synthesize: vi.fn(async ({ outputPath, text }) => {
        await writeFile(outputPath, Buffer.from(`regenerated ${text}`));
        return { provider: "mock", outputPath, estimatedCostUsd: 0.02 };
      }),
    });

    expect(result.status).toBe("refreshed");
    expect(result.libraryItem!.wordCount).toBe(7);
    expect(result.libraryItem!.estimatedCostUsd).toBe(0.02);
    expect(result.libraryItem!.audioBytes).toBeGreaterThan("short mp3".length);
  });
});
