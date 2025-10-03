// AI controller for conversational vehicle search and recommendations
// Exposes RAG and semantic search capabilities through REST API

import { Request, Response } from 'express';
import { SemanticVehicleSearchService } from '@application/services/semantic-vehicle-search.service';
import { ConversationalRAGService, ConversationContext } from '@application/services/conversational-rag.service';
import { ConversationRepository } from '@infrastructure/database/repositories/conversation.repository';
import { Conversation } from '@domain/entities/conversation';

export class AIController {
  constructor(
    private semanticSearch: SemanticVehicleSearchService,
    private conversationalRAG: ConversationalRAGService,
    private conversationRepo: ConversationRepository
  ) {}

  async chat(req: Request, res: Response): Promise<void> {
    try {
      const { message, sessionId, customerId } = req.body;

      if (!message || typeof message !== 'string') {
        res.status(400).json({
          error: 'Message is required and must be a string'
        });
        return;
      }

      if (!sessionId || typeof sessionId !== 'string') {
        res.status(400).json({
          error: 'Session ID is required'
        });
        return;
      }

      // Retrieve or create conversation
      let conversation = await this.conversationRepo.findBySessionId(sessionId);
      let context: ConversationContext;

      if (conversation && conversation.isActive()) {
        // Resume existing conversation
        const vehicleIds = conversation.metadata.vehicleIds;
        const currentVehicles = vehicleIds && vehicleIds.length > 0
          ? await this.getVehiclesByIds(vehicleIds)
          : [];

        context = {
          messages: conversation.messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
          }))
        };

        if (currentVehicles.length > 0) {
          context.currentVehicles = currentVehicles;
        }
        if (conversation.metadata.lastQuery) {
          context.lastQuery = conversation.metadata.lastQuery;
        }
        if (conversation.metadata.userPreferences) {
          context.userPreferences = conversation.metadata.userPreferences;
        }
      } else {
        // Start new conversation
        context = { messages: [] };
        conversation = Conversation.create({
          sessionId,
          customerId,
          messages: [],
          metadata: {},
          status: 'active'
        });
      }

      // Process message through conversational RAG
      const response = await this.conversationalRAG.chat(message, context);

      // Update conversation with new messages and metadata
      response.context.messages.forEach(msg => {
        conversation!.addMessage({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp || new Date()
        });
      });

      if (response.vehicles && response.vehicles.length > 0) {
        const metadataUpdate: any = {
          vehicleIds: response.vehicles.map(v => v.id),
          lastQuery: message
        };
        if (response.context.userPreferences) {
          metadataUpdate.userPreferences = response.context.userPreferences;
        }
        conversation.updateMetadata(metadataUpdate);
      }

      // Save conversation
      await this.conversationRepo.save(conversation);

      // Prepare response
      const vehicleSummaries = response.vehicles?.map(v => ({
        id: v.id,
        make: v.make,
        model: v.model,
        year: v.year,
        price: v.price,
        mileage: v.mileage,
        condition: v.condition,
        images: v.images,
        specification: {
          engine: v.specification.engine,
          transmission: v.specification.transmission,
          fuelType: v.specification.fuelType
        }
      }));

      res.status(200).json({
        message: response.message,
        vehicles: vehicleSummaries,
        suggestedFollowUps: response.suggestedFollowUps,
        conversationId: conversation.id,
        messageCount: conversation.messageCount
      });

    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({
        error: 'Failed to process chat message',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async search(req: Request, res: Response): Promise<void> {
    try {
      const { query, limit, threshold } = req.body;

      if (!query || typeof query !== 'string') {
        res.status(400).json({
          error: 'Query is required and must be a string'
        });
        return;
      }

      const result = await this.semanticSearch.searchVehicles(query, {
        limit: limit || 10,
        threshold: threshold || 0.5
      });

      res.status(200).json({
        vehicles: result.vehicles.map(v => ({
          id: v.id,
          make: v.make,
          model: v.model,
          year: v.year,
          price: v.price,
          mileage: v.mileage,
          condition: v.condition,
          images: v.images,
          specification: v.specification
        })),
        count: result.vehicles.length,
        relevanceScores: result.relevanceScores
      });

    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({
        error: 'Failed to perform semantic search',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { vehicleId } = req.params;
      const { reason } = req.query;

      if (!vehicleId) {
        res.status(400).json({
          error: 'Vehicle ID is required'
        });
        return;
      }

      const result = await this.semanticSearch.getRecommendations(
        vehicleId,
        reason as string | undefined
      );

      res.status(200).json({
        recommendations: result.vehicles.map(v => ({
          id: v.id,
          make: v.make,
          model: v.model,
          year: v.year,
          price: v.price,
          mileage: v.mileage,
          condition: v.condition,
          images: v.images
        })),
        count: result.vehicles.length,
        relevanceScores: result.relevanceScores
      });

    } catch (error) {
      console.error('Recommendations error:', error);
      res.status(500).json({
        error: 'Failed to get recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getConversation(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({ error: 'Session ID is required' });
        return;
      }

      const conversation = await this.conversationRepo.findBySessionId(sessionId);

      if (!conversation) {
        res.status(404).json({
          error: 'Conversation not found'
        });
        return;
      }

      res.status(200).json({
        id: conversation.id,
        sessionId: conversation.sessionId,
        customerId: conversation.customerId,
        status: conversation.status,
        messageCount: conversation.messageCount,
        messages: conversation.messages,
        metadata: conversation.metadata,
        startedAt: conversation.startedAt,
        lastActivityAt: conversation.lastActivityAt
      });

    } catch (error) {
      console.error('Get conversation error:', error);
      res.status(500).json({
        error: 'Failed to retrieve conversation',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getCustomerConversations(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;

      if (!customerId) {
        res.status(400).json({ error: 'Customer ID is required' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 10;

      const conversations = await this.conversationRepo.findByCustomerId(customerId, limit);

      res.status(200).json({
        conversations: conversations.map(c => ({
          id: c.id,
          sessionId: c.sessionId,
          status: c.status,
          messageCount: c.messageCount,
          startedAt: c.startedAt,
          lastActivityAt: c.lastActivityAt,
          completedAt: c.completedAt
        })),
        count: conversations.length
      });

    } catch (error) {
      console.error('Get customer conversations error:', error);
      res.status(500).json({
        error: 'Failed to retrieve customer conversations',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async completeConversation(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({ error: 'Session ID is required' });
        return;
      }

      const conversation = await this.conversationRepo.findBySessionId(sessionId);

      if (!conversation) {
        res.status(404).json({
          error: 'Conversation not found'
        });
        return;
      }

      conversation.complete();
      await this.conversationRepo.save(conversation);

      res.status(200).json({
        message: 'Conversation completed successfully',
        id: conversation.id,
        completedAt: conversation.completedAt
      });

    } catch (error) {
      console.error('Complete conversation error:', error);
      res.status(500).json({
        error: 'Failed to complete conversation',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.semanticSearch.healthCheck();

      const status = health.embeddingService && health.vectorStore && health.llmProvider
        ? 'healthy'
        : 'degraded';

      res.status(status === 'healthy' ? 200 : 503).json({
        status,
        services: health,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  private async getVehiclesByIds(ids: string[]): Promise<any[]> {
    // This would use the vehicle repository to fetch vehicles
    // For now, return empty array
    return [];
  }
}
