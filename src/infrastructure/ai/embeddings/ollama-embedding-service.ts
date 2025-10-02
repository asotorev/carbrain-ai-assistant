// Ollama embedding service implementation using nomic-embed-text model
// Infrastructure adapter for converting text to 768-dimensional vectors

import { OllamaEmbeddings } from '@langchain/ollama';
import { IEmbeddingService } from '@application/interfaces/embedding-service.interface';
import { aiConfig } from '@infrastructure/config/ai';
import { OllamaClient } from '@infrastructure/ai/ollama-client';

export class OllamaEmbeddingService implements IEmbeddingService {
  private embeddings: OllamaEmbeddings;
  private client: OllamaClient;
  private modelName: string;
  private dimensions: number;

  constructor(modelName?: string) {
    this.modelName = modelName || 'nomic-embed-text';
    this.dimensions = 768; // nomic-embed-text produces 768-dimensional vectors

    this.embeddings = new OllamaEmbeddings({
      baseUrl: aiConfig.ollama.baseUrl,
      model: this.modelName
    });

    this.client = new OllamaClient();
  }

  async embedText(text: string): Promise<number[]> {
    try {
      const embedding = await this.embeddings.embedQuery(text);

      if (embedding.length !== this.dimensions) {
        throw new Error(
          `Expected ${this.dimensions} dimensions, got ${embedding.length}`
        );
      }

      return embedding;
    } catch (error) {
      console.error('ERROR: Failed to generate embedding:', error);
      throw new Error(
        `Failed to embed text: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const embeddings = await this.embeddings.embedDocuments(texts);

      // Validate all embeddings have correct dimensions
      for (const embedding of embeddings) {
        if (embedding.length !== this.dimensions) {
          throw new Error(
            `Expected ${this.dimensions} dimensions, got ${embedding.length}`
          );
        }
      }

      return embeddings;
    } catch (error) {
      console.error('ERROR: Failed to generate batch embeddings:', error);
      throw new Error(
        `Failed to embed batch: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  getDimensions(): number {
    return this.dimensions;
  }

  getModelName(): string {
    return this.modelName;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const health = await this.client.healthCheck();
      return health.isHealthy && health.availableModels.includes(this.modelName);
    } catch (error) {
      console.error('ERROR: Embedding service availability check failed:', error);
      return false;
    }
  }
}
