// Test script for pgvector extension and vector operations
// Validates vector storage, similarity search, and index performance

import { Pool } from 'pg';
import { OllamaEmbeddingService } from '../src/infrastructure/ai/embeddings/ollama-embedding-service';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'carbrain',
  user: process.env.DB_USER || 'carbrain_user',
  password: process.env.DB_PASSWORD || 'carbrain_pass'
});

async function testPgvector(): Promise<void> {
  console.log('='.repeat(60));
  console.log('pgvector Extension Test');
  console.log('='.repeat(60));
  console.log();

  try {
    // Test 1: Verify pgvector extension is installed
    console.log('Test 1: pgvector Extension Check');
    console.log('-'.repeat(60));

    const extResult = await pool.query(
      "SELECT * FROM pg_extension WHERE extname = 'vector'"
    );

    if (extResult.rows.length === 0) {
      console.error('ERROR: pgvector extension not installed');
      console.log('Run migration: psql -U carbrain_user -d carbrain -f src/infrastructure/database/migrations/003_add_pgvector_support.sql');
      process.exit(1);
    }

    console.log('SUCCESS: pgvector extension is installed');
    console.log(`Version: ${extResult.rows[0]?.extversion || 'unknown'}`);
    console.log();

    // Test 2: Verify embedding column exists
    console.log('Test 2: Embedding Column Verification');
    console.log('-'.repeat(60));

    const colResult = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'vehicles' AND column_name = 'embedding'
    `);

    if (colResult.rows.length === 0) {
      console.error('ERROR: embedding column not found in vehicles table');
      process.exit(1);
    }

    console.log('SUCCESS: embedding column exists');
    console.log(`Column type: ${colResult.rows[0]?.data_type || 'unknown'}`);
    console.log();

    // Test 3: Verify vector index exists
    console.log('Test 3: Vector Index Verification');
    console.log('-'.repeat(60));

    const idxResult = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'vehicles' AND indexname = 'vehicles_embedding_idx'
    `);

    if (idxResult.rows.length === 0) {
      console.error('ERROR: vehicles_embedding_idx not found');
      process.exit(1);
    }

    console.log('SUCCESS: Vector index exists');
    console.log(`Index: ${idxResult.rows[0]?.indexname || 'unknown'}`);
    console.log();

    // Test 4: Generate and store vector embedding
    console.log('Test 4: Vector Storage Test');
    console.log('-'.repeat(60));

    const embeddingService = new OllamaEmbeddingService();
    const isAvailable = await embeddingService.isAvailable();

    if (!isAvailable) {
      console.error('ERROR: Embedding service not available');
      process.exit(1);
    }

    const testDescription = 'Honda CR-V reliable family SUV with excellent safety ratings';
    console.log(`Test description: "${testDescription}"`);
    console.log('Generating embedding...');

    const embedding = await embeddingService.embedText(testDescription);
    console.log(`Embedding generated: ${embedding.length} dimensions`);

    // Insert test vehicle with embedding
    const insertResult = await pool.query(`
      INSERT INTO vehicles (make, model, year, price, status, mileage, vin, description, embedding)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector)
      RETURNING id, make, model
    `, [
      'Honda',
      'CR-V',
      2024,
      35000,
      'available',
      0,
      'TEST' + Date.now(),
      testDescription,
      JSON.stringify(embedding)
    ]);

    const vehicleId = insertResult.rows[0]?.id;
    console.log(`SUCCESS: Vehicle stored with embedding`);
    console.log(`Vehicle ID: ${vehicleId}`);
    console.log();

    // Test 5: Vector similarity search
    console.log('Test 5: Semantic Similarity Search');
    console.log('-'.repeat(60));

    const searchQuery = 'safe family vehicle';
    console.log(`Search query: "${searchQuery}"`);
    console.log('Generating query embedding...');

    const queryEmbedding = await embeddingService.embedText(searchQuery);

    const searchResult = await pool.query(`
      SELECT
        id,
        make,
        model,
        year,
        description,
        1 - (embedding <=> $1::vector) as similarity
      FROM vehicles
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT 3
    `, [JSON.stringify(queryEmbedding)]);

    console.log(`Found ${searchResult.rows.length} similar vehicles:`);
    console.log();

    searchResult.rows.forEach((row, i) => {
      const similarity = ((row.similarity as number) * 100).toFixed(2);
      console.log(`${i + 1}. ${row.make} ${row.model} ${row.year}`);
      console.log(`   Similarity: ${similarity}%`);
      console.log(`   Description: ${row.description || 'N/A'}`);
      console.log();
    });

    if (searchResult.rows.length > 0) {
      console.log('SUCCESS: Semantic search working');
    }

    // Cleanup test vehicle
    await pool.query('DELETE FROM vehicles WHERE id = $1', [vehicleId]);
    console.log(`Test vehicle ${vehicleId} cleaned up`);

    console.log();
    console.log('='.repeat(60));
    console.log('All pgvector Tests Passed');
    console.log('='.repeat(60));
    console.log();
    console.log('The database can now store and search vectors for');
    console.log('semantic vehicle search using natural language queries.');

  } catch (error) {
    console.error('FATAL ERROR:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testPgvector().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});
