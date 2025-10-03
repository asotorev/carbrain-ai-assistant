// Vector store interface for Clean Architecture application layer
// Defines contract for storing and searching vector embeddings across different providers

export interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

export interface VectorSearchResult {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  similarity: number;
}

export interface VectorSearchOptions {
  limit?: number;
  threshold?: number;
  filter?: Record<string, unknown>;
}

export interface IVectorStore {
  addDocument(document: VectorDocument): Promise<void>;

  addDocuments(documents: VectorDocument[]): Promise<void>;

  search(
    queryEmbedding: number[],
    options?: VectorSearchOptions
  ): Promise<VectorSearchResult[]>;

  updateDocument(id: string, document: Partial<VectorDocument>): Promise<void>;

  deleteDocument(id: string): Promise<void>;

  getDocument(id: string): Promise<VectorDocument | null>;

  clear(): Promise<void>;

  getCount(): Promise<number>;
}
