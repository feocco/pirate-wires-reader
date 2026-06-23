export interface TtsRequest {
  title: string;
  text: string;
  outputPath: string;
  allowOverBudget: boolean;
}

export interface TtsResult {
  provider: string;
  outputPath: string;
  estimatedCostUsd: number;
}

export interface TtsProvider {
  name: string;
  synthesize(request: TtsRequest): Promise<TtsResult>;
}
