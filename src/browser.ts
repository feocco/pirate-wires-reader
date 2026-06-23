import { chromium } from "playwright";
import { extractStoryFromHtml } from "./extractor.js";
import type { Story } from "./types.js";

export const PROFILE_DIR = ".playwright-profile";

export async function openLoginBrowser(): Promise<void> {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
  });
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto("https://www.piratewires.com/", { waitUntil: "domcontentloaded" });
  console.log("Browser opened. Complete Pirate Wires login, then press Enter here.");
  await waitForEnter();
  await context.close();
  console.log("Login session saved in .playwright-profile.");
}

export async function extractStoryFromUrl(url: string): Promise<Story> {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: process.env.PWR_HEADLESS === "true",
  });
  const page = context.pages()[0] ?? (await context.newPage());
  const articleUrl = canonicalPirateWiresUrl(url);

  try {
    await page.goto(articleUrl, { waitUntil: "networkidle", timeout: 60_000 });
    const html = await page.content();
    return extractStoryFromHtml(html, articleUrl);
  } finally {
    await context.close();
  }
}

export function canonicalPirateWiresUrl(url: string): string {
  const parsed = new URL(url);
  if (parsed.hostname === "piratewires.substack.com") {
    parsed.hostname = "www.piratewires.com";
  }
  return parsed.toString();
}

async function waitForEnter(): Promise<void> {
  process.stdin.resume();
  await new Promise<void>((resolve) => {
    process.stdin.once("data", () => resolve());
  });
  process.stdin.pause();
}
