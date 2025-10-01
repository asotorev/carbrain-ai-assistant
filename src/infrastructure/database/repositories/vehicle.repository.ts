// Vehicle repository implementation for PostgreSQL database
// Implements vehicle data access with Clean Architecture principles and normalized schema

import { Vehicle } from '@domain/entities/vehicle';
import {
  IVehicleRepository,
  VehicleSearchFilters,
  VehicleSearchResult,
  VehicleSortOptions,
  PaginationOptions
} from '@application/interfaces/vehicle-repository.interface';
import { DatabaseConnection } from '@infrastructure/database/connection';

export class VehicleRepository implements IVehicleRepository {
  constructor(private db: DatabaseConnection) {}

  private getBaseQuery(): string {
    return `
      SELECT
        v.*,
        vs.engine, vs.transmission, vs.fuel_type, vs.drivetrain,
        vs.doors, vs.seats, vs.safety_features, vs.tech_features, vs.comfort_features,
        l.address, l.city, l.state, l.postal_code, l.country,
        l.latitude, l.longitude, l.type as location_type
      FROM vehicles v
      LEFT JOIN vehicle_specifications vs ON v.specification_id = vs.id
      LEFT JOIN locations l ON v.location_id = l.id
    `;
  }

  async findById(id: string): Promise<Vehicle | null> {
    const query = this.getBaseQuery() + 'WHERE v.id = $1';
    const result = await this.db.query<any>(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToVehicle(result.rows[0]);
  }

  async findByVin(vin: string): Promise<Vehicle | null> {
    const query = this.getBaseQuery() + 'WHERE v.vin = $1';
    const result = await this.db.query<any>(query, [vin]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToVehicle(result.rows[0]);
  }

  async search(
    filters?: VehicleSearchFilters,
    sort?: VehicleSortOptions,
    pagination?: PaginationOptions
  ): Promise<VehicleSearchResult> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.make) {
      whereClause += ` AND LOWER(v.make) = LOWER($${paramIndex})`;
      params.push(filters.make);
      paramIndex++;
    }

    if (filters?.model) {
      whereClause += ` AND LOWER(v.model) = LOWER($${paramIndex})`;
      params.push(filters.model);
      paramIndex++;
    }

    if (filters?.priceRange) {
      whereClause += ` AND v.price >= $${paramIndex} AND v.price <= $${paramIndex + 1}`;
      params.push(filters.priceRange.min, filters.priceRange.max);
      paramIndex += 2;
    }

    if (filters?.isAvailable !== undefined) {
      whereClause += ` AND v.is_available = $${paramIndex}`;
      params.push(filters.isAvailable);
      paramIndex++;
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM vehicles v
      LEFT JOIN vehicle_specifications vs ON v.specification_id = vs.id
      LEFT JOIN locations l ON v.location_id = l.id
      ${whereClause}
    `;
    const countResult = await this.db.query<any>(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    const query = `
      ${this.getBaseQuery()}
      ${whereClause}
      ORDER BY v.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await this.db.query<any>(query, params);
    const vehicles = result.rows.map(row => this.mapRowToVehicle(row));

    return {
      vehicles,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async save(vehicle: Vehicle): Promise<Vehicle> {
    const existingVehicle = await this.findById(vehicle.id);
    if (existingVehicle) {
      return this.update(vehicle);
    } else {
      return this.create(vehicle);
    }
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM vehicles WHERE id = $1';
    await this.db.query(query, [id]);
  }

  async findFeaturedVehicles(limit: number = 6): Promise<Vehicle[]> {
    const query = this.getBaseQuery() + 'WHERE v.is_available = true ORDER BY v.created_at DESC LIMIT $1';
    const result = await this.db.query<any>(query, [limit]);
    return result.rows.map(row => this.mapRowToVehicle(row));
  }

  async findByMake(make: string): Promise<Vehicle[]> {
    const query = this.getBaseQuery() + 'WHERE LOWER(v.make) = LOWER($1) ORDER BY v.model, v.year DESC';
    const result = await this.db.query<any>(query, [make]);
    return result.rows.map(row => this.mapRowToVehicle(row));
  }

  async findByPriceRange(priceRange: { min: number; max: number }): Promise<Vehicle[]> {
    const query = this.getBaseQuery() + 'WHERE v.price BETWEEN $1 AND $2 ORDER BY v.price ASC';
    const result = await this.db.query<any>(query, [priceRange.min, priceRange.max]);
    return result.rows.map(row => this.mapRowToVehicle(row));
  }

  async findInPriceRange(minPrice: number, maxPrice: number): Promise<Vehicle[]> {
    const query = this.getBaseQuery() + 'WHERE v.price BETWEEN $1 AND $2 ORDER BY v.price ASC';
    const result = await this.db.query<any>(query, [minPrice, maxPrice]);
    return result.rows.map(row => this.mapRowToVehicle(row));
  }

  private async create(vehicle: Vehicle): Promise<Vehicle> {
    return this.db.transaction(async (client) => {
      // First create location if needed
      const locationQuery = `
        INSERT INTO locations (address, city, state, postal_code, country, latitude, longitude, type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `;
      const locationResult = await client.query(locationQuery, [
        vehicle.location.address,
        vehicle.location.city,
        vehicle.location.state,
        vehicle.location.postalCode,
        vehicle.location.country,
        vehicle.location.coordinates.latitude,
        vehicle.location.coordinates.longitude,
        vehicle.location.type
      ]);
      const locationId = locationResult.rows[0].id;

      // Create vehicle specification
      const specQuery = `
        INSERT INTO vehicle_specifications (
          engine, transmission, fuel_type, drivetrain, doors, seats,
          safety_features, tech_features, comfort_features
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `;
      const specResult = await client.query(specQuery, [
        vehicle.specification.engine,
        vehicle.specification.transmission,
        vehicle.specification.fuelType,
        vehicle.specification.drivetrain,
        vehicle.specification.doors,
        vehicle.specification.seats,
        JSON.stringify(vehicle.specification.safetyFeatures),
        JSON.stringify(vehicle.specification.techFeatures),
        JSON.stringify(vehicle.specification.comfortFeatures)
      ]);
      const specId = specResult.rows[0].id;

      // Create vehicle
      const vehicleQuery = `
        INSERT INTO vehicles (
          id, make, model, year, price, mileage, condition, vin, color,
          is_available, images, description, specification_id, location_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;
      const vehicleResult = await client.query(vehicleQuery, [
        vehicle.id,
        vehicle.make,
        vehicle.model,
        vehicle.year,
        vehicle.price,
        vehicle.mileage,
        vehicle.condition,
        vehicle.vin,
        vehicle.color,
        vehicle.isAvailable,
        JSON.stringify(vehicle.images),
        vehicle.description,
        specId,
        locationId
      ]);

      // Return the created vehicle with joined data
      const fullQuery = this.getBaseQuery() + 'WHERE v.id = $1';
      const fullResult = await client.query(fullQuery, [vehicle.id]);
      return this.mapRowToVehicle(fullResult.rows[0]);
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

    const result = await this.db.query<any>(query, [
      vehicle.id,
      vehicle.make,
      vehicle.model,
      vehicle.year,
      vehicle.price,
      vehicle.mileage,
      vehicle.condition,
      vehicle.color,
      vehicle.isAvailable,
      JSON.stringify(vehicle.images),
      vehicle.description
    ]);

    return this.mapRowToVehicle(result.rows[0]);
  }

  private mapRowToVehicle(row: any): Vehicle {
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
      images: typeof row.images === 'string' ? JSON.parse(row.images || '[]') : (row.images || []),
      description: row.description,
      specification: {
        engine: row.engine || '',
        transmission: row.transmission || 'automatic',
        fuelType: row.fuel_type || 'gasoline',
        drivetrain: row.drivetrain || 'fwd',
        doors: row.doors || 4,
        seats: row.seats || 5,
        safetyFeatures: row.safety_features || [],
        techFeatures: row.tech_features || [],
        comfortFeatures: row.comfort_features || []
      },
      location: {
        address: row.address || '',
        city: row.city || '',
        state: row.state || '',
        postalCode: row.postal_code || '',
        country: row.country || 'MX',
        latitude: parseFloat(row.latitude) || 0,
        longitude: parseFloat(row.longitude) || 0,
        type: row.location_type || 'dealership'
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  async findAvailableVehicles(locationId?: string): Promise<Vehicle[]> {
    let query = this.getBaseQuery() + ' WHERE v.is_available = true';
    const params: any[] = [];

    if (locationId) {
      query += ' AND v.location_id = $1';
      params.push(locationId);
    }

    query += ' ORDER BY v.created_at DESC';
    const result = await this.db.query<any>(query, params);
    return result.rows.map(row => this.mapRowToVehicle(row));
  }

  async findSimilarVehicles(vehicleId: string, limit: number = 5): Promise<Vehicle[]> {
    const vehicle = await this.findById(vehicleId);
    if (!vehicle) return [];

    const query = this.getBaseQuery() + `
      WHERE v.id != $1
        AND v.make = $2
        AND v.is_available = true
        AND ABS(v.price - $3) < $4
      ORDER BY ABS(v.price - $3) ASC
      LIMIT $5
    `;

    const priceRange = vehicle.price * 0.15;
    const result = await this.db.query<any>(query, [vehicleId, vehicle.make, vehicle.price, priceRange, limit]);
    return result.rows.map(row => this.mapRowToVehicle(row));
  }

  async findRecommendedForCustomer(customerId: string, limit: number = 5): Promise<Vehicle[]> {
    const query = this.getBaseQuery() + ' WHERE v.is_available = true ORDER BY v.created_at DESC LIMIT $1';
    const result = await this.db.query<any>(query, [limit]);
    return result.rows.map(row => this.mapRowToVehicle(row));
  }

  async markAsUnavailable(id: string): Promise<void> {
    const query = 'UPDATE vehicles SET is_available = false, updated_at = NOW() WHERE id = $1';
    await this.db.query(query, [id]);
  }

  async markAsAvailable(id: string): Promise<void> {
    const query = 'UPDATE vehicles SET is_available = true, updated_at = NOW() WHERE id = $1';
    await this.db.query(query, [id]);
  }

  async updatePrice(id: string, newPrice: number): Promise<Vehicle> {
    const query = 'UPDATE vehicles SET price = $2, updated_at = NOW() WHERE id = $1';
    await this.db.query(query, [id, newPrice]);
    const vehicle = await this.findById(id);
    if (!vehicle) throw new Error('Vehicle not found');
    return vehicle;
  }

  async getInventoryStats(): Promise<{
    total: number;
    available: number;
    byMake: Record<string, number>;
    byCondition: Record<string, number>;
    averagePrice: number;
    averageMileage: number;
  }> {
    const queries = [
      'SELECT COUNT(*) as total FROM vehicles',
      'SELECT COUNT(*) as available FROM vehicles WHERE is_available = true',
      'SELECT make, COUNT(*) as count FROM vehicles GROUP BY make',
      'SELECT condition, COUNT(*) as count FROM vehicles GROUP BY condition',
      'SELECT AVG(price) as avg_price FROM vehicles WHERE is_available = true',
      'SELECT AVG(mileage) as avg_mileage FROM vehicles WHERE is_available = true'
    ];

    const [totalResult, availableResult, makeResult, conditionResult, priceResult, mileageResult] =
      await Promise.all(queries.map(q => this.db.query<any>(q)));

    const byMake: Record<string, number> = {};
    makeResult?.rows.forEach((row: any) => {
      byMake[row.make] = parseInt(row.count);
    });

    const byCondition: Record<string, number> = {};
    conditionResult?.rows.forEach((row: any) => {
      byCondition[row.condition] = parseInt(row.count);
    });

    return {
      total: parseInt(totalResult?.rows[0]?.total || '0'),
      available: parseInt(availableResult?.rows[0]?.available || '0'),
      byMake,
      byCondition,
      averagePrice: parseFloat(priceResult?.rows[0]?.avg_price || '0'),
      averageMileage: parseFloat(mileageResult?.rows[0]?.avg_mileage || '0')
    };
  }

  async findByIds(ids: string[]): Promise<Vehicle[]> {
    if (ids.length === 0) return [];
    const query = this.getBaseQuery() + ' WHERE v.id = ANY($1::uuid[])';
    const result = await this.db.query<any>(query, [ids]);
    return result.rows.map(row => this.mapRowToVehicle(row));
  }

  async bulkUpdateAvailability(ids: string[], isAvailable: boolean): Promise<void> {
    if (ids.length === 0) return;
    const query = 'UPDATE vehicles SET is_available = $1, updated_at = NOW() WHERE id = ANY($2::uuid[])';
    await this.db.query(query, [isAvailable, ids]);
  }
}