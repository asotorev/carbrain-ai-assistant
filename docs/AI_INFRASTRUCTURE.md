# CarBrain AI Infrastructure

Complete AI/ML infrastructure for conversational vehicle search and recommendations.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     REST API Layer                          │
│              (Express + AI Controllers)                     │
├─────────────────────────────────────────────────────────────┤
│                  Application Services                       │
│    ConversationalRAGService + SemanticVehicleSearch         │
├─────────────────────────────────────────────────────────────┤
│                   AI Infrastructure                         │
│  LLM Provider (OpenAI/Ollama) + Vector Store (pgvector)     │
├─────────────────────────────────────────────────────────────┤
│                   Data Persistence                          │
│         PostgreSQL (Vehicles + Conversations)               │
└─────────────────────────────────────────────────────────────┘
```

## Provider Options

CarBrain supports two AI providers that can be switched via environment configuration:

### OpenAI (Default)
- **Advantages**: 10-20x faster responses (1-3s vs 20-40s), high-quality output
- **Models**: gpt-3.5-turbo, gpt-4, text-embedding-3-small
- **Cost**: API usage costs per request
- **Setup**: Requires OpenAI API key

### Ollama (Local Alternative)
- **Advantages**: Free, runs locally, no API costs, data privacy
- **Models**: llama3.2, nomic-embed-text
- **Cost**: Free (requires local compute resources)
- **Setup**: Requires Docker and model downloads

## Components

### 1. LLM Provider

#### OpenAI
- **Models**: gpt-3.5-turbo, gpt-4
- **Response Time**: 1-3 seconds
- **Features**: High-quality bilingual responses, advanced reasoning

#### Ollama
- **Model**: llama3.2 (local)
- **Response Time**: 20-40 seconds
- **Features**: Free, private, self-hosted

**Common Features**:
- Bilingual support (Spanish/English)
- Context-aware responses
- Vehicle recommendation explanations

### 2. Embedding Service

#### OpenAI
- **Model**: text-embedding-3-small (1536 dimensions)
- **Speed**: Fast API-based generation

#### Ollama
- **Model**: nomic-embed-text (768 dimensions)
- **Speed**: Local generation

**Used for**:
- Vehicle descriptions vectorization
- User query embeddings
- Semantic similarity matching

### 3. Vector Store (pgvector)

- **Database**: PostgreSQL with pgvector extension
- **Storage**: Variable dimensions (768 for Ollama, 1536 for OpenAI)
- **Operations**:
  - Cosine similarity search
  - Batch embedding storage
  - Metadata filtering

### 4. Semantic Vehicle Search

- **Input**: Natural language queries
- **Process**:
  1. Generate query embedding
  2. Search vector store for similar vehicles
  3. Rank by relevance score
  4. Fetch full vehicle details
- **Output**: Ranked vehicle list with scores

### 5. Conversational RAG

- **Features**:
  - Multi-turn conversations
  - Context awareness
  - User preference extraction
  - Follow-up question handling
- **Memory**: PostgreSQL-persisted conversations

### 6. Conversation Persistence

- **Table**: conversations
- **Fields**:
  - Message history (JSONB)
  - User preferences (JSONB)
  - Vehicle context
  - Session tracking
  - Lifecycle management

## API Endpoints

### Chat Endpoint

```
POST /api/ai/chat
Content-Type: application/json

{
  "message": "Busco un SUV familiar",
  "sessionId": "unique-session-id",
  "customerId": "optional-customer-id"
}

Response:
{
  "message": "AI response...",
  "vehicles": [...],
  "suggestedFollowUps": [...],
  "conversationId": "uuid",
  "messageCount": 2
}
```

### Semantic Search

```
POST /api/ai/search
Content-Type: application/json

{
  "query": "affordable reliable sedan",
  "limit": 10,
  "threshold": 0.5
}

Response:
{
  "vehicles": [...],
  "count": 10,
  "relevanceScores": [0.85, 0.82, ...]
}
```

### Recommendations

```
GET /api/ai/recommendations/:vehicleId?reason=similar

Response:
{
  "recommendations": [...],
  "count": 5,
  "relevanceScores": [...]
}
```

### Conversation Management

```
GET /api/ai/conversations/session/:sessionId
GET /api/ai/conversations/customer/:customerId
POST /api/ai/conversations/session/:sessionId/complete
```

### Health Check

```
GET /api/ai/health

Response:
{
  "status": "healthy",
  "services": {
    "embeddingService": true,
    "vectorStore": true,
    "llmProvider": true
  }
}
```

## Setup Instructions

### 1. Database Setup

```bash
# Start PostgreSQL with pgvector
docker-compose up -d postgres

# Run database migration
./scripts/run-migration.sh scripts/migrations/create-conversations-table.sql
```

### 2. Seed Vehicle Data

```bash
npm run seed
```

### 3. Generate Vehicle Embeddings

```bash
npm run sync:vehicle-embeddings
```

### 4. Configure AI Provider

#### For OpenAI (Recommended for Production)

```bash
# Add to .env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

#### For Ollama (Local Development)

```bash
# Add to .env
AI_PROVIDER=ollama

# Start Ollama via docker-compose
docker-compose up -d ollama

# Verify Ollama is running
npm run verify:ollama
```

### 5. Run Tests

```bash
# Individual component tests
npm run test:embeddings
npm run test:vector-store
npm run test:semantic-search
npm run test:conversational-rag
npm run test:conversation-memory

# API tests
npm run test:ai-api

# Complete end-to-end test
npm run test:e2e-ai
```

## Environment Variables

```env
# AI Provider Selection
AI_PROVIDER=openai  # or 'ollama'

# OpenAI Configuration (when AI_PROVIDER=openai)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Ollama Configuration (when AI_PROVIDER=ollama)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=llama3.2:1b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_TIMEOUT=30000

# Database (from .env)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=carbrain_ai
DB_USER=carbrain_user
DB_PASSWORD=carbrain_pass
```

## Data Flow: Complete User Journey

1. **User sends message**

   ```
   POST /api/ai/chat
   { "message": "Busco un SUV", "sessionId": "abc123" }
   ```

2. **Conversation retrieval**

   - Check for existing conversation by sessionId
   - Load message history and context

3. **Query processing**

   - Determine if new search or follow-up
   - Generate embedding for query
   - Search vector store for similar vehicles

4. **LLM generation**

   - Build prompt with:
     - System instructions (automotive sales assistant)
     - Conversation history
     - Vehicle search results
     - User message
   - Generate contextual response

5. **Persistence**

   - Save new messages to conversation
   - Update metadata (preferences, vehicle IDs)
   - Store in PostgreSQL

6. **Response**
   - Return AI message
   - Include relevant vehicles
   - Suggest follow-up questions

## Performance Considerations

### Embedding Generation

- **Batch processing**: Sync all vehicles at once
- **Caching**: Embeddings stored in database
- **Lazy loading**: Generate on-demand if missing

### Vector Search

- **Index**: IVFFlat index on embeddings for fast similarity search
- **Threshold**: Filter results below relevance threshold
- **Limit**: Return top N results to reduce response size

### Conversation Storage

- **JSONB**: Efficient storage and querying of messages
- **Indexes**: Fast lookup by sessionId and customerId
- **Cleanup**: Automated stale conversation detection

## Monitoring

### Health Checks

```bash
curl http://localhost:3000/api/ai/health
```

### Service Status

- Embedding service: Provider reachable (OpenAI API or Ollama)
- Vector store: Database connection + pgvector extension
- LLM provider: Model loaded and responsive

### Performance Metrics

- Average response time per endpoint
- Conversation completion rate
- Semantic search relevance scores
- User engagement (messages per conversation)

## Troubleshooting

### OpenAI API Issues

```bash
# Check API key is set
echo $OPENAI_API_KEY

# Test API connection
npm run test:llm-provider

# Common issues:
# - Invalid API key
# - Rate limits exceeded
# - Network connectivity
```

### Ollama not responding

```bash
docker-compose restart ollama
docker-compose logs ollama
```

### No embeddings found

```bash
npm run sync:vehicle-embeddings
```

### Vector search returns no results

- Check embedding sync status
- Verify pgvector extension installed
- Lower similarity threshold

### Conversation not persisting

- Check database connection
- Verify conversations table exists
- Review error logs

## Next Steps

1. **Frontend Integration**: Connect React UI to AI endpoints
2. **Authentication**: Add user authentication for personalized conversations
3. **Analytics**: Track conversation metrics and user preferences
4. **Fine-tuning**: Collect conversation data for model improvement
5. **Caching**: Add Redis for conversation context caching
6. **Rate Limiting**: Implement API rate limits
7. **Monitoring**: Add observability tools (Prometheus, Grafana)

## Testing

### Unit Tests

- Individual service methods
- Repository CRUD operations
- Entity business logic

### Integration Tests

- Service interactions
- Database operations
- API endpoint responses

### End-to-End Tests

- Complete user journeys
- Multi-service workflows
- Data persistence validation

Run complete test suite:

```bash
npm run test:e2e-ai
```
