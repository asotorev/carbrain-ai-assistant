// Customer update workflow use case for Clean Architecture application layer
// Handles customer information updates with business rule validation

import { Customer } from '@domain/entities/customer';
import { CustomerService } from '@application/services/customer.service';

export interface UpdateCustomerRequest {
  customerId: string;
  updates: Partial<{
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
  }>;
}

export interface UpdateCustomerResponse {
  customer: Customer;
  qualificationChanged: boolean;
  recommendedActions: string[];
}

export class UpdateCustomerUseCase {
  constructor(private customerService: CustomerService) {}

  async execute(request: UpdateCustomerRequest): Promise<UpdateCustomerResponse> {
    const originalCustomer = await this.customerService.getCustomerById(request.customerId);
    if (!originalCustomer) {
      throw new Error('Customer not found');
    }

    const originalQualification = this.evaluateCustomerQualification(originalCustomer);

    const updatedCustomer = await this.customerService.updateCustomer(
      request.customerId,
      request.updates
    );

    const newQualification = this.evaluateCustomerQualification(updatedCustomer);
    const qualificationChanged = originalQualification !== newQualification;

    const recommendedActions = this.generateUpdateRecommendations(
      originalCustomer,
      updatedCustomer,
      qualificationChanged
    );

    return {
      customer: updatedCustomer,
      qualificationChanged,
      recommendedActions
    };
  }

  private evaluateCustomerQualification(customer: Customer): boolean {
    const hasBudget = customer.budget.max > 0;
    const hasValidContact = !!(customer.email || customer.phone);
    const hasPreferences = Object.keys(customer.preferences).length > 0;

    return hasBudget && hasValidContact && hasPreferences;
  }

  private generateUpdateRecommendations(
    original: Customer,
    updated: Customer,
    qualificationChanged: boolean
  ): string[] {
    const actions: string[] = [];

    if (qualificationChanged) {
      actions.push('Customer qualification status changed - review assignment and priority');
    }

    if (original.budget.max !== updated.budget.max) {
      if (updated.budget.max > original.budget.max) {
        actions.push('Budget increased - present higher-tier vehicle options');
      } else {
        actions.push('Budget decreased - adjust vehicle recommendations accordingly');
      }
    }

    if (original.language !== updated.language) {
      actions.push('Language preference changed - reassign to appropriate sales representative');
    }

    if (JSON.stringify(original.preferences) !== JSON.stringify(updated.preferences)) {
      actions.push('Vehicle preferences updated - refresh vehicle recommendations');
    }

    if (original.email !== updated.email) {
      actions.push('Email changed - update marketing and communication lists');
    }

    if (original.phone !== updated.phone) {
      actions.push('Phone number changed - update contact information across all systems');
    }

    return actions;
  }
}