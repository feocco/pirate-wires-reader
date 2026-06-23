import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { PirateArticle } from "./feed.js";

export interface ArticleDecisionRecord {
  article: PirateArticle;
  decidedAt: string;
}

export interface PirateRadioState {
  initialized: boolean;
  seen: Record<string, PirateArticle>;
  pending: Record<string, PirateArticle>;
  approved: Record<string, ArticleDecisionRecord>;
  skipped: Record<string, ArticleDecisionRecord>;
}

export function createInitialState(): PirateRadioState {
  return {
    initialized: false,
    seen: {},
    pending: {},
    approved: {},
    skipped: {},
  };
}

export async function readState(statePath: string): Promise<PirateRadioState> {
  try {
    const state = JSON.parse(await readFile(statePath, "utf8")) as PirateRadioState;
    state.initialized ??= false;
    return state;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return createInitialState();
    }
    throw error;
  }
}

export async function writeState(statePath: string, state: PirateRadioState): Promise<void> {
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export function seenArticleIds(state: PirateRadioState): Set<string> {
  return new Set([
    ...Object.keys(state.seen),
    ...Object.keys(state.approved),
    ...Object.keys(state.skipped),
  ]);
}
