// Customer lifecycle management service for Clean Architecture application layer
// Orchestrates customer operations and business workflows

import { Customer } from '@domain/entities/customer';
import { PriceRangeVO } from '@domain/value-objects/price-range';
import { ContactPreferenceVO } from '@domain/value-objects/contact-preference';
import {
  ICustomerRepository,
  CustomerSearchFilters,
  CustomerSearchResult,
  CustomerAnalytics
} from '@application/interfaces/customer-repository.interface';

export class CustomerService {
  constructor(private customerRepository: ICustomerRepository) {}

  async getCustomerById(id: string): Promise<Customer | null> {
    if (!id || id.trim().length === 0) {
      throw new Error('Customer ID is required');
    }
    return await this.customerRepository.findById(id);
  }

  async getCustomerByEmail(email: string): Promise<Customer | null> {
    if (!email || !this.isValidEmail(email)) {
      throw new Error('Valid email address is required');
    }
    return await this.customerRepository.findByEmail(email.toLowerCase());
  }

  async getCustomerByPhone(phone: string): Promise<Customer | null> {
    if (!phone || phone.trim().length === 0) {
      throw new Error('Phone number is required');
    }
    return await this.customerRepository.findByPhone(phone);
  }

  async searchCustomers(
    filters?: CustomerSearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<CustomerSearchResult> {
    if (page < 1) {
      throw new Error('Page number must be greater than 0');
    }
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    return await this.customerRepository.search(filters, undefined, { page, limit });
  }

  async createCustomer(customerData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    language?: string;
    budget?: {
      min: number;
      max: number;
      currency?: string;
      monthlyBudget?: number;
    };
    preferences?: any;
    contactPreferences?: Array<{
      method: string;
      value: string;
      isPrimary: boolean;
      bestTimeToContact?: string;
    }>;
    source?: string;
    notes?: string;
  }): Promise<Customer> {
    this.validateCustomerData(customerData);

    await this.checkEmailUniqueness(customerData.email);
    await this.checkPhoneUniqueness(customerData.phone);

    const budget = customerData.budget
      ? PriceRangeVO.create({
          min: customerData.budget.min,
          max: customerData.budget.max,
          currency: customerData.budget.currency || 'MXN',
          monthlyBudget: customerData.budget.monthlyBudget
        })
      : PriceRangeVO.create({ min: 0, max: 1000000, currency: 'MXN' });

    const contactPreferences = (customerData.contactPreferences || []).map(cp =>
      ContactPreferenceVO.create(cp)
    );

    const customer = Customer.create({
      firstName: customerData.firstName.trim(),
      lastName: customerData.lastName.trim(),
      email: customerData.email.toLowerCase().trim(),
      phone: customerData.phone.trim(),
      language: customerData.language || 'es',
      budget: budget.toJSON(),
      preferences: customerData.preferences || {},
      contactPreferences: contactPreferences.map(cp => cp.toJSON()),
      source: customerData.source || 'website',
      notes: customerData.notes || ''
    });

    return await this.customerRepository.save(customer);
  }

  async updateCustomer(id: string, updates: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    language: string;
    budget: {
      min: number;
      max: number;
      currency?: string;
      monthlyBudget?: number;
    };
    preferences: any;
    contactPreferences: Array<{
      method: string;
      value: string;
      isPrimary: boolean;
      bestTimeToContact?: string;
    }>;
    notes: string;
  }>): Promise<Customer> {
    const existingCustomer = await this.customerRepository.findById(id);
    if (!existingCustomer) {
      throw new Error('Customer not found');
    }

    if (updates.email && updates.email !== existingCustomer.email) {
      if (!this.isValidEmail(updates.email)) {
        throw new Error('Valid email address is required');
      }
      await this.checkEmailUniqueness(updates.email);
    }

    if (updates.phone && updates.phone !== existingCustomer.phone) {
      await this.checkPhoneUniqueness(updates.phone);
    }

    let updatedCustomer = existingCustomer;

    if (updates.budget) {
      const newBudget = PriceRangeVO.create({
        min: updates.budget.min,
        max: updates.budget.max,
        currency: updates.budget.currency || 'MXN',
        monthlyBudget: updates.budget.monthlyBudget
      });
      updatedCustomer = await this.customerRepository.updateBudget(id, newBudget);
    }

    if (updates.preferences) {
      updatedCustomer = await this.customerRepository.updatePreferences(id, updates.preferences);
    }

    return await this.customerRepository.update(updatedCustomer);
  }

  async deleteCustomer(id: string): Promise<void> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new Error('Customer not found');
    }

    await this.customerRepository.delete(id);
  }

  async getQualifiedBuyers(): Promise<Customer[]> {
    return await this.customerRepository.findQualifiedBuyers();
  }

  async getCustomersInBudgetRange(minBudget: number, maxBudget: number): Promise<Customer[]> {
    if (minBudget < 0 || maxBudget < 0) {
      throw new Error('Budget values must be non-negative');
    }
    if (minBudget > maxBudget) {
      throw new Error('Minimum budget cannot be greater than maximum budget');
    }

    const priceRange = PriceRangeVO.create({
      min: minBudget,
      max: maxBudget,
      currency: 'MXN'
    });

    return await this.customerRepository.findByBudgetRange(priceRange);
  }

  async getCustomersByPreferredMake(make: string): Promise<Customer[]> {
    if (!make || make.trim().length === 0) {
      throw new Error('Vehicle make is required');
    }
    return await this.customerRepository.findByPreferredMake(make.toLowerCase());
  }

  async getRecentCustomers(days: number = 30): Promise<Customer[]> {
    if (days < 1 || days > 365) {
      throw new Error('Days parameter must be between 1 and 365');
    }
    return await this.customerRepository.findRecentCustomers(days);
  }

  async getSimilarCustomers(customerId: string, limit: number = 5): Promise<Customer[]> {
    if (limit < 1 || limit > 20) {
      throw new Error('Similar customers limit must be between 1 and 20');
    }
    return await this.customerRepository.findSimilarCustomers(customerId, limit);
  }

  async getCustomersWithoutLeads(): Promise<Customer[]> {
    return await this.customerRepository.findCustomersWithoutLeads();
  }

  async getHighValueCustomers(minBudget: number = 500000): Promise<Customer[]> {
    if (minBudget < 0) {
      throw new Error('Minimum budget must be non-negative');
    }
    return await this.customerRepository.findHighValueCustomers(minBudget);
  }

  async markCustomerAsTestDriven(id: string): Promise<Customer> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new Error('Customer not found');
    }

    return await this.customerRepository.markAsTestDriven(id);
  }

  async updateCustomerCreditScore(id: string, creditScore: number): Promise<Customer> {
    if (creditScore < 300 || creditScore > 850) {
      throw new Error('Credit score must be between 300 and 850');
    }

    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new Error('Customer not found');
    }

    return await this.customerRepository.updateCreditScore(id, creditScore);
  }

  async getCustomerAnalytics(): Promise<CustomerAnalytics> {
    return await this.customerRepository.getCustomerAnalytics();
  }

  private validateCustomerData(data: any): void {
    if (!data.firstName || data.firstName.trim().length === 0) {
      throw new Error('First name is required');
    }

    if (!data.lastName || data.lastName.trim().length === 0) {
      throw new Error('Last name is required');
    }

    if (!data.email || !this.isValidEmail(data.email)) {
      throw new Error('Valid email address is required');
    }

    if (!data.phone || data.phone.trim().length === 0) {
      throw new Error('Phone number is required');
    }

    if (data.budget) {
      if (data.budget.min < 0 || data.budget.max < 0) {
        throw new Error('Budget values must be non-negative');
      }
      if (data.budget.min > data.budget.max) {
        throw new Error('Minimum budget cannot be greater than maximum budget');
      }
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async checkEmailUniqueness(email: string): Promise<void> {
    const existingCustomer = await this.customerRepository.findByEmail(email);
    if (existingCustomer) {
      throw new Error('Email address is already registered');
    }
  }

  private async checkPhoneUniqueness(phone: string): Promise<void> {
    const existingCustomer = await this.customerRepository.findByPhone(phone);
    if (existingCustomer) {
      throw new Error('Phone number is already registered');
    }
  }
}