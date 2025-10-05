// OpenAI LLM provider implementation using LangChain
// Provides text generation capabilities via OpenAI's GPT models

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import {
  ILLMProvider,
  LLMGenerationOptions,
  ChatMessage,
  ChatResponse
} from '@application/interfaces/llm-provider.interface';

export class OpenAILLMProvider implements ILLMProvider {
  private llm: ChatOpenAI;
  private modelName: string;

  constructor(modelName: string = 'gpt-3.5-turbo', apiKey?: string) {
    this.modelName = modelName;

    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error('OpenAI API key is required');
    }

    this.llm = new ChatOpenAI({
      modelName: this.modelName,
      openAIApiKey: key,
      temperature: 0.7,
      maxTokens: 500
    });
  }

  async generateText(prompt: string, options?: LLMGenerationOptions): Promise<string> {
    try {
      const response = await this.llm.invoke(prompt);
      return response.content.toString();
    } catch (error) {
      console.error('ERROR: OpenAI text generation failed:', error);
      throw new Error('Failed to generate text with OpenAI');
    }
  }

  async chat(messages: ChatMessage[], options?: LLMGenerationOptions): Promise<ChatResponse> {
    try {
      const langchainMessages = messages.map(msg => {
        if (msg.role === 'system') {
          return new SystemMessage(msg.content);
        } else {
          return new HumanMessage(msg.content);
        }
      });

      const response = await this.llm.invoke(langchainMessages);

      return {
        content: response.content.toString(),
        model: this.modelName,
        finishReason: 'stop'
      };
    } catch (error) {
      console.error('ERROR: OpenAI chat failed:', error);
      throw new Error('Failed to chat with OpenAI');
    }
  }

  getModelName(): string {
    return this.modelName;
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
      console.error('ERROR: OpenAI availability check failed:', error);
      return false;
    }
  }

  getModelInfo(): { provider: string; model: string } {
    return {
      provider: 'openai',
      model: this.modelName
    };
  }
}
