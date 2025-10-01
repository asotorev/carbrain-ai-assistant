// Customer HTTP endpoints controller for Interface Adapters layer
// Handles customer lifecycle management and business workflows

import { Request, Response } from 'express';
import { CustomerService } from '@application/services/customer.service';
import { CreateCustomerUseCase } from '@application/use-cases/customer/create-customer.use-case';
import { UpdateCustomerUseCase } from '@application/use-cases/customer/update-customer.use-case';

export class CustomerController {
  constructor(
    private customerService: CustomerService,
    private createCustomerUseCase: CreateCustomerUseCase,
    private updateCustomerUseCase: UpdateCustomerUseCase
  ) {}

  async getAllCustomers(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const name = req.query.name as string;
      const email = req.query.email as string;
      const phone = req.query.phone as string;
      const language = req.query.language as string;

      const filters: any = {
        ...(name && { name }),
        ...(email && { email }),
        ...(phone && { phone }),
        ...(language && { language })
      };

      const result = await this.customerService.searchCustomers(filters, page, limit);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Customers retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve customers'
      });
    }
  }

  async getCustomerById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Customer ID is required',
          message: 'Customer ID is required'
        });
        return;
      }
      const customer = await this.customerService.getCustomerById(id);

      if (!customer) {
        res.status(404).json({
          success: false,
          error: 'Customer not found',
          message: 'Customer not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: customer,
        message: 'Customer retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve customer'
      });
    }
  }

  async createCustomer(req: Request, res: Response): Promise<void> {
    try {
      const customerData = req.body;
      const result = await this.createCustomerUseCase.execute(customerData);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Customer created successfully'
      });
    } catch (error) {
      if (error instanceof Error && (
        error.message.includes('required') ||
        error.message.includes('already registered') ||
        error.message.includes('Valid email')
      )) {
        res.status(400).json({
          success: false,
          error: error.message,
          message: 'Invalid customer data provided'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          message: 'Failed to create customer'
        });
      }
    }
  }

  async updateCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Customer ID is required',
          message: 'Customer ID is required'
        });
        return;
      }
      const updates = req.body;

      const result = await this.updateCustomerUseCase.execute({
        customerId: id,
        updates
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Customer updated successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Customer not found') {
        res.status(404).json({
          success: false,
          error: error.message,
          message: 'Customer not found'
        });
      } else if (error instanceof Error && (
        error.message.includes('required') ||
        error.message.includes('already registered')
      )) {
        res.status(400).json({
          success: false,
          error: error.message,
          message: 'Invalid update data provided'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          message: 'Failed to update customer'
        });
      }
    }
  }

  async deleteCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Customer ID is required',
          message: 'Customer ID is required'
        });
        return;
      }
      await this.customerService.deleteCustomer(id);

      res.status(200).json({
        success: true,
        message: 'Customer deleted successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Customer not found') {
        res.status(404).json({
          success: false,
          error: error.message,
          message: 'Customer not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          message: 'Failed to delete customer'
        });
      }
    }
  }

  async getCustomerByEmail(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.params;
      const customer = await this.customerService.getCustomerByEmail(email!);

      if (!customer) {
        res.status(404).json({
          success: false,
          error: 'Customer not found',
          message: 'Customer with this email not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: customer,
        message: 'Customer retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve customer by email'
      });
    }
  }

  async getQualifiedBuyers(req: Request, res: Response): Promise<void> {
    try {
      const customers = await this.customerService.getQualifiedBuyers();

      res.status(200).json({
        success: true,
        data: customers,
        message: 'Qualified buyers retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve qualified buyers'
      });
    }
  }

  async getCustomersInBudgetRange(req: Request, res: Response): Promise<void> {
    try {
      const { minBudget, maxBudget } = req.query;

      if (!minBudget || !maxBudget) {
        res.status(400).json({
          success: false,
          error: 'Both minBudget and maxBudget are required',
          message: 'Invalid budget range parameters'
        });
        return;
      }

      const customers = await this.customerService.getCustomersInBudgetRange(
        parseFloat(minBudget as string),
        parseFloat(maxBudget as string)
      );

      res.status(200).json({
        success: true,
        data: customers,
        message: 'Customers in budget range retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve customers in budget range'
      });
    }
  }

  async markAsTestDriven(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const customer = await this.customerService.markCustomerAsTestDriven(id!);

      res.status(200).json({
        success: true,
        data: customer,
        message: 'Customer marked as test driven successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Customer not found') {
        res.status(404).json({
          success: false,
          error: error.message,
          message: 'Customer not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          message: 'Failed to mark customer as test driven'
        });
      }
    }
  }

  async updateCreditScore(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { creditScore } = req.body;

      if (!creditScore || creditScore < 300 || creditScore > 850) {
        res.status(400).json({
          success: false,
          error: 'Valid credit score (300-850) is required',
          message: 'Invalid credit score provided'
        });
        return;
      }

      const customer = await this.customerService.updateCustomerCreditScore(id!, creditScore);

      res.status(200).json({
        success: true,
        data: customer,
        message: 'Customer credit score updated successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Customer not found') {
        res.status(404).json({
          success: false,
          error: error.message,
          message: 'Customer not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          message: 'Failed to update customer credit score'
        });
      }
    }
  }

  async getHighValueCustomers(req: Request, res: Response): Promise<void> {
    try {
      const minBudget = req.query.minBudget ? parseFloat(req.query.minBudget as string) : 500000;
      const customers = await this.customerService.getHighValueCustomers(minBudget);

      res.status(200).json({
        success: true,
        data: customers,
        message: 'High-value customers retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve high-value customers'
      });
    }
  }
}