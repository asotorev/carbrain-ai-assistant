// OpenAI embedding service implementation using LangChain
// Generates vector embeddings for semantic search using OpenAI's embedding models

import { OpenAIEmbeddings } from '@langchain/openai';
import { IEmbeddingService } from '@application/interfaces/embedding-service.interface';

export class OpenAIEmbeddingService implements IEmbeddingService {
  private embeddings: OpenAIEmbeddings;
  private modelName: string;
  private dimensions: number;

  constructor(modelName: string = 'text-embedding-3-small', apiKey?: string) {
    this.modelName = modelName;

    // text-embedding-3-small produces 1536-dimensional vectors
    // text-embedding-3-large produces 3072-dimensional vectors
    this.dimensions = modelName.includes('large') ? 3072 : 1536;

    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error('OpenAI API key is required');
    }

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: key,
      modelName: this.modelName
    });
  }

  async embedText(text: string): Promise<number[]> {
    try {
      const embedding = await this.embeddings.embedQuery(text);
      return embedding;
    } catch (error) {
      console.error('ERROR: OpenAI embedding generation failed:', error);
      throw new Error('Failed to generate embedding with OpenAI');
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const embeddings = await this.embeddings.embedDocuments(texts);
      return embeddings;
    } catch (error) {
      console.error('ERROR: OpenAI batch embedding failed:', error);
      throw new Error('Failed to generate batch embeddings with OpenAI');
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.warn('WARNING: OPENAI_API_KEY not configured');
        return false;
      }

      return true;
    } catch (error) {
      console.error('ERROR: OpenAI embedding service availability check failed:', error);
      return false;
    }
  }

  getDimensions(): number {
    return this.dimensions;
  }

  getModelName(): string {
    return this.modelName;
  }

  getModelInfo(): { provider: string; model: string; dimensions: number } {
    return {
      provider: 'openai',
      model: this.modelName,
      dimensions: this.dimensions
    };
  }
}
