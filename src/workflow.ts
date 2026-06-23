import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { PirateArticle } from "./feed.js";
import { appendLibraryItem, type LibraryItem } from "./library.js";
import { storySlug } from "./output.js";
import { createInitialState, type PirateRadioState } from "./state.js";
import type { TtsProvider, TtsRequest, TtsResult } from "./tts/index.js";
import type { Story } from "./types.js";

export { createInitialState };

export interface ArticleDecisionInput {
  decision: "accept" | "skip";
  slug: string;
  state: PirateRadioState;
  libraryDir: string;
  readArticle: (url: string) => Promise<Story>;
  synthesize: (request: TtsRequest) => Promise<TtsResult>;
}

export interface ArticleDecisionResult {
  status: "accepted" | "skipped" | "missing";
  article?: PirateArticle;
  libraryItem?: LibraryItem;
}

export async function handleArticleDecision(
  input: ArticleDecisionInput,
): Promise<ArticleDecisionResult> {
  const existingApproved = findDecisionRecord(input.state.approved, input.slug);
  if (existingApproved && input.decision === "accept") {
    return { status: "accepted", article: existingApproved.article };
  }

  const article =
    input.state.pending[input.slug] ??
    findDecisionRecord(input.state.skipped, input.slug)?.article ??
    findSeenArticle(input.state, input.slug);
  if (!article) {
    return { status: "missing" };
  }

  delete input.state.pending[input.slug];
  const decidedAt = new Date().toISOString();

  if (input.decision === "skip") {
    input.state.skipped[article.id] = { article, decidedAt };
    return { status: "skipped", article };
  }

  delete input.state.skipped[article.id];

  const story = await input.readArticle(article.url);
  const slug = storySlug(story);
  const textDir = join(input.libraryDir, "text");
  const storyDir = join(input.libraryDir, "stories");
  const audioDir = join(input.libraryDir, "audio");
  await mkdir(textDir, { recursive: true });
  await mkdir(storyDir, { recursive: true });
  await mkdir(audioDir, { recursive: true });

  const textPath = join(textDir, `${slug}.txt`);
  const jsonPath = join(storyDir, `${slug}.json`);
  const audioPath = join(audioDir, `${slug}.mp3`);

  await writeFile(textPath, `${story.title}\n\n${story.text}\n`, "utf8");
  await writeFile(jsonPath, `${JSON.stringify(story, null, 2)}\n`, "utf8");
  const ttsResult = await input.synthesize({
    title: story.title,
    text: story.text,
    outputPath: audioPath,
    allowOverBudget: false,
  });

  const manifest = await appendLibraryItem(input.libraryDir, {
    slug,
    title: story.title,
    sourceUrl: story.sourceUrl,
    audioPath: ttsResult.outputPath,
    jsonPath,
    textPath,
    publishedAt: article.publishedAt,
    generatedAt: new Date().toISOString(),
    estimatedCostUsd: ttsResult.estimatedCostUsd,
    wordCount: story.wordCount,
    characterCount: story.characterCount,
  });

  input.state.approved[article.id] = { article, decidedAt };
  return { status: "accepted", article, libraryItem: manifest.items[0] };
}

export function providerSynthesizer(provider: TtsProvider): ArticleDecisionInput["synthesize"] {
  return (request) => provider.synthesize(request);
}

function findDecisionRecord(
  records: PirateRadioState["approved"] | PirateRadioState["skipped"],
  slug: string,
): { article: PirateArticle; decidedAt: string } | undefined {
  return Object.values(records).find((record) => articleSlug(record.article) === slug);
}

function findSeenArticle(state: PirateRadioState, slug: string): PirateArticle | undefined {
  return Object.values(state.seen).find((article) => articleSlug(article) === slug);
}

function articleSlug(article: PirateArticle): string {
  return article.slug ?? basename(new URL(article.url).pathname);
}
