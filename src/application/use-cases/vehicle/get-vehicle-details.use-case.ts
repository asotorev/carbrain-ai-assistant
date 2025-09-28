// Vehicle detail retrieval use case for Clean Architecture application layer
// Handles comprehensive vehicle information gathering with related data

import { Vehicle } from '@domain/entities/vehicle';
import { VehicleService } from '@application/services/vehicle.service';

export interface GetVehicleDetailsRequest {
  vehicleId: string;
  includeSimilar?: boolean;
  similarLimit?: number;
}

export interface GetVehicleDetailsResponse {
  vehicle: Vehicle;
  similarVehicles?: Vehicle[];
}

export class GetVehicleDetailsUseCase {
  constructor(private vehicleService: VehicleService) {}

  async execute(request: GetVehicleDetailsRequest): Promise<GetVehicleDetailsResponse> {
    if (!request.vehicleId) {
      throw new Error('Vehicle ID is required');
    }

    const vehicle = await this.vehicleService.getVehicleById(request.vehicleId);
    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    const response: GetVehicleDetailsResponse = { vehicle };

    if (request.includeSimilar) {
      const limit = Math.min(10, Math.max(1, request.similarLimit || 5));
      response.similarVehicles = await this.vehicleService.getSimilarVehicles(
        request.vehicleId,
        limit
      );
    }

    return response;
  }
}