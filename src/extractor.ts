import type { Story } from "./types.js";

const BLOCKED_TEXT_PATTERNS = [
  /subscribe/i,
  /privacy policy/i,
  /terms/i,
  /sign in/i,
  /log in/i,
  /share this/i,
];

export function extractStoryFromHtml(html: string, sourceUrl: string): Story {
  const article = extractBodyContainerHtml(html);
  const title =
    cleanText(firstMatch(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i) ?? "") ||
    cleanText(firstMatch(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i) ?? "");

  if (!title) {
    throw new Error("Could not find a story title on the page.");
  }

  const bodyHtml = article
    .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, "")
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");

  const blocks = Array.from(
    bodyHtml.matchAll(/<(p|h2|h3|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi),
    (match) => cleanText(match[2] ?? ""),
  ).filter((text) => text && !isBlockedText(text));

  if (blocks.length === 0) {
    throw new Error("Could not find story body text on the page.");
  }

  const text = blocks.join("\n\n");

  return {
    sourceUrl,
    title,
    text,
    wordCount: countWords(text),
    characterCount: text.length,
    extractedAt: new Date().toISOString(),
  };
}

export function cleanText(value: string): string {
  return decodeHtml(stripTags(value))
    .replace(/\s+/g, " ")
    .trim();
}

function extractBodyContainerHtml(html: string): string {
  return (
    firstMatch(
      html,
      /<section\b(?=[^>]*class=["'][^"']*article_postBody[^"']*["'])[^>]*>([\s\S]*?)<\/section>/i,
    ) ??
    firstMatch(
      html,
      /<div\b(?=[^>]*class=["'][^"']*richText[^"']*["'])[^>]*>([\s\S]*?)<\/div>/i,
    ) ??
    firstMatch(html, /<article\b[^>]*>([\s\S]*?)<\/article>/i) ??
    html
  );
}

function firstMatch(value: string, pattern: RegExp): string | undefined {
  return value.match(pattern)?.[1];
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ");
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&mdash;/g, "-")
    .replace(/&ndash;/g, "-");
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function isBlockedText(text: string): boolean {
  return BLOCKED_TEXT_PATTERNS.some((pattern) => pattern.test(text));
}
