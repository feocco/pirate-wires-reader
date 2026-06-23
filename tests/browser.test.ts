import { describe, expect, test } from "vitest";
import { canonicalPirateWiresUrl, profileDirFromEnv } from "../src/browser.js";

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

  test("allows the Playwright profile path to be configured for Docker", () => {
    expect(profileDirFromEnv({ PWR_PROFILE_DIR: "/data/playwright-profile" })).toBe(
      "/data/playwright-profile",
    );
    expect(profileDirFromEnv({})).toBe(".playwright-profile");
  });
});
