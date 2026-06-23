import { describe, expect, test, vi } from "vitest";
import { assertWithinBudget, estimateOpenAiTtsCost } from "../src/tts/cost.js";
import { splitSpeechInput } from "../src/tts/openai.js";
import type { TtsProvider } from "../src/tts/types.js";

describe("OpenAI TTS cost guard", () => {
  test("estimates speech generation at 15 dollars per million characters", () => {
    expect(estimateOpenAiTtsCost(10_000)).toBeCloseTo(0.15);
  });

  test("blocks audio generation above one dollar unless explicitly allowed", () => {
    expect(() => assertWithinBudget(70_000, false)).toThrow(
      "Estimated OpenAI TTS cost $1.05 exceeds the $1.00 budget",
    );
    expect(() => assertWithinBudget(70_000, true)).not.toThrow();
  });
});

describe("TtsProvider contract", () => {
  test("can be implemented by a mock provider", async () => {
    const provider: TtsProvider = {
      name: "mock",
      synthesize: vi.fn(async () => ({
        provider: "mock",
        outputPath: "output/audio/test.mp3",
        estimatedCostUsd: 0.01,
      })),
    };

    const result = await provider.synthesize({
      title: "The Test Story",
      text: "Story text.",
      outputPath: "output/audio/test.mp3",
      allowOverBudget: false,
    });

    expect(provider.synthesize).toHaveBeenCalledOnce();
    expect(result.outputPath).toBe("output/audio/test.mp3");
  });
});

describe("splitSpeechInput", () => {
  test("splits long article text into ordered bounded chunks", () => {
    const text = Array.from({ length: 12 }, (_, index) => `Paragraph ${index} ${"word ".repeat(80)}`).join(
      "\n\n",
    );

    const chunks = splitSpeechInput("A Long Story", text, 1200);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 1200)).toBe(true);
    expect(chunks.join("\n\n")).toContain("A Long Story");
    expect(chunks.join("\n\n")).toContain("Paragraph 11");
  });
});
