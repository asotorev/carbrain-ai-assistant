// Factory for creating AI providers based on configuration
// Enables consistent provider selection across application and tests

import { IEmbeddingService } from '@application/interfaces/embedding-service.interface';
import { ILLMProvider } from '@application/interfaces/llm-provider.interface';
import { OllamaEmbeddingService } from '@infrastructure/ai/embeddings/ollama-embedding-service';
import { OpenAIEmbeddingService } from '@infrastructure/ai/embeddings/openai-embedding-service';
import { OllamaLLMProvider } from '@infrastructure/ai/providers/ollama-llm-provider';
import { OpenAILLMProvider } from '@infrastructure/ai/providers/openai-llm-provider';
import { aiConfig } from '@infrastructure/config/ai';

export class AIProviderFactory {
  static createEmbeddingService(): IEmbeddingService {
    if (aiConfig.provider === 'openai') {
      return new OpenAIEmbeddingService(aiConfig.openai.embeddingModel);
    } else {
      return new OllamaEmbeddingService(aiConfig.ollama.embeddingModel);
    }
  }

  static createLLMProvider(): ILLMProvider {
    if (aiConfig.provider === 'openai') {
      return new OpenAILLMProvider(aiConfig.openai.model);
    } else {
      return new OllamaLLMProvider(aiConfig.ollama.defaultModel);
    }
  }

  static getProviderInfo(): {
    provider: string;
    llmModel: string;
    embeddingModel: string;
  } {
    if (aiConfig.provider === 'openai') {
      return {
        provider: 'openai',
        llmModel: aiConfig.openai.model,
        embeddingModel: aiConfig.openai.embeddingModel
      };
    } else {
      return {
        provider: 'ollama',
        llmModel: aiConfig.ollama.defaultModel,
        embeddingModel: aiConfig.ollama.embeddingModel
      };
    }
  }
}
