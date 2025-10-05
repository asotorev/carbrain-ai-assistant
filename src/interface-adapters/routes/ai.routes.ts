// AI routes for conversational search and vehicle recommendations
// Defines REST API endpoints for AI-powered features

import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';

export function createAIRoutes(aiController: AIController): Router {
  const router = Router();

  // Chat endpoint for conversational vehicle search
  router.post('/chat', (req, res) => aiController.chat(req, res));

  // Semantic search endpoint
  router.post('/search', (req, res) => aiController.search(req, res));

  // Vehicle recommendations
  router.get('/recommendations/:vehicleId', (req, res) =>
    aiController.getRecommendations(req, res)
  );

  // Conversation management
  router.get('/conversations/session/:sessionId', (req, res) =>
    aiController.getConversation(req, res)
  );

  router.get('/conversations/customer/:customerId', (req, res) =>
    aiController.getCustomerConversations(req, res)
  );

  router.post('/conversations/session/:sessionId/complete', (req, res) =>
    aiController.completeConversation(req, res)
  );

  // Health check
  router.get('/health', (req, res) => aiController.healthCheck(req, res));

  return router;
}
