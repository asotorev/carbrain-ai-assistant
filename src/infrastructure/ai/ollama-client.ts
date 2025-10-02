// Ollama API client for LLM inference operations
// Infrastructure adapter for communicating with Ollama service

import { aiConfig } from '@infrastructure/config/ai';

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

export interface OllamaHealthStatus {
  isHealthy: boolean;
  availableModels: string[];
  baseUrl: string;
  error?: string;
}

export class OllamaClient {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = aiConfig.ollama.baseUrl;
    this.timeout = aiConfig.ollama.timeout;
  }

  async healthCheck(): Promise<OllamaHealthStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        return {
          isHealthy: false,
          availableModels: [],
          baseUrl: this.baseUrl,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json() as { models?: OllamaModel[] };
      const models = data.models?.map((m: OllamaModel) => m.name) || [];

      return {
        isHealthy: true,
        availableModels: models,
        baseUrl: this.baseUrl
      };
    } catch (error) {
      return {
        isHealthy: false,
        availableModels: [],
        baseUrl: this.baseUrl,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: HTTP ${response.status}`);
      }

      const data = await response.json() as { models?: OllamaModel[] };
      return data.models || [];
    } catch (error) {
      console.error('ERROR: Failed to list Ollama models:', error);
      return [];
    }
  }

  async pullModel(modelName: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: modelName }),
        signal: AbortSignal.timeout(300000)
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: HTTP ${response.status}`);
      }

      console.log(`SUCCESS: Model ${modelName} pulled successfully`);
    } catch (error) {
      console.error(`ERROR: Failed to pull model ${modelName}:`, error);
      throw error;
    }
  }
}
