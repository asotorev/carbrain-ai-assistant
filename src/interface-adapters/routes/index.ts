// Main API routes configuration
// Combines all feature routes into a single router

import { Router } from 'express';
import { createVehicleRoutes } from './vehicle.routes';
import { createCustomerRoutes } from './customer.routes';
import { createLeadRoutes } from './lead.routes';
import { createAppointmentRoutes } from './appointment.routes';

// Import interface from dependency container
import { ApiControllers } from '../../infrastructure/container/dependency-container';

export function createApiRoutes(controllers: ApiControllers): Router {
  const router = Router();

  // Mount feature routes
  router.use('/vehicles', createVehicleRoutes(controllers.vehicleController));
  router.use('/customers', createCustomerRoutes(controllers.customerController));
  router.use('/leads', createLeadRoutes(controllers.leadController));
  router.use('/appointments', createAppointmentRoutes(controllers.appointmentController));

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'CarBrain AI Assistant API is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  return router;
}