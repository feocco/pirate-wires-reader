import { describe, expect, test } from "vitest";
import { parseAudioRange } from "../src/server.js";

describe("audio range parsing", () => {
  test("accepts open-ended byte ranges", () => {
    expect(parseAudioRange("bytes=100-", 1000)).toEqual({ start: 100, end: 999 });
  });

  test("accepts bounded byte ranges", () => {
    expect(parseAudioRange("bytes=100-199", 1000)).toEqual({ start: 100, end: 199 });
  });

  test("accepts suffix byte ranges", () => {
    expect(parseAudioRange("bytes=-200", 1000)).toEqual({ start: 800, end: 999 });
  });

  test("rejects invalid byte ranges", () => {
    expect(parseAudioRange("bytes=200-100", 1000)).toBe("invalid");
    expect(parseAudioRange("items=0-100", 1000)).toBe("invalid");
    expect(parseAudioRange("bytes=1000-", 1000)).toBe("invalid");
  });
});
