// PostgreSQL pgvector implementation of vector store interface
// Provides vector similarity search using cosine distance and IVFFlat indexing

import { Pool } from 'pg';
import {
  IVectorStore,
  VectorDocument,
  VectorSearchResult,
  VectorSearchOptions
} from '@application/interfaces/vector-store.interface';

export class PgVectorStore implements IVectorStore {
  private pool: Pool;
  private tableName: string;

  constructor(pool: Pool, tableName: string = 'vector_documents') {
    this.pool = pool;
    this.tableName = tableName;
  }

  async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        embedding vector(768) NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS ${this.tableName}_embedding_idx
      ON ${this.tableName}
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);
  }

  async addDocument(document: VectorDocument): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO ${this.tableName} (id, content, embedding, metadata)
      VALUES ($1, $2, $3::vector, $4)
      ON CONFLICT (id) DO UPDATE
      SET content = EXCLUDED.content,
          embedding = EXCLUDED.embedding,
          metadata = EXCLUDED.metadata,
          updated_at = CURRENT_TIMESTAMP
    `,
      [
        document.id,
        document.content,
        JSON.stringify(document.embedding),
        JSON.stringify(document.metadata || {})
      ]
    );
  }

  async addDocuments(documents: VectorDocument[]): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (const doc of documents) {
        await client.query(
          `
          INSERT INTO ${this.tableName} (id, content, embedding, metadata)
          VALUES ($1, $2, $3::vector, $4)
          ON CONFLICT (id) DO UPDATE
          SET content = EXCLUDED.content,
              embedding = EXCLUDED.embedding,
              metadata = EXCLUDED.metadata,
              updated_at = CURRENT_TIMESTAMP
        `,
          [
            doc.id,
            doc.content,
            JSON.stringify(doc.embedding),
            JSON.stringify(doc.metadata || {})
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async search(
    queryEmbedding: number[],
    options?: VectorSearchOptions
  ): Promise<VectorSearchResult[]> {
    const limit = options?.limit || 10;
    const threshold = options?.threshold || 0;

    let query = `
      SELECT
        id,
        content,
        metadata,
        1 - (embedding <=> $1::vector) as similarity
      FROM ${this.tableName}
      WHERE 1 - (embedding <=> $1::vector) >= $2
    `;

    if (options?.filter && Object.keys(options.filter).length > 0) {
      const filterConditions = Object.entries(options.filter)
        .map(([key, value]) => `metadata->>'${key}' = '${value}'`)
        .join(' AND ');
      query += ` AND ${filterConditions}`;
    }

    query += `
      ORDER BY embedding <=> $1::vector
      LIMIT $3
    `;

    const result = await this.pool.query(query, [
      JSON.stringify(queryEmbedding),
      threshold,
      limit
    ]);

    return result.rows.map(row => ({
      id: row.id as string,
      content: row.content as string,
      metadata: row.metadata as Record<string, unknown>,
      similarity: row.similarity as number
    }));
  }

  async updateDocument(
    id: string,
    document: Partial<VectorDocument>
  ): Promise<void> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (document.content !== undefined) {
      updates.push(`content = $${paramCount++}`);
      values.push(document.content);
    }

    if (document.embedding !== undefined) {
      updates.push(`embedding = $${paramCount++}::vector`);
      values.push(JSON.stringify(document.embedding));
    }

    if (document.metadata !== undefined) {
      updates.push(`metadata = $${paramCount++}`);
      values.push(JSON.stringify(document.metadata));
    }

    if (updates.length === 0) {
      return;
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await this.pool.query(
      `
      UPDATE ${this.tableName}
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
    `,
      values
    );
  }

  async deleteDocument(id: string): Promise<void> {
    await this.pool.query(`DELETE FROM ${this.tableName} WHERE id = $1`, [id]);
  }

  async getDocument(id: string): Promise<VectorDocument | null> {
    const result = await this.pool.query(
      `SELECT id, content, embedding, metadata FROM ${this.tableName} WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row?.id as string,
      content: row?.content as string,
      embedding: row?.embedding as number[],
      metadata: row?.metadata as Record<string, unknown>
    };
  }

  async clear(): Promise<void> {
    await this.pool.query(`DELETE FROM ${this.tableName}`);
  }

  async getCount(): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*) as count FROM ${this.tableName}`
    );
    return parseInt(result.rows[0]?.count as string, 10);
  }
}
