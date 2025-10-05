// AI server setup and dependency injection
// Configures and wires AI services, controllers, and routes

import { Pool } from 'pg';
import { DatabaseConnection } from '@infrastructure/database/connection';
import { VehicleRepository } from '@infrastructure/database/repositories/vehicle.repository';
import { ConversationRepository } from '@infrastructure/database/repositories/conversation.repository';
import { OllamaEmbeddingService } from '@infrastructure/ai/embeddings/ollama-embedding-service';
import { OpenAIEmbeddingService } from '@infrastructure/ai/embeddings/openai-embedding-service';
import { PgVectorStore } from '@infrastructure/ai/vector-stores/pgvector-store';
import { OllamaLLMProvider } from '@infrastructure/ai/providers/ollama-llm-provider';
import { OpenAILLMProvider } from '@infrastructure/ai/providers/openai-llm-provider';
import { IEmbeddingService } from '@application/interfaces/embedding-service.interface';
import { ILLMProvider } from '@application/interfaces/llm-provider.interface';
import { SemanticVehicleSearchService } from '@application/services/semantic-vehicle-search.service';
import { ConversationalRAGService } from '@application/services/conversational-rag.service';
import { AIController } from '@interface-adapters/controllers/ai.controller';
import { createAIRoutes } from '@interface-adapters/routes/ai.routes';
import { aiConfig } from '@infrastructure/config/ai';
import { Router } from 'express';

export interface AIServerConfig {
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
  embeddingModel?: string;
}

export function setupAIServer(config: AIServerConfig): Router {
  // Initialize database connection
  const db = DatabaseConnection.getInstance();

  const pool = new Pool({
    host: config.dbHost,
    port: config.dbPort,
    database: config.dbName,
    user: config.dbUser,
    password: config.dbPassword
  });

  // Initialize repositories
  const vehicleRepository = new VehicleRepository(db);
  const conversationRepository = new ConversationRepository(db);

  // Initialize AI services based on configured provider
  let embeddingService: IEmbeddingService;
  let llmProvider: ILLMProvider;

  if (aiConfig.provider === 'openai') {
    embeddingService = new OpenAIEmbeddingService(
      aiConfig.openai.embeddingModel
    );
    llmProvider = new OpenAILLMProvider(
      aiConfig.openai.model
    );
  } else {
    embeddingService = new OllamaEmbeddingService(
      config.embeddingModel || aiConfig.ollama.embeddingModel
    );
    llmProvider = new OllamaLLMProvider(
      config.ollamaModel || aiConfig.ollama.defaultModel
    );
  }

  const vectorStore = new PgVectorStore(pool, aiConfig.vectorStore.tableName);

  const semanticSearch = new SemanticVehicleSearchService(
    embeddingService,
    vectorStore,
    llmProvider,
    vehicleRepository
  );

  const conversationalRAG = new ConversationalRAGService(
    semanticSearch,
    config.ollamaModel || aiConfig.ollama.defaultModel,
    config.ollamaBaseUrl || aiConfig.ollama.baseUrl
  );

  // Initialize controller
  const aiController = new AIController(
    semanticSearch,
    conversationalRAG,
    conversationRepository
  );

  // Create and return routes
  return createAIRoutes(aiController);
}
