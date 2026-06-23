import { describe, expect, test } from "vitest";
import { renderReaderHtml } from "../src/reader.js";

describe("reader page", () => {
  test("renders an audio reader that persists playback position in localStorage", () => {
    const html = renderReaderHtml();

    expect(html).toContain('createElement("audio")');
    expect(html).toContain("/library.json");
    expect(html).toContain("localStorage");
    expect(html).toContain("pirate-radio-position:");
  });
});
