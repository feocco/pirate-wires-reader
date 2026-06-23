import { describe, expect, test } from "vitest";
import { buildArticleNotification, parsePirateRadioAction } from "../src/notifications.js";

describe("Pirate Radio notifications", () => {
  const article = {
    id: "https://piratewires.substack.com/p/inside-microns-attempts",
    title: "Inside Micron's Attempts",
    url: "https://piratewires.substack.com/p/inside-microns-attempts",
    author: "Ryan Hassan",
    publishedAt: "Mon, 22 Jun 2026 17:07:10 GMT",
    description: "following nonsense regulations",
  };

  test("builds stable Yes/No mobile action IDs", () => {
    const notification = buildArticleNotification(article, "https://pirate-radio.example.test");

    expect(notification.title).toBe("Pirate Radio");
    expect(notification.message).toContain("Inside Micron's Attempts");
    expect(notification.buttons).toEqual([
      {
        title: "Yes",
        action: "PIRATE_RADIO_ACCEPT::inside-microns-attempts",
      },
      {
        title: "No",
        action: "PIRATE_RADIO_SKIP::inside-microns-attempts",
      },
    ]);
  });

  test("parses accepted and skipped action IDs", () => {
    expect(parsePirateRadioAction("PIRATE_RADIO_ACCEPT::inside-microns-attempts")).toEqual({
      decision: "accept",
      slug: "inside-microns-attempts",
    });
    expect(parsePirateRadioAction("PIRATE_RADIO_SKIP::inside-microns-attempts")).toEqual({
      decision: "skip",
      slug: "inside-microns-attempts",
    });
    expect(parsePirateRadioAction("OTHER_ACTION")).toBeNull();
  });
});
