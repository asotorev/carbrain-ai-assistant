// AI and ML infrastructure configuration management
// Handles Ollama connection settings and model configuration for local LLM inference

import * as dotenv from 'dotenv';

dotenv.config();

export interface AIConfig {
  ollama: {
    baseUrl: string;
    defaultModel: string;
    timeout: number;
  };
  conversation: {
    maxHistoryLength: number;
    contextWindow: number;
  };
}

export const aiConfig: AIConfig = {
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'llama3.2',
    timeout: parseInt(process.env.OLLAMA_TIMEOUT || '30000', 10)
  },
  conversation: {
    maxHistoryLength: parseInt(process.env.MAX_CONVERSATION_HISTORY || '10', 10),
    contextWindow: parseInt(process.env.CONTEXT_WINDOW || '4096', 10)
  }
};

export function validateAIConfig(): void {
  if (!aiConfig.ollama.baseUrl) {
    throw new Error('OLLAMA_BASE_URL is required in environment configuration');
  }

  if (!aiConfig.ollama.defaultModel) {
    throw new Error('OLLAMA_DEFAULT_MODEL is required in environment configuration');
  }

  console.log('AI Configuration validated successfully');
  console.log(`- Ollama Base URL: ${aiConfig.ollama.baseUrl}`);
  console.log(`- Default Model: ${aiConfig.ollama.defaultModel}`);
  console.log(`- Request Timeout: ${aiConfig.ollama.timeout}ms`);
}
