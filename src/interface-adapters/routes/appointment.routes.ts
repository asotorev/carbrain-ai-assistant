// Appointment API routes configuration for Express router
// Defines HTTP endpoints and maps them to controller methods

import { Router } from 'express';
export function createAppointmentRoutes(appointmentController: any): Router {
  const router = Router();

  // GET /api/appointments - Get all appointments with optional filtering and pagination
  router.get('/', appointmentController.getAllAppointments.bind(appointmentController));

  // GET /api/appointments/today - Get today's appointments
  router.get('/today', appointmentController.getTodaysAppointments.bind(appointmentController));

  // GET /api/appointments/upcoming - Get upcoming appointments
  router.get('/upcoming', appointmentController.getUpcomingAppointments.bind(appointmentController));

  // GET /api/appointments/date-range - Get appointments by date range
  router.get('/date-range', appointmentController.getAppointmentsByDateRange.bind(appointmentController));

  // GET /api/appointments/status/:status - Get appointments by status
  router.get('/status/:status', appointmentController.getAppointmentsByStatus.bind(appointmentController));

  // GET /api/appointments/type/:type - Get appointments by type
  router.get('/type/:type', appointmentController.getAppointmentsByType.bind(appointmentController));

  // GET /api/appointments/customer/:customerId - Get appointments by customer
  router.get('/customer/:customerId', appointmentController.getAppointmentsByCustomer.bind(appointmentController));

  // GET /api/appointments/agent/:agentId - Get appointments by agent
  router.get('/agent/:agentId', appointmentController.getAppointmentsByAgent.bind(appointmentController));

  // GET /api/appointments/agent/:agentId/availability - Check agent availability
  router.get('/agent/:agentId/availability', appointmentController.checkAgentAvailability.bind(appointmentController));

  // GET /api/appointments/agent/:agentId/schedule - Get agent schedule
  router.get('/agent/:agentId/schedule', appointmentController.getAgentSchedule.bind(appointmentController));

  // GET /api/appointments/:id - Get specific appointment by ID
  router.get('/:id', appointmentController.getAppointmentById.bind(appointmentController));

  // POST /api/appointments - Create new appointment
  router.post('/', appointmentController.createAppointment.bind(appointmentController));

  // PUT /api/appointments/:id - Update existing appointment
  router.put('/:id', appointmentController.updateAppointment.bind(appointmentController));

  // DELETE /api/appointments/:id - Delete appointment
  router.delete('/:id', appointmentController.deleteAppointment.bind(appointmentController));

  // POST /api/appointments/:id/confirm - Confirm appointment
  router.post('/:id/confirm', appointmentController.confirmAppointment.bind(appointmentController));

  // POST /api/appointments/:id/cancel - Cancel appointment
  router.post('/:id/cancel', appointmentController.cancelAppointment.bind(appointmentController));

  // PUT /api/appointments/:id/reschedule - Reschedule appointment
  router.put('/:id/reschedule', appointmentController.rescheduleAppointment.bind(appointmentController));

  // POST /api/appointments/:id/complete - Mark appointment as completed
  router.post('/:id/complete', appointmentController.markAppointmentCompleted.bind(appointmentController));

  return router;
}