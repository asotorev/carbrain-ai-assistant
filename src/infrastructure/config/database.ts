// Database configuration management for CarBrain AI Assistant
// Validates environment variables and provides type-safe database configuration

import { z } from 'zod';  // Import Zod for runtime schema validation

// Define schema for database configuration validation
export const DatabaseConfigSchema = z.object({
  host: z.string().min(1, 'Database host is required'),     // Must be non-empty string
  port: z.number().int().min(1).max(65535),                 // Valid TCP port range
  database: z.string().min(1, 'Database name is required'), // Must be non-empty string
  username: z.string().min(1, 'Database username is required'),
  password: z.string().min(1, 'Database password is required'),
  ssl: z.boolean().default(false),                          // SSL connection (default false for local)
  poolSize: z.number().int().min(1).max(100).default(10),   // Connection pool size (1-100)
  connectionTimeout: z.number().int().min(1000).max(30000).default(5000),  // Milliseconds to wait for connection
  idleTimeout: z.number().int().min(1000).max(300000).default(30000)       // Milliseconds before closing idle connections
});

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;  // TypeScript type from schema

// Load and validate database configuration from environment variables
export function getDatabaseConfig(): DatabaseConfig {
  // Validate that critical environment variables are set
  if (!process.env.DB_NAME) {
    throw new Error('DB_NAME environment variable is required');
  }
  if (!process.env.DB_USER) {
    throw new Error('DB_USER environment variable is required');
  }
  if (!process.env.DB_PASSWORD) {
    throw new Error('DB_PASSWORD environment variable is required');
  }

  const config = {
    host: process.env.DB_HOST || 'localhost',        // Read from environment or default to localhost
    port: parseInt(process.env.DB_PORT || '5432', 10),  // Convert string to number, default PostgreSQL port
    database: process.env.DB_NAME,                  
    username: process.env.DB_USER,                  
    password: process.env.DB_PASSWORD,              
    ssl: process.env.NODE_ENV === 'production',      // Only use SSL in production environment
    poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10)
  };

  return DatabaseConfigSchema.parse(config);  // Validate configuration against schema, throws if invalid
}

export const dbConfig = getDatabaseConfig();  // Export validated configuration for use throughout app