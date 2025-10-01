// Vehicle business logic orchestration service for Clean Architecture application layer
// Coordinates vehicle operations between domain entities and infrastructure repositories

import { Vehicle } from '@domain/entities/vehicle';
import { PriceRangeVO } from '@domain/value-objects/price-range';
import { VehicleSpecificationVO } from '@domain/value-objects/vehicle-specification';
import {
  IVehicleRepository,
  VehicleSearchFilters,
  VehicleSearchResult
} from '@application/interfaces/vehicle-repository.interface';

export class VehicleService {
  constructor(private vehicleRepository: IVehicleRepository) {}

  async getVehicleById(id: string): Promise<Vehicle | null> {
    if (!id || id.trim().length === 0) {
      throw new Error('Vehicle ID is required');
    }
    return await this.vehicleRepository.findById(id);
  }

  async searchVehicles(
    filters?: VehicleSearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<VehicleSearchResult> {
    if (page < 1) {
      throw new Error('Page number must be greater than 0');
    }
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    return await this.vehicleRepository.search(filters, undefined, { page, limit });
  }

  async getAvailableVehicles(): Promise<Vehicle[]> {
    return await this.vehicleRepository.findAvailableVehicles();
  }

  async getVehiclesByMake(make: string): Promise<Vehicle[]> {
    if (!make || make.trim().length === 0) {
      throw new Error('Vehicle make is required');
    }
    return await this.vehicleRepository.findByMake(make);
  }

  async getVehiclesInPriceRange(minPrice: number, maxPrice: number): Promise<Vehicle[]> {
    if (minPrice < 0 || maxPrice < 0) {
      throw new Error('Price values must be non-negative');
    }
    if (minPrice > maxPrice) {
      throw new Error('Minimum price cannot be greater than maximum price');
    }

    const priceRange = PriceRangeVO.create({ min: minPrice, max: maxPrice, currency: 'MXN' });
    return await this.vehicleRepository.findByPriceRange(priceRange);
  }

  async getFeaturedVehicles(limit: number = 6): Promise<Vehicle[]> {
    if (limit < 1 || limit > 20) {
      throw new Error('Featured vehicles limit must be between 1 and 20');
    }
    return await this.vehicleRepository.findFeaturedVehicles(limit);
  }

  async createVehicle(vehicleData: {
    vin: string;
    make: string;
    model: string;
    year: number;
    price: number;
    mileage: number;
    fuelType: string;
    transmission: string;
    color: string;
    condition?: string;
    description?: string;
    features?: string[];
    images?: string[];
    isAvailable?: boolean;
    isFeatured?: boolean;
    doors?: number;
    seats?: number;
    drivetrain?: string;
    location?: any;
  }): Promise<Vehicle> {
    this.validateVehicleData(vehicleData);

    const specification = VehicleSpecificationVO.create({
      engine: vehicleData.fuelType,
      transmission: vehicleData.transmission,
      fuelType: vehicleData.fuelType,
      drivetrain: vehicleData.drivetrain || 'fwd',
      safetyRating: 5,
      doors: vehicleData.doors || 4,
      seats: vehicleData.seats || 5
    });

    const vehicle = Vehicle.create({
      vin: vehicleData.vin,
      make: vehicleData.make,
      model: vehicleData.model,
      year: vehicleData.year,
      price: vehicleData.price,
      mileage: vehicleData.mileage,
      condition: vehicleData.condition || 'used',
      color: vehicleData.color,
      description: vehicleData.description || '',
      specification: specification.toJSON(),
      images: vehicleData.images || [],
      isAvailable: vehicleData.isAvailable ?? true,
      location: vehicleData.location || {
        address: 'Dealership Location',
        city: 'Mexico City',
        state: 'CDMX',
        postalCode: '01000',
        country: 'MX',
        coordinates: { latitude: 19.4326, longitude: -99.1332 },
        type: 'dealership'
      }
    });

    return await this.vehicleRepository.save(vehicle);
  }

  async updateVehicle(id: string, updates: Partial<{
    price: number;
    mileage: number;
    description: string;
    features: string[];
    images: string[];
    isAvailable: boolean;
    isFeatured: boolean;
  }>): Promise<Vehicle> {
    const existingVehicle = await this.vehicleRepository.findById(id);
    if (!existingVehicle) {
      throw new Error('Vehicle not found');
    }

    let updatedVehicle = existingVehicle;

    if (updates.price !== undefined) {
      updatedVehicle = updatedVehicle.updatePrice(updates.price);
    }

    if (updates.isAvailable !== undefined) {
      updatedVehicle = updates.isAvailable
        ? updatedVehicle.markAsUnavailable() // This will need to be updated when Vehicle entity has correct methods
        : updatedVehicle.markAsUnavailable();
    }

    return await this.vehicleRepository.update(updatedVehicle);
  }

  async deleteVehicle(id: string): Promise<void> {
    const vehicle = await this.vehicleRepository.findById(id);
    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    await this.vehicleRepository.delete(id);
  }

  async getRecentVehicles(days: number = 30): Promise<Vehicle[]> {
    if (days < 1 || days > 365) {
      throw new Error('Days parameter must be between 1 and 365');
    }
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const filters: VehicleSearchFilters = { isAvailable: true };
    const result = await this.vehicleRepository.search(filters);
    return result.vehicles;
  }

  async getSimilarVehicles(vehicleId: string, limit: number = 5): Promise<Vehicle[]> {
    if (limit < 1 || limit > 20) {
      throw new Error('Similar vehicles limit must be between 1 and 20');
    }
    const vehicle = await this.vehicleRepository.findById(vehicleId);
    if (!vehicle) {
      return [];
    }
    const filters: VehicleSearchFilters = {
      make: vehicle.make
    };
    const result = await this.vehicleRepository.search(filters, undefined, { page: 1, limit: limit + 1 });
    return result.vehicles.filter(v => v.id !== vehicleId).slice(0, limit);
  }

  private validateVehicleData(data: any): void {
    if (!data.vin || data.vin.trim().length !== 17) {
      throw new Error('Valid 17-character VIN is required');
    }

    if (!data.make || data.make.trim().length === 0) {
      throw new Error('Vehicle make is required');
    }

    if (!data.model || data.model.trim().length === 0) {
      throw new Error('Vehicle model is required');
    }

    if (!data.year || data.year < 1900 || data.year > new Date().getFullYear() + 1) {
      throw new Error('Valid vehicle year is required');
    }

    if (!data.price || data.price < 0) {
      throw new Error('Valid price is required');
    }

    if (data.mileage < 0) {
      throw new Error('Mileage cannot be negative');
    }

    if (!data.fuelType || data.fuelType.trim().length === 0) {
      throw new Error('Fuel type is required');
    }

    if (!data.transmission || data.transmission.trim().length === 0) {
      throw new Error('Transmission type is required');
    }

    if (!data.color || data.color.trim().length === 0) {
      throw new Error('Vehicle color is required');
    }
  }
}