import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import OpenAI from "openai";

export interface AlignmentWord {
  word: string;
  start: number;
  end: number;
}

export interface AlignmentResult {
  words: AlignmentWord[];
}

export interface AlignmentArtifact {
  alignmentPath: string;
  alignmentUrl: string;
}

export interface WriteAlignmentInput {
  libraryDir: string;
  slug: string;
  audioPath: string;
  transcribe?: (audioPath: string) => Promise<AlignmentResult>;
}

export async function writeAlignment(input: WriteAlignmentInput): Promise<AlignmentArtifact> {
  const result = await (input.transcribe ?? transcribeWithOpenAi)(input.audioPath);
  const alignmentDir = join(input.libraryDir, "alignment");
  const alignmentPath = join(alignmentDir, `${input.slug}.json`);
  await mkdir(alignmentDir, { recursive: true });
  await writeFile(alignmentPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return {
    alignmentPath,
    alignmentUrl: `/alignment/${input.slug}.json`,
  };
}

async function transcribeWithOpenAi(audioPath: string): Promise<AlignmentResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.audio.transcriptions.create({
    file: createReadStream(audioPath),
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["word"],
  });
  const words = "words" in response && Array.isArray(response.words) ? response.words : [];
  return {
    words: words
      .map((word) => ({
        word: String(word.word ?? ""),
        start: Number(word.start),
        end: Number(word.end),
      }))
      .filter((word) => word.word && Number.isFinite(word.start) && Number.isFinite(word.end)),
  };
}
