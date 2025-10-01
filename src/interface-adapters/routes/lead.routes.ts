// Lead API routes configuration for Express router
// Defines HTTP endpoints and maps them to controller methods

import { Router } from 'express';
export function createLeadRoutes(leadController: any): Router {
  const router = Router();

  // GET /api/leads - Get all leads with optional filtering and pagination
  router.get('/', leadController.getAllLeads.bind(leadController));

  // GET /api/leads/active - Get active leads
  router.get('/active', leadController.getActiveLeads.bind(leadController));

  // GET /api/leads/price-range - Get leads in price range
  router.get('/price-range', leadController.getLeadsInPriceRange.bind(leadController));

  // GET /api/leads/recent - Get recent leads
  router.get('/recent', leadController.getRecentLeads.bind(leadController));

  // GET /api/leads/stage/:stage - Get leads by stage
  router.get('/stage/:stage', leadController.getLeadsByStage.bind(leadController));

  // GET /api/leads/agent/:agentId - Get leads by agent
  router.get('/agent/:agentId', leadController.getLeadsByAgent.bind(leadController));

  // GET /api/leads/customer/:customerId - Get leads by customer
  router.get('/customer/:customerId', leadController.getLeadsByCustomer.bind(leadController));

  // GET /api/leads/vehicle/:vehicleId - Get leads by vehicle
  router.get('/vehicle/:vehicleId', leadController.getLeadsByVehicle.bind(leadController));

  // GET /api/leads/:id - Get specific lead by ID
  router.get('/:id', leadController.getLeadById.bind(leadController));

  // POST /api/leads - Create new lead
  router.post('/', leadController.createLead.bind(leadController));

  // PUT /api/leads/:id - Update existing lead
  router.put('/:id', leadController.updateLead.bind(leadController));

  // DELETE /api/leads/:id - Delete lead
  router.delete('/:id', leadController.deleteLead.bind(leadController));

  // PUT /api/leads/:id/stage - Progress lead stage
  router.put('/:id/stage', leadController.progressLeadStage.bind(leadController));

  // POST /api/leads/:id/convert - Convert lead to sale
  router.post('/:id/convert', leadController.convertLead.bind(leadController));

  // POST /api/leads/:id/mark-lost - Mark lead as lost
  router.post('/:id/mark-lost', leadController.markLeadAsLost.bind(leadController));

  // PUT /api/leads/:id/assign - Assign lead to agent
  router.put('/:id/assign', leadController.assignLeadToAgent.bind(leadController));

  return router;
}