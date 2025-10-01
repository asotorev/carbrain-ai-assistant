// Vehicle API routes configuration for Express router
// Defines HTTP endpoints and maps them to controller methods

import { Router } from 'express';
export function createVehicleRoutes(vehicleController: any): Router {
  const router = Router();

  // GET /api/vehicles - Get all vehicles with optional filtering and pagination
  router.get('/', vehicleController.getAllVehicles.bind(vehicleController));

  // GET /api/vehicles/available - Get only available vehicles
  router.get('/available', vehicleController.getAvailableVehicles.bind(vehicleController));

  // GET /api/vehicles/featured - Get featured vehicles
  router.get('/featured', vehicleController.getFeaturedVehicles.bind(vehicleController));

  // GET /api/vehicles/price-range - Get vehicles in price range
  router.get('/price-range', vehicleController.getVehiclesInPriceRange.bind(vehicleController));

  // GET /api/vehicles/make/:make - Get vehicles by make
  router.get('/make/:make', vehicleController.getVehiclesByMake.bind(vehicleController));

  // GET /api/vehicles/:id - Get specific vehicle by ID
  router.get('/:id', vehicleController.getVehicleById.bind(vehicleController));

  // POST /api/vehicles - Create new vehicle
  router.post('/', vehicleController.createVehicle.bind(vehicleController));

  // PUT /api/vehicles/:id - Update existing vehicle
  router.put('/:id', vehicleController.updateVehicle.bind(vehicleController));

  // DELETE /api/vehicles/:id - Delete vehicle
  router.delete('/:id', vehicleController.deleteVehicle.bind(vehicleController));

  return router;
}