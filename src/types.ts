export interface Story {
  sourceUrl: string;
  title: string;
  text: string;
  wordCount: number;
  characterCount: number;
  extractedAt: string;
}

export interface WrittenStoryOutputs {
  slug: string;
  textPath: string;
  jsonPath: string;
}
