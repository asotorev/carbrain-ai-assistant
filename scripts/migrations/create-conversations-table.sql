-- Migration: Create conversations table for persistent conversation memory
-- Stores multi-turn dialogue sessions with full message history and metadata

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  session_id VARCHAR(255) NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_conversations_customer_id ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_activity ON conversations(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_conversations_customer_status ON conversations(customer_id, status);

-- GIN index for JSONB metadata queries
CREATE INDEX IF NOT EXISTS idx_conversations_metadata ON conversations USING GIN(metadata);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversations_updated_at();

-- Comments for documentation
COMMENT ON TABLE conversations IS 'Stores persistent conversation sessions for multi-turn dialogues';
COMMENT ON COLUMN conversations.id IS 'Unique conversation identifier';
COMMENT ON COLUMN conversations.customer_id IS 'Optional reference to customer (nullable for anonymous sessions)';
COMMENT ON COLUMN conversations.session_id IS 'Session identifier for tracking across requests';
COMMENT ON COLUMN conversations.messages IS 'Array of conversation messages in chronological order';
COMMENT ON COLUMN conversations.metadata IS 'Contextual data including preferences, vehicle IDs, and extracted information';
COMMENT ON COLUMN conversations.status IS 'Conversation lifecycle state: active, completed, or abandoned';
COMMENT ON COLUMN conversations.started_at IS 'When the conversation began';
COMMENT ON COLUMN conversations.last_activity_at IS 'Timestamp of most recent message or update';
COMMENT ON COLUMN conversations.completed_at IS 'When the conversation was successfully completed';
