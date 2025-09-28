// Customer API routes configuration for Express router
// Defines HTTP endpoints and maps them to controller methods

import { Router } from 'express';
export function createCustomerRoutes(customerController: any): Router {
  const router = Router();

  // GET /api/customers - Get all customers with optional filtering and pagination
  router.get('/', customerController.getAllCustomers.bind(customerController));

  // GET /api/customers/qualified-buyers - Get qualified buyers
  router.get('/qualified-buyers', customerController.getQualifiedBuyers.bind(customerController));

  // GET /api/customers/budget-range - Get customers in budget range
  router.get('/budget-range', customerController.getCustomersInBudgetRange.bind(customerController));

  // GET /api/customers/high-value - Get high-value customers
  router.get('/high-value', customerController.getHighValueCustomers.bind(customerController));

  // GET /api/customers/email/:email - Get customer by email
  router.get('/email/:email', customerController.getCustomerByEmail.bind(customerController));

  // GET /api/customers/:id - Get specific customer by ID
  router.get('/:id', customerController.getCustomerById.bind(customerController));

  // POST /api/customers - Create new customer
  router.post('/', customerController.createCustomer.bind(customerController));

  // PUT /api/customers/:id - Update existing customer
  router.put('/:id', customerController.updateCustomer.bind(customerController));

  // DELETE /api/customers/:id - Delete customer
  router.delete('/:id', customerController.deleteCustomer.bind(customerController));

  // POST /api/customers/:id/test-drive - Mark customer as test driven
  router.post('/:id/test-drive', customerController.markAsTestDriven.bind(customerController));

  // PUT /api/customers/:id/credit-score - Update customer credit score
  router.put('/:id/credit-score', customerController.updateCreditScore.bind(customerController));

  return router;
}