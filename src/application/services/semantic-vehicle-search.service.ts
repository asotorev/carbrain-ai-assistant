// Semantic vehicle search service using RAG and vector similarity
// Enables natural language vehicle queries through embeddings and LLM interpretation

import { IEmbeddingService } from '@application/interfaces/embedding-service.interface';
import { IVectorStore } from '@application/interfaces/vector-store.interface';
import { ILLMProvider } from '@application/interfaces/llm-provider.interface';
import { IVehicleRepository } from '@application/interfaces/vehicle-repository.interface';
import { Vehicle } from '@domain/entities/vehicle';

export interface SemanticSearchOptions {
  limit?: number;
  threshold?: number;
  useReranking?: boolean;
}

export interface SemanticSearchResult {
  vehicles: Vehicle[];
  query: string;
  interpretation?: string | undefined;
  relevanceScores: Array<{ vehicleId: string; score: number }>;
}

export class SemanticVehicleSearchService {
  constructor(
    private embeddingService: IEmbeddingService,
    private vectorStore: IVectorStore,
    private llmProvider: ILLMProvider,
    private vehicleRepository: IVehicleRepository
  ) {}

  async searchVehicles(
    query: string,
    options?: SemanticSearchOptions
  ): Promise<SemanticSearchResult> {
    const limit = options?.limit || 10;
    const threshold = options?.threshold || 0.5;

    // Generate embedding for user query
    const queryEmbedding = await this.embeddingService.embedText(query);

    // Search vector store for similar vehicles
    const vectorResults = await this.vectorStore.search(queryEmbedding, {
      limit: limit * 2, // Get more results for potential reranking
      threshold
    });

    if (vectorResults.length === 0) {
      return {
        vehicles: [],
        query,
        relevanceScores: []
      };
    }

    // Extract vehicle IDs from vector search results
    const vehicleIds = vectorResults.map(result => result.id);

    // Fetch full vehicle entities
    const vehicles = await this.fetchVehiclesByIds(vehicleIds);

    // Create relevance score mapping
    const relevanceScores = vectorResults.map(result => ({
      vehicleId: result.id,
      score: result.similarity
    }));

    // Optional: Use LLM to interpret query and provide context
    const interpretation = options?.useReranking
      ? await this.interpretQuery(query)
      : undefined;

    // Sort vehicles by relevance score
    const sortedVehicles = vehicles
      .map(vehicle => ({
        vehicle,
        score: relevanceScores.find(r => r.vehicleId === vehicle.id)?.score || 0
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.vehicle);

    return {
      vehicles: sortedVehicles,
      query,
      interpretation,
      relevanceScores: relevanceScores.slice(0, limit)
    };
  }

  async searchWithContext(
    query: string,
    contextMessages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: SemanticSearchOptions
  ): Promise<SemanticSearchResult> {
    // Build enhanced query with conversation context
    const enhancedQuery = await this.buildContextualQuery(query, contextMessages);

    // Perform semantic search with enhanced query
    return this.searchVehicles(enhancedQuery, options);
  }

  private async fetchVehiclesByIds(ids: string[]): Promise<Vehicle[]> {
    // Use batch query to fetch all vehicles in a single database round trip
    // This avoids the N+1 query problem (1 query instead of N individual queries)
    // Order is preserved by the repository to maintain relevance ranking from vector search
    return this.vehicleRepository.findByIds(ids);
  }

  private async interpretQuery(query: string): Promise<string> {
    const prompt = `Analyze this vehicle search query and extract key requirements:

Query: "${query}"

Provide a brief interpretation of what the customer is looking for, including:
- Vehicle type/category
- Price range (if mentioned)
- Key features or requirements
- Any specific preferences

Keep the response concise (2-3 sentences).`;

    try {
      const interpretation = await this.llmProvider.generateText(prompt, {
        temperature: 0.3,
        maxTokens: 150
      });

      return interpretation.trim();
    } catch (error) {
      console.error('ERROR: Failed to interpret query:', error);
      return 'Unable to interpret query';
    }
  }

  private async buildContextualQuery(
    currentQuery: string,
    contextMessages: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    if (contextMessages.length === 0) {
      return currentQuery;
    }

    const conversationContext = contextMessages
      .slice(-4) // Use last 4 messages for context
      .map(msg => `${msg.role === 'user' ? 'Customer' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    const prompt = `Given this conversation context, rephrase the latest query to include relevant context:

Conversation:
${conversationContext}

Latest query: "${currentQuery}"

Provide an enhanced search query that incorporates relevant context from the conversation. Keep it concise and focused on vehicle search terms.`;

    try {
      const enhancedQuery = await this.llmProvider.generateText(prompt, {
        temperature: 0.3,
        maxTokens: 100
      });

      return enhancedQuery.trim();
    } catch (error) {
      console.error('ERROR: Failed to build contextual query:', error);
      return currentQuery;
    }
  }

  async getRecommendations(
    vehicleId: string,
    reason?: string
  ): Promise<SemanticSearchResult> {
    const vehicle = await this.vehicleRepository.findById(vehicleId);

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    // Build query based on vehicle characteristics
    const query = reason || this.buildVehicleQuery(vehicle);

    return this.searchVehicles(query, {
      limit: 5,
      threshold: 0.6
    });
  }

  private buildVehicleQuery(vehicle: Vehicle): string {
    const parts = [
      `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      `${vehicle.condition} condition`,
      `${vehicle.specification.fuelType} fuel`,
      `${vehicle.specification.transmission} transmission`
    ];

    if (vehicle.description) {
      parts.push(vehicle.description);
    }

    return parts.join(' ');
  }

  async healthCheck(): Promise<{
    embeddingService: boolean;
    vectorStore: boolean;
    llmProvider: boolean;
  }> {
    const [embeddingHealthy, llmHealthy] = await Promise.all([
      this.embeddingService.isAvailable(),
      this.llmProvider.isAvailable()
    ]);

    let vectorStoreHealthy = false;
    try {
      await this.vectorStore.getCount();
      vectorStoreHealthy = true;
    } catch {
      vectorStoreHealthy = false;
    }

    return {
      embeddingService: embeddingHealthy,
      vectorStore: vectorStoreHealthy,
      llmProvider: llmHealthy
    };
  }
}
