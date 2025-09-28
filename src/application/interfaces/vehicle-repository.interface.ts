// Vehicle repository interface for Clean Architecture application layer
// Defines contract for vehicle data access without infrastructure dependencies

import { Vehicle } from '@domain/entities/vehicle';
import { PriceRangeVO } from '@domain/value-objects/price-range';

// Search filters for vehicle queries
export interface VehicleSearchFilters {
  make?: string;                    // Filter by manufacturer (Honda, Toyota, etc.)
  model?: string;                   // Filter by specific model
  yearMin?: number;                 // Minimum year (e.g., 2020)
  yearMax?: number;                 // Maximum year (e.g., 2024)
  priceRange?: PriceRangeVO;        // Price range with currency
  maxMileage?: number;              // Maximum mileage filter
  condition?: 'new' | 'certified_pre_owned' | 'used' | 'salvage';
  fuelType?: 'gasoline' | 'diesel' | 'hybrid' | 'electric';
  transmission?: 'manual' | 'automatic' | 'cvt';
  isAvailable?: boolean;            // Only show available vehicles
  locationId?: string;              // Filter by dealership location
  features?: string[];              // Required features (e.g., ['bluetooth', 'backup_camera'])
}

// Sorting options for search results
export interface VehicleSortOptions {
  field: 'price' | 'year' | 'mileage' | 'make' | 'model' | 'created_at';
  direction: 'asc' | 'desc';
}

// Pagination for large result sets
export interface PaginationOptions {
  page: number;                     // Page number (1-based)
  limit: number;                    // Items per page
}

// Search result with pagination metadata
export interface VehicleSearchResult {
  vehicles: Vehicle[];              // Found vehicles
  total: number;                    // Total count (for pagination)
  page: number;                     // Current page
  totalPages: number;               // Total pages available
}

// Repository interface following Clean Architecture principles
export interface IVehicleRepository {
  // Basic CRUD operations
  findById(id: string): Promise<Vehicle | null>;
  findByVin(vin: string): Promise<Vehicle | null>;
  save(vehicle: Vehicle): Promise<Vehicle>;
  update(vehicle: Vehicle): Promise<Vehicle>;
  delete(id: string): Promise<void>;

  // Search and filtering operations
  search(
    filters?: VehicleSearchFilters,
    sort?: VehicleSortOptions,
    pagination?: PaginationOptions
  ): Promise<VehicleSearchResult>;

  // Business-specific queries
  findAvailableVehicles(locationId?: string): Promise<Vehicle[]>;
  findSimilarVehicles(vehicleId: string, limit?: number): Promise<Vehicle[]>;
  findByPriceRange(priceRange: PriceRangeVO): Promise<Vehicle[]>;
  findRecommendedForCustomer(customerId: string, limit?: number): Promise<Vehicle[]>;

  // Inventory management
  markAsUnavailable(id: string): Promise<void>;
  markAsAvailable(id: string): Promise<void>;
  updatePrice(id: string, newPrice: number): Promise<Vehicle>;

  // Analytics and reporting
  getInventoryStats(): Promise<{
    total: number;
    available: number;
    byMake: Record<string, number>;
    byCondition: Record<string, number>;
    averagePrice: number;
    averageMileage: number;
  }>;

  // Bulk operations for efficiency
  findByIds(ids: string[]): Promise<Vehicle[]>;
  bulkUpdateAvailability(ids: string[], isAvailable: boolean): Promise<void>;
}