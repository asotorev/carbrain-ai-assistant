-- PostgreSQL migration to enable pgvector extension for semantic vector search
-- Adds 768-dimensional embedding column to vehicles table for similarity queries

-- Enable pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to vehicles table (768 dimensions for nomic-embed-text)
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Create IVFFlat index for fast approximate nearest neighbor search
-- lists=100 is appropriate for datasets with thousands of vectors
CREATE INDEX IF NOT EXISTS vehicles_embedding_idx
ON vehicles
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Add index on updated_at for efficient embedding sync queries
CREATE INDEX IF NOT EXISTS vehicles_updated_at_idx
ON vehicles (updated_at);

-- Add comment explaining the embedding column
COMMENT ON COLUMN vehicles.embedding IS 'Vector embedding (768-dim) generated from vehicle description for semantic search';
