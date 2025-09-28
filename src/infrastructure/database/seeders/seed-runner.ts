// Database seeder runner for CarBrain development environment
// Populates database with realistic Mexican automotive market data

import { db } from '../connection';
import { VehicleRepository } from '../repositories/vehicle.repository';
import { vehicleSeedData, createVehicleFromSeedData } from './vehicle-seed-data';

export class SeedRunner {
  private vehicleRepository: VehicleRepository;

  constructor() {
    this.vehicleRepository = new VehicleRepository();
  }

  // Main seeding method - runs all seeders
  async run(): Promise<void> {
    console.log('Starting database seeding process...');

    try {
      // Check if data already exists to avoid duplicates
      const existingVehiclesCount = await this.getVehicleCount();

      if (existingVehiclesCount > 0) {
        console.log(`Database already contains ${existingVehiclesCount} vehicles. Skipping seeding.`);
        console.log('Use --force flag to clear and re-seed data.');
        return;
      }

      // Seed vehicles with realistic Mexican market data
      await this.seedVehicles();

      console.log('Database seeding completed successfully!');
      await this.printSeedingSummary();

    } catch (error) {
      console.error('Error during database seeding:', error);
      throw error;
    }
  }

  // Force re-seed by clearing existing data first
  async forceRun(): Promise<void> {
    console.log('Force re-seeding: clearing existing data...');

    try {
      await this.clearExistingData();
      await this.run();
    } catch (error) {
      console.error('Error during force re-seeding:', error);
      throw error;
    }
  }

  // Seed vehicle inventory data
  private async seedVehicles(): Promise<void> {
    console.log('Seeding vehicle inventory...');

    let seedCount = 0;
    const totalVehicles = vehicleSeedData.length;

    for (const vehicleData of vehicleSeedData) {
      try {
        // Create vehicle entity from seed data
        const vehicle = createVehicleFromSeedData(vehicleData);

        // Save to database using repository
        await this.vehicleRepository.save(vehicle);
        seedCount++;

        // Progress indicator
        const progress = Math.round((seedCount / totalVehicles) * 100);
        process.stdout.write(`\rSeeding vehicles: ${seedCount}/${totalVehicles} (${progress}%)`);

      } catch (error) {
        console.error(`\nError seeding vehicle ${vehicleData.make} ${vehicleData.model}:`, error);
        // Continue with other vehicles even if one fails
      }
    }

    console.log(`\nSuccessfully seeded ${seedCount} vehicles.`);
  }

  // Clear all existing data for fresh seeding
  private async clearExistingData(): Promise<void> {
    console.log('Clearing existing data...');

    try {
      // Clear in reverse dependency order to avoid foreign key constraints
      await db.query('DELETE FROM vehicles');
      await db.query('DELETE FROM vehicle_specifications');
      // Note: We don't delete locations as they might be shared

      console.log('Existing data cleared successfully.');
    } catch (error) {
      console.error('Error clearing existing data:', error);
      throw error;
    }
  }

  // Get current vehicle count for duplicate checking
  private async getVehicleCount(): Promise<number> {
    const result = await db.query('SELECT COUNT(*) as count FROM vehicles');
    return parseInt(result.rows[0].count);
  }

  // Print summary of seeded data
  private async printSeedingSummary(): Promise<void> {
    console.log('\n=== Seeding Summary ===');

    // Get inventory statistics
    const stats = await this.vehicleRepository.getInventoryStats();

    console.log(`Total vehicles: ${stats.total}`);
    console.log(`Available vehicles: ${stats.available}`);
    console.log(`Average price: $${stats.averagePrice.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN'
    })}`);
    console.log(`Average mileage: ${Math.round(stats.averageMileage).toLocaleString()} km`);

    console.log('\nVehicles by make:');
    Object.entries(stats.byMake).forEach(([make, count]) => {
      console.log(`  ${make}: ${count} vehicles`);
    });

    console.log('\nVehicles by condition:');
    Object.entries(stats.byCondition).forEach(([condition, count]) => {
      console.log(`  ${condition}: ${count} vehicles`);
    });

    console.log('\n=== End Summary ===\n');
  }

  // Verify seeded data integrity
  async verifyData(): Promise<boolean> {
    console.log('Verifying seeded data integrity...');

    try {
      // Check for duplicate VINs
      const duplicateVINs = await db.query(`
        SELECT vin, COUNT(*) as count
        FROM vehicles
        GROUP BY vin
        HAVING COUNT(*) > 1
      `);

      if (duplicateVINs.rows.length > 0) {
        console.error('ERROR: Duplicate VINs found:', duplicateVINs.rows);
        return false;
      }

      // Check for vehicles without specifications
      const vehiclesWithoutSpecs = await db.query(`
        SELECT COUNT(*) as count
        FROM vehicles v
        LEFT JOIN vehicle_specifications vs ON v.specification_id = vs.id
        WHERE vs.id IS NULL
      `);

      if (parseInt(vehiclesWithoutSpecs.rows[0].count) > 0) {
        console.error('ERROR: Vehicles found without specifications');
        return false;
      }

      // Check for vehicles without locations
      const vehiclesWithoutLocations = await db.query(`
        SELECT COUNT(*) as count
        FROM vehicles v
        LEFT JOIN locations l ON v.location_id = l.id
        WHERE l.id IS NULL
      `);

      if (parseInt(vehiclesWithoutLocations.rows[0].count) > 0) {
        console.error('ERROR: Vehicles found without locations');
        return false;
      }

      // Check price ranges are realistic for Mexican market
      const priceCheck = await db.query(`
        SELECT COUNT(*) as count
        FROM vehicles
        WHERE price < 100000 OR price > 2000000
      `);

      if (parseInt(priceCheck.rows[0].count) > 0) {
        console.warn('WARNING: Some vehicles have unrealistic prices for Mexican market');
      }

      console.log('Data integrity verification passed!');
      return true;

    } catch (error) {
      console.error('Error during data verification:', error);
      return false;
    }
  }
}

// Command-line interface for seeding
export async function runSeeding(options: { force?: boolean; verify?: boolean } = {}): Promise<void> {
  const seeder = new SeedRunner();

  try {
    if (options.force) {
      await seeder.forceRun();
    } else {
      await seeder.run();
    }

    if (options.verify) {
      await seeder.verifyData();
    }

  } catch (error) {
    console.error('Seeding process failed:', error);
    process.exit(1);
  } finally {
    // Close database connections
    await db.close();
  }
}

// Export for use in other modules
export default SeedRunner;