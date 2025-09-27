// PostgreSQL database connection manager for CarBrain AI Assistant
// Implements singleton pattern with connection pooling and transaction support

import { Pool, PoolClient, QueryResult } from 'pg';  // PostgreSQL client library
import { dbConfig } from '../config/database';        // Import validated configuration

export class DatabaseConnection {
  private static instance: DatabaseConnection;  // Singleton pattern - only one instance allowed
  private pool: Pool;                           // PostgreSQL connection pool

  // Private constructor ensures singleton pattern
  private constructor() {
    this.pool = new Pool({  // Create PostgreSQL connection pool
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.username,
      password: dbConfig.password,
      ssl: dbConfig.ssl,
      max: dbConfig.poolSize,                    // Maximum connections in pool
      connectionTimeoutMillis: dbConfig.connectionTimeout,  // How long to wait for connection
      idleTimeoutMillis: dbConfig.idleTimeout,              // How long to keep idle connections
      application_name: 'carbrain-ai-assistant'  // Identify application in PostgreSQL logs
    });

    // Event handlers for connection pool monitoring
    this.pool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err);  // Log pool-level errors
    });

    this.pool.on('connect', () => {
      console.log('Connected to PostgreSQL database');  // Log successful connections
    });
  }

  // Singleton accessor - returns the single instance
  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  // Execute SQL query with optional parameters and performance monitoring
  public async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();  // Start timing for performance monitoring
    try {
      const result = await this.pool.query(text, params);  // Execute query through connection pool
      const duration = Date.now() - start;                 // Calculate execution time

      // Log query performance in development environment
      if (process.env.NODE_ENV === 'development') {
        console.log('Database query executed:', {
          text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),  // Truncate long queries
          duration: `${duration}ms`,
          rows: result.rowCount  // Number of affected rows
        });
      }

      return result;
    } catch (error) {
      // Log detailed error information for debugging
      console.error('Database query error:', {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        params,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;  // Re-throw error for caller to handle
    }
  }

  // Get a dedicated client from pool (required for transactions)
  public async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  // Execute multiple queries within a database transaction
  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();  // Get dedicated client for transaction

    try {
      await client.query('BEGIN');          // Start transaction
      const result = await callback(client); // Execute callback with transactional client
      await client.query('COMMIT');         // Commit transaction if successful
      return result;
    } catch (error) {
      await client.query('ROLLBACK');       // Rollback transaction on any error
      throw error;
    } finally {
      client.release();                     // Always release client back to pool
    }
  }

  // Check if database connection is healthy
  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as health_check');
      return result.rows.length === 1 && result.rows[0]?.health_check === 1;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  // Gracefully close all database connections
  public async close(): Promise<void> {
    await this.pool.end();
    console.log('Database connection pool closed');
  }

  // Get current connection pool statistics for monitoring
  public getPoolStatus() {
    return {
      totalCount: this.pool.totalCount,    // Total connections created
      idleCount: this.pool.idleCount,      // Idle connections available
      waitingCount: this.pool.waitingCount // Clients waiting for connection
    };
  }
}

export const db = DatabaseConnection.getInstance();  // Export singleton instance for app-wide use