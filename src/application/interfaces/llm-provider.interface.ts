// LLM provider interface for Clean Architecture application layer
// Defines contract for language model providers enabling runtime provider switching

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  finishReason?: string;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface LLMGenerationOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
}

export interface ILLMProvider {
  generateText(prompt: string, options?: LLMGenerationOptions): Promise<string>;

  chat(messages: ChatMessage[], options?: LLMGenerationOptions): Promise<ChatResponse>;

  getModelName(): string;

  isAvailable(): Promise<boolean>;
}
