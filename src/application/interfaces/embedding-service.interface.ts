// Embedding service interface for Clean Architecture application layer
// Defines contract for text-to-vector conversion enabling semantic search

export interface EmbeddingVector {
  embedding: number[];
  dimensions: number;
}

export interface IEmbeddingService {
  embedText(text: string): Promise<number[]>;

  embedBatch(texts: string[]): Promise<number[][]>;

  getDimensions(): number;

  getModelName(): string;

  isAvailable(): Promise<boolean>;
}
