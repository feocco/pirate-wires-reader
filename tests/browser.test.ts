import { describe, expect, test } from "vitest";
import { canonicalPirateWiresUrl } from "../src/browser.js";

describe("browser extraction URLs", () => {
  test("normalizes Substack feed URLs to Pirate Wires article pages", () => {
    expect(
      canonicalPirateWiresUrl("https://piratewires.substack.com/p/inside-microns-attempts-to-reindustrialize"),
    ).toBe("https://www.piratewires.com/p/inside-microns-attempts-to-reindustrialize");
  });

  test("leaves Pirate Wires URLs unchanged", () => {
    expect(canonicalPirateWiresUrl("https://www.piratewires.com/p/what-happened-to-medium")).toBe(
      "https://www.piratewires.com/p/what-happened-to-medium",
    );
  });
});
