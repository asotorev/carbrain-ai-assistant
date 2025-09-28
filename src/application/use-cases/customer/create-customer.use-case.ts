// Customer onboarding workflow use case for Clean Architecture application layer
// Handles comprehensive customer creation with validation and business rules

import { Customer } from '@domain/entities/customer';
import { CustomerService } from '@application/services/customer.service';

export interface CreateCustomerRequest {
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
}

export interface CreateCustomerResponse {
  customer: Customer;
  isQualified: boolean;
  recommendedActions: string[];
}

export class CreateCustomerUseCase {
  constructor(private customerService: CustomerService) {}

  async execute(request: CreateCustomerRequest): Promise<CreateCustomerResponse> {
    const customer = await this.customerService.createCustomer(request);

    const isQualified = this.evaluateCustomerQualification(customer);
    const recommendedActions = this.generateRecommendedActions(customer, isQualified);

    return {
      customer,
      isQualified,
      recommendedActions
    };
  }

  private evaluateCustomerQualification(customer: Customer): boolean {
    const hasBudget = customer.budget.max > 0;
    const hasContact = !!(customer.email || customer.phone);
    const hasPreferences = Object.keys(customer.preferences).length > 0;

    return hasBudget && hasContact && hasPreferences;
  }

  private generateRecommendedActions(customer: Customer, isQualified: boolean): string[] {
    const actions: string[] = [];

    if (!isQualified) {
      actions.push('Schedule qualification call to understand budget and preferences');
    }

    if (customer.budget.max < 100000) {
      actions.push('Present used vehicle options in lower price range');
    } else if (customer.budget.max > 500000) {
      actions.push('Assign to premium sales specialist');
    }

    if (customer.language === 'es') {
      actions.push('Assign Spanish-speaking sales representative');
    }

    if (!customer.isFinancingPreApproved) {
      actions.push('Offer financing pre-approval process');
    }

    actions.push('Send welcome email with vehicle recommendations');

    return actions;
  }
}