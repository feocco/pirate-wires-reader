import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import OpenAI from "openai";
import { assertWithinBudget } from "./cost.js";
import type { TtsProvider, TtsRequest, TtsResult } from "./types.js";

const DEFAULT_MAX_SPEECH_CHARS = 3900;

export interface OpenAiTtsProviderOptions {
  apiKey?: string;
  model?: string;
  voice?: string;
}

export class OpenAiTtsProvider implements TtsProvider {
  name = "openai";

  private readonly client: OpenAI;
  private readonly model: string;
  private readonly voice: string;

  constructor(options: OpenAiTtsProviderOptions = {}) {
    this.model = options.model ?? "gpt-4o-mini-tts";
    this.voice = options.voice ?? "alloy";
    this.client = new OpenAI({ apiKey: options.apiKey ?? process.env.OPENAI_API_KEY });
  }

  async synthesize(request: TtsRequest): Promise<TtsResult> {
    const input = `${request.title}\n\n${request.text}`;
    const estimatedCostUsd = assertWithinBudget(input.length, request.allowOverBudget);
    const chunks = splitSpeechInput(request.title, request.text);

    await mkdir(dirname(request.outputPath), { recursive: true });
    const buffers: Buffer[] = [];

    for (const chunk of chunks) {
      const response = await this.client.audio.speech.create({
        model: this.model,
        voice: this.voice,
        input: chunk,
        response_format: "mp3",
      });
      buffers.push(Buffer.from(await response.arrayBuffer()));
    }

    await writeFile(request.outputPath, Buffer.concat(buffers));

    return {
      provider: this.name,
      outputPath: request.outputPath,
      estimatedCostUsd,
    };
  }
}

export function splitSpeechInput(
  title: string,
  text: string,
  maxChars = DEFAULT_MAX_SPEECH_CHARS,
): string[] {
  const paragraphs = text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = title.trim();

  for (const paragraph of paragraphs) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) {
      chunks.push(current);
    }
    if (paragraph.length <= maxChars) {
      current = paragraph;
    } else {
      const sentences = paragraph.match(/[^.!?]+[.!?]+|\S[\s\S]{0,500}(?=\s|$)/g) ?? [paragraph];
      current = "";
      for (const sentence of sentences.map((value) => value.trim()).filter(Boolean)) {
        const sentenceNext = current ? `${current} ${sentence}` : sentence;
        if (sentenceNext.length <= maxChars) {
          current = sentenceNext;
        } else {
          if (current) {
            chunks.push(current);
          }
          current = sentence.slice(0, maxChars);
        }
      }
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}
