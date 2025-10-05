// AI and ML infrastructure configuration management
// Handles Ollama connection settings and model configuration for local LLM inference

import * as dotenv from 'dotenv';

dotenv.config();

export interface AIConfig {
  provider: 'ollama' | 'openai';
  ollama: {
    baseUrl: string;
    defaultModel: string;
    embeddingModel: string;
    timeout: number;
  };
  openai: {
    apiKey: string;
    model: string;
    embeddingModel: string;
  };
  vectorStore: {
    tableName: string;
  };
  conversation: {
    maxHistoryLength: number;
    contextWindow: number;
  };
}

export const aiConfig: AIConfig = {
  provider: (process.env.AI_PROVIDER as 'ollama' | 'openai') || 'openai',
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'llama3.2:1b',
    embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
    timeout: parseInt(process.env.OLLAMA_TIMEOUT || '30000', 10)
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'
  },
  vectorStore: {
    tableName: process.env.VECTOR_STORE_TABLE || 'vehicles'
  },
  conversation: {
    maxHistoryLength: parseInt(process.env.MAX_CONVERSATION_HISTORY || '10', 10),
    contextWindow: parseInt(process.env.CONTEXT_WINDOW || '4096', 10)
  }
};

export function validateAIConfig(): void {
  console.log('AI Configuration validated successfully');
  console.log(`- Provider: ${aiConfig.provider}`);

  if (aiConfig.provider === 'ollama') {
    if (!aiConfig.ollama.baseUrl) {
      throw new Error('OLLAMA_BASE_URL is required when using Ollama provider');
    }
    if (!aiConfig.ollama.defaultModel) {
      throw new Error('OLLAMA_DEFAULT_MODEL is required when using Ollama provider');
    }
    console.log(`- Ollama Base URL: ${aiConfig.ollama.baseUrl}`);
    console.log(`- Ollama Model: ${aiConfig.ollama.defaultModel}`);
    console.log(`- Embedding Model: ${aiConfig.ollama.embeddingModel}`);
  } else if (aiConfig.provider === 'openai') {
    if (!aiConfig.openai.apiKey) {
      throw new Error('OPENAI_API_KEY is required when using OpenAI provider');
    }
    console.log(`- OpenAI Model: ${aiConfig.openai.model}`);
    console.log(`- OpenAI Embedding Model: ${aiConfig.openai.embeddingModel}`);
  }
}
