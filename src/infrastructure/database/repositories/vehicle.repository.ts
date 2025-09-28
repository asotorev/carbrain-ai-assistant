// PostgreSQL implementation of vehicle repository interface
// Handles vehicle data persistence and complex automotive queries

import { QueryResult } from 'pg';
import { Vehicle } from '@domain/entities/vehicle';
import { VehicleSpecificationVO } from '@domain/value-objects/vehicle-specification';
import { LocationVO } from '@domain/value-objects/location';
import { PriceRangeVO } from '@domain/value-objects/price-range';
import {
  IVehicleRepository,
  VehicleSearchFilters,
  VehicleSortOptions,
  PaginationOptions,
  VehicleSearchResult
} from '@application/interfaces/vehicle-repository.interface';
import { db } from '../connection';

export class VehicleRepository implements IVehicleRepository {

  // Basic CRUD operations
  async findById(id: string): Promise<Vehicle | null> {
    const query = `
      SELECT v.*, vs.*, l.*
      FROM vehicles v
      JOIN vehicle_specifications vs ON v.specification_id = vs.id
      JOIN locations l ON v.location_id = l.id
      WHERE v.id = $1
    `;

    const result = await db.query(query, [id]);
    return result.rows.length > 0 ? this.mapRowToVehicle(result.rows[0]) : null;
  }

  async findByVin(vin: string): Promise<Vehicle | null> {
    const query = `
      SELECT v.*, vs.*, l.*
      FROM vehicles v
      JOIN vehicle_specifications vs ON v.specification_id = vs.id
      JOIN locations l ON v.location_id = l.id
      WHERE v.vin = $1
    `;

    const result = await db.query(query, [vin]);
    return result.rows.length > 0 ? this.mapRowToVehicle(result.rows[0]) : null;
  }

  async save(vehicle: Vehicle): Promise<Vehicle> {
    return await db.transaction(async (client) => {
      // Insert vehicle specification first
      const specData = vehicle.specification.toJSON();
      const specQuery = `
        INSERT INTO vehicle_specifications (
          id, engine, transmission, fuel_type, drivetrain, doors, seats,
          safety_features, tech_features, comfort_features
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `;

      const specId = crypto.randomUUID();
      await client.query(specQuery, [
        specId, specData.engine, specData.transmission, specData.fuelType,
        specData.drivetrain, specData.doors, specData.seats,
        JSON.stringify(specData.safetyFeatures),
        JSON.stringify(specData.techFeatures),
        JSON.stringify(specData.comfortFeatures)
      ]);

      // Insert location if not exists
      const locationData = vehicle.location.toJSON();
      const locationQuery = `
        INSERT INTO locations (
          id, address, city, state, postal_code, country, latitude, longitude, type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING
        RETURNING id
      `;

      const locationId = crypto.randomUUID();
      await client.query(locationQuery, [
        locationId, locationData.address, locationData.city, locationData.state,
        locationData.postalCode, locationData.country, locationData.latitude,
        locationData.longitude, locationData.type
      ]);

      // Insert vehicle
      const vehicleQuery = `
        INSERT INTO vehicles (
          id, make, model, year, price, mileage, condition, vin, color,
          is_available, images, description, specification_id, location_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;

      await client.query(vehicleQuery, [
        vehicle.id, vehicle.make, vehicle.model, vehicle.year, vehicle.price,
        vehicle.mileage, vehicle.condition, vehicle.vin, vehicle.color,
        vehicle.isAvailable, JSON.stringify(vehicle.images), vehicle.description,
        specId, locationId
      ]);

      return vehicle;
    });
  }

  async update(vehicle: Vehicle): Promise<Vehicle> {
    const query = `
      UPDATE vehicles SET
        make = $2, model = $3, year = $4, price = $5, mileage = $6,
        condition = $7, color = $8, is_available = $9, images = $10,
        description = $11, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    await db.query(query, [
      vehicle.id, vehicle.make, vehicle.model, vehicle.year, vehicle.price,
      vehicle.mileage, vehicle.condition, vehicle.color, vehicle.isAvailable,
      JSON.stringify(vehicle.images), vehicle.description
    ]);

    return vehicle;
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM vehicles WHERE id = $1';
    await db.query(query, [id]);
  }

  // Search and filtering operations
  async search(
    filters?: VehicleSearchFilters,
    sort?: VehicleSortOptions,
    pagination?: PaginationOptions
  ): Promise<VehicleSearchResult> {
    let query = `
      SELECT v.*, vs.*, l.*
      FROM vehicles v
      JOIN vehicle_specifications vs ON v.specification_id = vs.id
      JOIN locations l ON v.location_id = l.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (filters) {
      if (filters.make) {
        query += ` AND v.make ILIKE $${paramIndex}`;
        params.push(`%${filters.make}%`);
        paramIndex++;
      }

      if (filters.model) {
        query += ` AND v.model ILIKE $${paramIndex}`;
        params.push(`%${filters.model}%`);
        paramIndex++;
      }

      if (filters.yearMin) {
        query += ` AND v.year >= $${paramIndex}`;
        params.push(filters.yearMin);
        paramIndex++;
      }

      if (filters.yearMax) {
        query += ` AND v.year <= $${paramIndex}`;
        params.push(filters.yearMax);
        paramIndex++;
      }

      if (filters.priceRange) {
        query += ` AND v.price BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        params.push(filters.priceRange.min, filters.priceRange.max);
        paramIndex += 2;
      }

      if (filters.maxMileage) {
        query += ` AND v.mileage <= $${paramIndex}`;
        params.push(filters.maxMileage);
        paramIndex++;
      }

      if (filters.condition) {
        query += ` AND v.condition = $${paramIndex}`;
        params.push(filters.condition);
        paramIndex++;
      }

      if (filters.fuelType) {
        query += ` AND vs.fuel_type = $${paramIndex}`;
        params.push(filters.fuelType);
        paramIndex++;
      }

      if (filters.transmission) {
        query += ` AND vs.transmission = $${paramIndex}`;
        params.push(filters.transmission);
        paramIndex++;
      }

      if (filters.isAvailable !== undefined) {
        query += ` AND v.is_available = $${paramIndex}`;
        params.push(filters.isAvailable);
        paramIndex++;
      }

      if (filters.locationId) {
        query += ` AND v.location_id = $${paramIndex}`;
        params.push(filters.locationId);
        paramIndex++;
      }
    }

    // Get total count for pagination
    const countQuery = query.replace('SELECT v.*, vs.*, l.*', 'SELECT COUNT(*)');
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Apply sorting
    if (sort) {
      const sortField = sort.field === 'created_at' ? 'v.created_at' : `v.${sort.field}`;
      query += ` ORDER BY ${sortField} ${sort.direction.toUpperCase()}`;
    } else {
      query += ` ORDER BY v.created_at DESC`;  // Default sort
    }

    // Apply pagination
    if (pagination) {
      const offset = (pagination.page - 1) * pagination.limit;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(pagination.limit, offset);
    }

    const result = await db.query(query, params);
    const vehicles = result.rows.map(row => this.mapRowToVehicle(row));

    const totalPages = pagination ? Math.ceil(total / pagination.limit) : 1;
    const currentPage = pagination?.page || 1;

    return {
      vehicles,
      total,
      page: currentPage,
      totalPages
    };
  }

  // Business-specific queries
  async findAvailableVehicles(locationId?: string): Promise<Vehicle[]> {
    const filters: VehicleSearchFilters = { isAvailable: true };
    if (locationId) filters.locationId = locationId;

    const result = await this.search(filters);
    return result.vehicles;
  }

  async findSimilarVehicles(vehicleId: string, limit = 5): Promise<Vehicle[]> {
    const vehicle = await this.findById(vehicleId);
    if (!vehicle) return [];

    const filters: VehicleSearchFilters = {
      make: vehicle.make,
      isAvailable: true
    };

    const result = await this.search(filters, undefined, { page: 1, limit });
    return result.vehicles.filter(v => v.id !== vehicleId);
  }

  async findByPriceRange(priceRange: PriceRangeVO): Promise<Vehicle[]> {
    const filters: VehicleSearchFilters = { priceRange, isAvailable: true };
    const result = await this.search(filters);
    return result.vehicles;
  }

  async findRecommendedForCustomer(customerId: string, limit = 10): Promise<Vehicle[]> {
    // Simplified recommendation: find vehicles in customer's budget
    // In real implementation, this would use ML algorithms
    const customerQuery = `
      SELECT budget_min, budget_max FROM customers WHERE id = $1
    `;
    const customerResult = await db.query(customerQuery, [customerId]);

    if (customerResult.rows.length === 0) return [];

    const { budget_min, budget_max } = customerResult.rows[0];
    const priceRange = PriceRangeVO.create({ min: budget_min, max: budget_max, currency: 'MXN' });

    const result = await this.search(
      { priceRange, isAvailable: true },
      { field: 'price', direction: 'asc' },
      { page: 1, limit }
    );

    return result.vehicles;
  }

  // Inventory management
  async markAsUnavailable(id: string): Promise<void> {
    const query = 'UPDATE vehicles SET is_available = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1';
    await db.query(query, [id]);
  }

  async markAsAvailable(id: string): Promise<void> {
    const query = 'UPDATE vehicles SET is_available = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1';
    await db.query(query, [id]);
  }

  async updatePrice(id: string, newPrice: number): Promise<Vehicle> {
    const query = `
      UPDATE vehicles SET price = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 RETURNING *
    `;
    await db.query(query, [id, newPrice]);

    const vehicle = await this.findById(id);
    if (!vehicle) throw new Error('Vehicle not found after price update');
    return vehicle;
  }

  // Analytics and reporting
  async getInventoryStats(): Promise<{
    total: number;
    available: number;
    byMake: Record<string, number>;
    byCondition: Record<string, number>;
    averagePrice: number;
    averageMileage: number;
  }> {
    const statsQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_available = true) as available,
        AVG(price) as average_price,
        AVG(mileage) as average_mileage
      FROM vehicles
    `;

    const makeQuery = `
      SELECT make, COUNT(*) as count
      FROM vehicles
      GROUP BY make
      ORDER BY count DESC
    `;

    const conditionQuery = `
      SELECT condition, COUNT(*) as count
      FROM vehicles
      GROUP BY condition
    `;

    const [statsResult, makeResult, conditionResult] = await Promise.all([
      db.query(statsQuery),
      db.query(makeQuery),
      db.query(conditionQuery)
    ]);

    const stats = statsResult.rows[0];
    const byMake: Record<string, number> = {};
    const byCondition: Record<string, number> = {};

    makeResult.rows.forEach(row => {
      byMake[row.make] = parseInt(row.count);
    });

    conditionResult.rows.forEach(row => {
      byCondition[row.condition] = parseInt(row.count);
    });

    return {
      total: parseInt(stats.total),
      available: parseInt(stats.available),
      byMake,
      byCondition,
      averagePrice: parseFloat(stats.average_price) || 0,
      averageMileage: parseFloat(stats.average_mileage) || 0
    };
  }

  // Bulk operations
  async findByIds(ids: string[]): Promise<Vehicle[]> {
    if (ids.length === 0) return [];

    const query = `
      SELECT v.*, vs.*, l.*
      FROM vehicles v
      JOIN vehicle_specifications vs ON v.specification_id = vs.id
      JOIN locations l ON v.location_id = l.id
      WHERE v.id = ANY($1)
    `;

    const result = await db.query(query, [ids]);
    return result.rows.map(row => this.mapRowToVehicle(row));
  }

  async bulkUpdateAvailability(ids: string[], isAvailable: boolean): Promise<void> {
    if (ids.length === 0) return;

    const query = `
      UPDATE vehicles
      SET is_available = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($2)
    `;
    await db.query(query, [isAvailable, ids]);
  }

  // Helper method to map database row to Vehicle entity
  private mapRowToVehicle(row: any): Vehicle {
    const specification = VehicleSpecificationVO.create({
      engine: row.engine,
      transmission: row.transmission,
      fuelType: row.fuel_type,
      drivetrain: row.drivetrain,
      doors: row.doors,
      seats: row.seats,
      safetyFeatures: row.safety_features || [],
      techFeatures: row.tech_features || [],
      comfortFeatures: row.comfort_features || []
    });

    const location = LocationVO.create({
      address: row.address,
      city: row.city,
      state: row.state,
      postalCode: row.postal_code,
      country: row.country,
      latitude: row.latitude,
      longitude: row.longitude,
      type: row.type
    });

    return Vehicle.create({
      id: row.id,
      make: row.make,
      model: row.model,
      year: row.year,
      price: parseFloat(row.price),
      mileage: row.mileage,
      condition: row.condition,
      vin: row.vin,
      color: row.color,
      isAvailable: row.is_available,
      images: row.images || [],
      description: row.description,
      specification: specification.toJSON(),
      location: location.toJSON(),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}