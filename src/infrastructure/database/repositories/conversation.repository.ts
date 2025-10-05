// PostgreSQL repository for conversation persistence
// Stores conversation history and enables session resumption

import { IConversationRepository } from '@application/interfaces/conversation-repository.interface';
import { Conversation, ConversationMessage, ConversationMetadata } from '@domain/entities/conversation';

interface DatabaseConnection {
  query(text: string, params?: any[]): Promise<any>;
}

export class ConversationRepository implements IConversationRepository {
  constructor(private db: DatabaseConnection) {}

  async save(conversation: Conversation): Promise<Conversation> {
    const existing = await this.findById(conversation.id);

    if (existing) {
      return this.update(conversation);
    } else {
      return this.create(conversation);
    }
  }

  async findById(id: string): Promise<Conversation | null> {
    const query = `
      SELECT * FROM conversations
      WHERE id = $1
    `;

    const result = await this.db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToConversation(result.rows[0]);
  }

  async findBySessionId(sessionId: string): Promise<Conversation | null> {
    const query = `
      SELECT * FROM conversations
      WHERE session_id = $1
      ORDER BY last_activity_at DESC
      LIMIT 1
    `;

    const result = await this.db.query(query, [sessionId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToConversation(result.rows[0]);
  }

  async findByCustomerId(customerId: string, limit: number = 10): Promise<Conversation[]> {
    const query = `
      SELECT * FROM conversations
      WHERE customer_id = $1
      ORDER BY last_activity_at DESC
      LIMIT $2
    `;

    const result = await this.db.query(query, [customerId, limit]);

    return result.rows.map((row: any) => this.mapRowToConversation(row));
  }

  async findActiveByCustomerId(customerId: string): Promise<Conversation | null> {
    const query = `
      SELECT * FROM conversations
      WHERE customer_id = $1 AND status = 'active'
      ORDER BY last_activity_at DESC
      LIMIT 1
    `;

    const result = await this.db.query(query, [customerId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToConversation(result.rows[0]);
  }

  async findStaleConversations(thresholdMinutes: number): Promise<Conversation[]> {
    const query = `
      SELECT * FROM conversations
      WHERE status = 'active'
        AND last_activity_at < NOW() - INTERVAL '${thresholdMinutes} minutes'
      ORDER BY last_activity_at ASC
    `;

    const result = await this.db.query(query);

    return result.rows.map((row: any) => this.mapRowToConversation(row));
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM conversations WHERE id = $1';
    await this.db.query(query, [id]);
  }

  async markAsAbandoned(id: string): Promise<void> {
    const query = `
      UPDATE conversations
      SET status = 'abandoned', last_activity_at = NOW()
      WHERE id = $1
    `;
    await this.db.query(query, [id]);
  }

  private async create(conversation: Conversation): Promise<Conversation> {
    const query = `
      INSERT INTO conversations (
        id, customer_id, session_id, messages, metadata, status,
        started_at, last_activity_at, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      conversation.id,
      conversation.customerId || null,
      conversation.sessionId,
      JSON.stringify(conversation.messages),
      JSON.stringify(conversation.metadata),
      conversation.status,
      conversation.startedAt,
      conversation.lastActivityAt,
      conversation.completedAt || null
    ]);

    return this.mapRowToConversation(result.rows[0]);
  }

  private async update(conversation: Conversation): Promise<Conversation> {
    const query = `
      UPDATE conversations SET
        customer_id = $2,
        session_id = $3,
        messages = $4,
        metadata = $5,
        status = $6,
        last_activity_at = $7,
        completed_at = $8
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query(query, [
      conversation.id,
      conversation.customerId || null,
      conversation.sessionId,
      JSON.stringify(conversation.messages),
      JSON.stringify(conversation.metadata),
      conversation.status,
      conversation.lastActivityAt,
      conversation.completedAt || null
    ]);

    return this.mapRowToConversation(result.rows[0]);
  }

  private mapRowToConversation(row: any): Conversation {
    const messages: ConversationMessage[] = typeof row.messages === 'string'
      ? JSON.parse(row.messages)
      : row.messages || [];

    const metadata: ConversationMetadata = typeof row.metadata === 'string'
      ? JSON.parse(row.metadata)
      : row.metadata || {};

    const props = {
      id: row.id,
      customerId: row.customer_id ? row.customer_id : undefined,
      sessionId: row.session_id,
      messages: messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      })),
      metadata,
      status: row.status,
      startedAt: new Date(row.started_at),
      lastActivityAt: new Date(row.last_activity_at),
      ...(row.completed_at && { completedAt: new Date(row.completed_at) })
    };

    return Conversation.reconstitute(props as any);
  }
}
