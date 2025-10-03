// Repository interface for conversation persistence
// Defines contract for storing and retrieving conversation sessions

import { Conversation } from '@domain/entities/conversation';

export interface IConversationRepository {
  save(conversation: Conversation): Promise<Conversation>;
  findById(id: string): Promise<Conversation | null>;
  findBySessionId(sessionId: string): Promise<Conversation | null>;
  findByCustomerId(customerId: string, limit?: number): Promise<Conversation[]>;
  findActiveByCustomerId(customerId: string): Promise<Conversation | null>;
  findStaleConversations(thresholdMinutes: number): Promise<Conversation[]>;
  delete(id: string): Promise<void>;
  markAsAbandoned(id: string): Promise<void>;
}
