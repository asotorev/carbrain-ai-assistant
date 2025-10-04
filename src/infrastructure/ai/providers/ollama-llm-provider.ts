// Ollama LLM provider implementation using LangChain
// Infrastructure adapter wrapping LangChain's Ollama integration

import { Ollama } from '@langchain/ollama';
import {
  ILLMProvider,
  ChatMessage,
  ChatResponse,
  LLMGenerationOptions
} from '@application/interfaces/llm-provider.interface';
import { aiConfig } from '@infrastructure/config/ai';
import { OllamaClient } from '@infrastructure/ai/ollama-client';

export class OllamaLLMProvider implements ILLMProvider {
  private llm: Ollama;
  private client: OllamaClient;
  private modelName: string;

  constructor(modelName: string) {
    // Append :latest tag if no tag specified
    this.modelName = modelName.includes(':') ? modelName : `${modelName}:latest`;

    this.llm = new Ollama({
      baseUrl: aiConfig.ollama.baseUrl,
      model: this.modelName,
      temperature: 0.7
    });

    this.client = new OllamaClient();
  }

  async generateText(prompt: string, options?: LLMGenerationOptions): Promise<string> {
    try {
      // Apply options by creating a new instance if needed
      const llm = options ? new Ollama({
        baseUrl: aiConfig.ollama.baseUrl,
        model: this.modelName,
        temperature: options.temperature ?? 0.7,
        ...(options.maxTokens !== undefined && { numPredict: options.maxTokens }),
        ...(options.topP !== undefined && { topP: options.topP })
      }) : this.llm;

      const response = await llm.invoke(prompt);
      return response;
    } catch (error) {
      console.error('ERROR: Ollama text generation failed:', error);
      throw new Error(`Failed to generate text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async chat(messages: ChatMessage[], options?: LLMGenerationOptions): Promise<ChatResponse> {
    try {
      // Apply options by creating a new instance if needed
      const llm = options ? new Ollama({
        baseUrl: aiConfig.ollama.baseUrl,
        model: this.modelName,
        temperature: options.temperature ?? 0.7,
        ...(options.maxTokens !== undefined && { numPredict: options.maxTokens }),
        ...(options.topP !== undefined && { topP: options.topP })
      }) : this.llm;

      // Convert our ChatMessage format to LangChain's message format
      const langchainMessages = messages.map(msg => {
        if (msg.role === 'system') {
          return ['system', msg.content] as [string, string];
        } else if (msg.role === 'user') {
          return ['human', msg.content] as [string, string];
        } else {
          return ['ai', msg.content] as [string, string];
        }
      });

      const response = await llm.invoke(langchainMessages);

      return {
        content: response,
        model: this.modelName,
        finishReason: 'stop'
      };
    } catch (error) {
      console.error('ERROR: Ollama chat failed:', error);
      throw new Error(`Failed to process chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getModelName(): string {
    return this.modelName;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const health = await this.client.healthCheck();
      return health.isHealthy && health.availableModels.includes(this.modelName);
    } catch (error) {
      console.error('ERROR: Ollama availability check failed:', error);
      return false;
    }
  }
}
