// Embedding sync service interface for Clean Architecture application layer
// Defines contract for synchronizing embeddings with database entities

export interface SyncResult {
  totalProcessed: number;
  newEmbeddings: number;
  updatedEmbeddings: number;
  errors: number;
  duration: number;
}

export interface SyncOptions {
  batchSize?: number;
  forceUpdate?: boolean;
  vehicleIds?: string[];
}

export interface IEmbeddingSyncService {
  syncAll(options?: SyncOptions): Promise<SyncResult>;

  syncVehicle(vehicleId: string): Promise<void>;

  syncVehicles(vehicleIds: string[]): Promise<SyncResult>;

  clearAllEmbeddings(): Promise<void>;

  getEmbeddingStatus(): Promise<{
    totalVehicles: number;
    vehiclesWithEmbeddings: number;
    vehiclesWithoutEmbeddings: number;
  }>;
}
