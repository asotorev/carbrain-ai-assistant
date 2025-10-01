// Vehicle HTTP endpoints controller for Interface Adapters layer
// Translates HTTP requests to application layer services and formats responses

import { Request, Response } from 'express';
import { VehicleService } from '@application/services/vehicle.service';
import { SearchVehiclesUseCase } from '@application/use-cases/vehicle/search-vehicles.use-case';
import { GetVehicleDetailsUseCase } from '@application/use-cases/vehicle/get-vehicle-details.use-case';

export class VehicleController {
  constructor(
    private vehicleService: VehicleService,
    private searchVehiclesUseCase: SearchVehiclesUseCase,
    private getVehicleDetailsUseCase: GetVehicleDetailsUseCase
  ) {}

  async getAllVehicles(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const make = req.query.make as string;
      const model = req.query.model as string;
      const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
      const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
      const isAvailable = req.query.isAvailable === 'true';

      const filters = {
        ...(make && { make }),
        ...(model && { model }),
        ...(minPrice && { priceMin: minPrice }),
        ...(maxPrice && { priceMax: maxPrice }),
        ...(req.query.isAvailable && { isAvailable })
      };

      const result = await this.searchVehiclesUseCase.execute({
        filters,
        page,
        limit
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Vehicles retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve vehicles'
      });
    }
  }

  async getVehicleById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const includeSimilar = req.query.includeSimilar === 'true';

      const result = await this.getVehicleDetailsUseCase.execute({
        vehicleId: id!,
        includeSimilar,
        similarLimit: 5
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Vehicle details retrieved successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Vehicle not found') {
        res.status(404).json({
          success: false,
          error: error.message,
          message: 'Vehicle not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          message: 'Failed to retrieve vehicle details'
        });
      }
    }
  }

  async createVehicle(req: Request, res: Response): Promise<void> {
    try {
      const vehicleData = req.body;

      const vehicle = await this.vehicleService.createVehicle(vehicleData);

      res.status(201).json({
        success: true,
        data: vehicle,
        message: 'Vehicle created successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('required')) {
        res.status(400).json({
          success: false,
          error: error.message,
          message: 'Invalid vehicle data provided'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          message: 'Failed to create vehicle'
        });
      }
    }
  }

  async updateVehicle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      const vehicle = await this.vehicleService.updateVehicle(id!, updates);

      res.status(200).json({
        success: true,
        data: vehicle,
        message: 'Vehicle updated successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Vehicle not found') {
        res.status(404).json({
          success: false,
          error: error.message,
          message: 'Vehicle not found'
        });
      } else if (error instanceof Error && error.message.includes('required')) {
        res.status(400).json({
          success: false,
          error: error.message,
          message: 'Invalid update data provided'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          message: 'Failed to update vehicle'
        });
      }
    }
  }

  async deleteVehicle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await this.vehicleService.deleteVehicle(id!);

      res.status(200).json({
        success: true,
        message: 'Vehicle deleted successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Vehicle not found') {
        res.status(404).json({
          success: false,
          error: error.message,
          message: 'Vehicle not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          message: 'Failed to delete vehicle'
        });
      }
    }
  }

  async getAvailableVehicles(req: Request, res: Response): Promise<void> {
    try {
      const vehicles = await this.vehicleService.getAvailableVehicles();

      res.status(200).json({
        success: true,
        data: vehicles,
        message: 'Available vehicles retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve available vehicles'
      });
    }
  }

  async getFeaturedVehicles(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 6;
      const vehicles = await this.vehicleService.getFeaturedVehicles(limit);

      res.status(200).json({
        success: true,
        data: vehicles,
        message: 'Featured vehicles retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve featured vehicles'
      });
    }
  }

  async getVehiclesByMake(req: Request, res: Response): Promise<void> {
    try {
      const { make } = req.params;
      const vehicles = await this.vehicleService.getVehiclesByMake(make!);

      res.status(200).json({
        success: true,
        data: vehicles,
        message: `Vehicles by ${make} retrieved successfully`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve vehicles by make'
      });
    }
  }

  async getVehiclesInPriceRange(req: Request, res: Response): Promise<void> {
    try {
      const { minPrice, maxPrice } = req.query;

      if (!minPrice || !maxPrice) {
        res.status(400).json({
          success: false,
          error: 'Both minPrice and maxPrice are required',
          message: 'Invalid price range parameters'
        });
        return;
      }

      const vehicles = await this.vehicleService.getVehiclesInPriceRange(
        parseFloat(minPrice as string),
        parseFloat(maxPrice as string)
      );

      res.status(200).json({
        success: true,
        data: vehicles,
        message: 'Vehicles in price range retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve vehicles in price range'
      });
    }
  }
}