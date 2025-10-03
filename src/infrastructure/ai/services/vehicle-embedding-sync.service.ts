// Vehicle embedding synchronization service implementation
// Generates and syncs vector embeddings for vehicle inventory with PostgreSQL

import { Pool } from 'pg';
import {
  IEmbeddingSyncService,
  SyncResult,
  SyncOptions
} from '@application/interfaces/embedding-sync-service.interface';
import { IEmbeddingService } from '@application/interfaces/embedding-service.interface';

interface VehicleRow {
  id: string;
  make: string;
  model: string;
  year: number;
  description: string | null;
  price: number;
  mileage: number;
  condition: string;
  embedding: number[] | null;
}

export class VehicleEmbeddingSyncService implements IEmbeddingSyncService {
  private pool: Pool;
  private embeddingService: IEmbeddingService;

  constructor(pool: Pool, embeddingService: IEmbeddingService) {
    this.pool = pool;
    this.embeddingService = embeddingService;
  }

  async syncAll(options?: SyncOptions): Promise<SyncResult> {
    const startTime = Date.now();
    const batchSize = options?.batchSize || 50;
    const forceUpdate = options?.forceUpdate || false;

    let totalProcessed = 0;
    let newEmbeddings = 0;
    let updatedEmbeddings = 0;
    let errors = 0;

    try {
      const whereClause = forceUpdate
        ? ''
        : 'WHERE embedding IS NULL OR embedding::text = \'null\'';

      const result = await this.pool.query<VehicleRow>(
        `SELECT id, make, model, year, description, price, mileage, condition, embedding
         FROM vehicles
         ${whereClause}
         ORDER BY id`
      );

      const vehicles = result.rows;
      console.log(`Found ${vehicles.length} vehicles to process`);

      for (let i = 0; i < vehicles.length; i += batchSize) {
        const batch = vehicles.slice(i, i + batchSize);

        try {
          const descriptions = batch.map(v => this.generateDescription(v));
          const embeddings = await this.embeddingService.embedBatch(
            descriptions
          );

          for (let j = 0; j < batch.length; j++) {
            const vehicle = batch[j];
            const embedding = embeddings[j];

            if (!vehicle || !embedding) continue;

            const isNew = !vehicle.embedding;

            await this.pool.query(
              `UPDATE vehicles
               SET embedding = $1::vector,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = $2`,
              [JSON.stringify(embedding), vehicle.id]
            );

            totalProcessed++;
            if (isNew) {
              newEmbeddings++;
            } else {
              updatedEmbeddings++;
            }
          }

          console.log(
            `Processed batch ${Math.floor(i / batchSize) + 1}: ${batch.length} vehicles`
          );
        } catch (error) {
          console.error(`Error processing batch:`, error);
          errors += batch.length;
        }
      }

      const duration = Date.now() - startTime;

      return {
        totalProcessed,
        newEmbeddings,
        updatedEmbeddings,
        errors,
        duration
      };
    } catch (error) {
      console.error('Error in syncAll:', error);
      throw error;
    }
  }

  async syncVehicle(vehicleId: string): Promise<void> {
    const result = await this.pool.query<VehicleRow>(
      `SELECT id, make, model, year, description, price, mileage, condition
       FROM vehicles
       WHERE id = $1`,
      [vehicleId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Vehicle ${vehicleId} not found`);
    }

    const vehicle = result.rows[0]!;
    const description = this.generateDescription(vehicle);
    const embedding = await this.embeddingService.embedText(description);

    await this.pool.query(
      `UPDATE vehicles
       SET embedding = $1::vector,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [JSON.stringify(embedding), vehicleId]
    );
  }

  async syncVehicles(vehicleIds: string[]): Promise<SyncResult> {
    const startTime = Date.now();
    let totalProcessed = 0;
    let newEmbeddings = 0;
    let updatedEmbeddings = 0;
    let errors = 0;

    try {
      const placeholders = vehicleIds
        .map((_, i) => `$${i + 1}`)
        .join(', ');

      const result = await this.pool.query<VehicleRow>(
        `SELECT id, make, model, year, description, price, mileage, condition, embedding
         FROM vehicles
         WHERE id IN (${placeholders})`,
        vehicleIds
      );

      const vehicles = result.rows;
      const descriptions = vehicles.map(v => this.generateDescription(v));
      const embeddings = await this.embeddingService.embedBatch(descriptions);

      for (let i = 0; i < vehicles.length; i++) {
        const vehicle = vehicles[i];
        const embedding = embeddings[i];

        if (!vehicle || !embedding) {
          errors++;
          continue;
        }

        const isNew = !vehicle.embedding;

        await this.pool.query(
          `UPDATE vehicles
           SET embedding = $1::vector,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [JSON.stringify(embedding), vehicle.id]
        );

        totalProcessed++;
        if (isNew) {
          newEmbeddings++;
        } else {
          updatedEmbeddings++;
        }
      }

      const duration = Date.now() - startTime;

      return {
        totalProcessed,
        newEmbeddings,
        updatedEmbeddings,
        errors,
        duration
      };
    } catch (error) {
      console.error('Error in syncVehicles:', error);
      throw error;
    }
  }

  async clearAllEmbeddings(): Promise<void> {
    await this.pool.query('UPDATE vehicles SET embedding = NULL');
  }

  async getEmbeddingStatus(): Promise<{
    totalVehicles: number;
    vehiclesWithEmbeddings: number;
    vehiclesWithoutEmbeddings: number;
  }> {
    const result = await this.pool.query(`
      SELECT
        COUNT(*) as total_vehicles,
        COUNT(embedding) as vehicles_with_embeddings,
        COUNT(*) - COUNT(embedding) as vehicles_without_embeddings
      FROM vehicles
    `);

    const row = result.rows[0];

    return {
      totalVehicles: parseInt(row?.total_vehicles as string, 10),
      vehiclesWithEmbeddings: parseInt(row?.vehicles_with_embeddings as string, 10),
      vehiclesWithoutEmbeddings: parseInt(row?.vehicles_without_embeddings as string, 10)
    };
  }

  private generateDescription(vehicle: VehicleRow): string {
    const parts = [
      `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      vehicle.description || '',
      `${vehicle.condition} condition`,
      `${vehicle.mileage.toLocaleString()} km`,
      `$${vehicle.price.toLocaleString()} MXN`
    ];

    return parts.filter(p => p).join(' - ');
  }
}
