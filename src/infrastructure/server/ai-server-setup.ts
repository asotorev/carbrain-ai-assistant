// AI server setup and dependency injection
// Configures and wires AI services, controllers, and routes

import { Pool } from 'pg';
import { DatabaseConnection } from '@infrastructure/database/connection';
import { VehicleRepository } from '@infrastructure/database/repositories/vehicle.repository';
import { ConversationRepository } from '@infrastructure/database/repositories/conversation.repository';
import { PgVectorStore } from '@infrastructure/ai/vector-stores/pgvector-store';
import { AIProviderFactory } from '@infrastructure/ai/ai-provider-factory';
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

  // Initialize AI services using factory pattern
  const embeddingService = AIProviderFactory.createEmbeddingService();
  const llmProvider = AIProviderFactory.createLLMProvider();
  const vectorStore = new PgVectorStore(pool, aiConfig.vectorStore.tableName);

  const semanticSearch = new SemanticVehicleSearchService(
    embeddingService,
    vectorStore,
    llmProvider,
    vehicleRepository
  );

  const conversationalRAG = new ConversationalRAGService(
    semanticSearch,
    llmProvider
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
