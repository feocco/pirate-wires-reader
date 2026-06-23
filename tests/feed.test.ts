import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import { detectNewArticles, parsePirateFeed } from "../src/feed.js";

describe("Pirate Wires RSS monitor", () => {
  test("parses title, url, author, publish date, description, and guid", async () => {
    const xml = await readFile("tests/fixtures/pirate-feed.xml", "utf8");

    const articles = parsePirateFeed(xml);

    expect(articles).toHaveLength(2);
    expect(articles[0]).toMatchObject({
      id: "https://piratewires.substack.com/p/inside-microns-attempts",
      title: "Inside Micron's Attempts",
      url: "https://piratewires.substack.com/p/inside-microns-attempts",
      author: "Ryan Hassan",
      publishedAt: "Mon, 22 Jun 2026 17:07:10 GMT",
      description: "following nonsense regulations",
    });
  });

  test("detects unseen articles without re-notifying seen items", async () => {
    const xml = await readFile("tests/fixtures/pirate-feed.xml", "utf8");
    const articles = parsePirateFeed(xml);
    const seen = new Set([articles[0].id]);

    expect(detectNewArticles(articles, seen)).toEqual([articles[1]]);
  });
});
