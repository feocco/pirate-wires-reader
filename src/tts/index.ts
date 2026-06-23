import { OpenAiTtsProvider } from "./openai.js";
import type { TtsProvider } from "./types.js";

export function createTtsProvider(providerName: string): TtsProvider {
  if (providerName === "openai") {
    return new OpenAiTtsProvider();
  }

  throw new Error(`Unsupported TTS provider "${providerName}". Available providers: openai.`);
}

export type { TtsProvider, TtsRequest, TtsResult } from "./types.js";
