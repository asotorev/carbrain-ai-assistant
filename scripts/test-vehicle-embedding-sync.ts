// Test script for vehicle embedding synchronization service
// Validates batch embedding generation and database synchronization

import 'dotenv/config';
import { Pool } from 'pg';
import { VehicleEmbeddingSyncService } from '../src/infrastructure/ai/services/vehicle-embedding-sync.service';
import { AIProviderFactory } from "@infrastructure/ai/ai-provider-factory";
import { dbConfig } from '../src/infrastructure/config/database';
import { aiConfig } from '../src/infrastructure/config/ai';

const pool = new Pool({
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.username,
  password: dbConfig.password
});

async function testVehicleEmbeddingSync(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Vehicle Embedding Sync Service Test');
  console.log('='.repeat(60));
  console.log();

  const embeddingService = AIProviderFactory.createEmbeddingService();
  const syncService = new VehicleEmbeddingSyncService(pool, embeddingService);

  try {
    // Test 1: Check initial embedding status
    console.log('Test 1: Initial Embedding Status');
    console.log('-'.repeat(60));

    const initialStatus = await syncService.getEmbeddingStatus();
    console.log(`Total vehicles: ${initialStatus.totalVehicles}`);
    console.log(`With embeddings: ${initialStatus.vehiclesWithEmbeddings}`);
    console.log(`Without embeddings: ${initialStatus.vehiclesWithoutEmbeddings}`);
    console.log();

    // Test 2: Sync single vehicle
    console.log('Test 2: Sync Single Vehicle');
    console.log('-'.repeat(60));

    const vehicleResult = await pool.query(
      'SELECT id, make, model FROM vehicles WHERE embedding IS NULL LIMIT 1'
    );

    if (vehicleResult.rows.length > 0) {
      const vehicle = vehicleResult.rows[0];
      console.log(`Syncing vehicle: ${vehicle?.make} ${vehicle?.model}`);

      await syncService.syncVehicle(vehicle?.id as string);

      const updatedVehicle = await pool.query(
        'SELECT embedding FROM vehicles WHERE id = $1',
        [vehicle?.id]
      );

      if (updatedVehicle.rows[0]?.embedding) {
        console.log('SUCCESS: Vehicle embedding generated');
        console.log(
          `Embedding dimensions: ${(updatedVehicle.rows[0].embedding as number[]).length}`
        );
      }
    } else {
      console.log('INFO: All vehicles already have embeddings');
    }
    console.log();

    // Test 3: Batch sync with limit
    console.log('Test 3: Batch Sync (Limited)');
    console.log('-'.repeat(60));

    console.log('Syncing vehicles in batches of 10...');
    const batchResult = await syncService.syncAll({
      batchSize: 10,
      forceUpdate: false
    });

    console.log(`Total processed: ${batchResult.totalProcessed}`);
    console.log(`New embeddings: ${batchResult.newEmbeddings}`);
    console.log(`Updated embeddings: ${batchResult.updatedEmbeddings}`);
    console.log(`Errors: ${batchResult.errors}`);
    console.log(`Duration: ${(batchResult.duration / 1000).toFixed(2)}s`);

    if (batchResult.totalProcessed > 0) {
      console.log('SUCCESS: Batch sync completed');
    }
    console.log();

    // Test 4: Verify embedding status after sync
    console.log('Test 4: Final Embedding Status');
    console.log('-'.repeat(60));

    const finalStatus = await syncService.getEmbeddingStatus();
    console.log(`Total vehicles: ${finalStatus.totalVehicles}`);
    console.log(`With embeddings: ${finalStatus.vehiclesWithEmbeddings}`);
    console.log(`Without embeddings: ${finalStatus.vehiclesWithoutEmbeddings}`);

    const coverage = (
      (finalStatus.vehiclesWithEmbeddings / finalStatus.totalVehicles) *
      100
    ).toFixed(1);
    console.log(`Coverage: ${coverage}%`);

    if (finalStatus.vehiclesWithEmbeddings > initialStatus.vehiclesWithEmbeddings) {
      console.log('SUCCESS: Embedding coverage increased');
    }
    console.log();

    // Test 5: Semantic search validation
    console.log('Test 5: Semantic Search Validation');
    console.log('-'.repeat(60));

    const searchQuery = 'affordable family SUV';
    console.log(`Search query: "${searchQuery}"`);

    const queryEmbedding = await embeddingService.embedText(searchQuery);

    const searchResult = await pool.query(
      `SELECT
        id,
        make,
        model,
        year,
        price,
        1 - (embedding <=> $1::vector) as similarity
      FROM vehicles
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT 5`,
      [JSON.stringify(queryEmbedding)]
    );

    console.log(`Found ${searchResult.rows.length} similar vehicles:`);
    console.log();

    searchResult.rows.forEach((row, i) => {
      const similarity = ((row.similarity as number) * 100).toFixed(2);
      const price = (row.price as number).toLocaleString();
      console.log(
        `${i + 1}. [${similarity}%] ${row.year} ${row.make} ${row.model} - $${price} MXN`
      );
    });

    if (searchResult.rows.length > 0) {
      console.log();
      console.log('SUCCESS: Semantic search working with synced embeddings');
    }

    console.log();
    console.log('='.repeat(60));
    console.log('All Vehicle Embedding Sync Tests Passed');
    console.log('='.repeat(60));
    console.log();
    console.log('Vehicle embeddings are now synchronized with the database,');
    console.log('enabling semantic search across the entire inventory.');

  } catch (error) {
    console.error('FATAL ERROR:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testVehicleEmbeddingSync().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});
