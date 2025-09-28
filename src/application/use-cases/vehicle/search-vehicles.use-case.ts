// Vehicle search orchestration use case for Clean Architecture application layer
// Handles complex vehicle search workflows with filtering and analytics

import { Vehicle } from '@domain/entities/vehicle';
import { VehicleService } from '@application/services/vehicle.service';
import { VehicleSearchFilters } from '@application/interfaces/vehicle-repository.interface';

export interface SearchVehiclesRequest {
  filters?: VehicleSearchFilters;
  page?: number;
  limit?: number;
  sortBy?: 'price' | 'year' | 'mileage' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchVehiclesResponse {
  vehicles: Vehicle[];
  total: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export class SearchVehiclesUseCase {
  constructor(private vehicleService: VehicleService) {}

  async execute(request: SearchVehiclesRequest): Promise<SearchVehiclesResponse> {
    const page = Math.max(1, request.page || 1);
    const limit = Math.min(100, Math.max(1, request.limit || 20));

    const searchResult = await this.vehicleService.searchVehicles(
      request.filters,
      page,
      limit
    );

    return {
      vehicles: searchResult.vehicles,
      total: searchResult.total,
      page: searchResult.page,
      totalPages: searchResult.totalPages,
      hasNextPage: searchResult.page < searchResult.totalPages,
      hasPreviousPage: searchResult.page > 1
    };
  }
}