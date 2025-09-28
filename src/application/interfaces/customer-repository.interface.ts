// Customer repository interface for Clean Architecture application layer
// Defines contract for customer data access and relationship management

import { Customer } from '@domain/entities/customer';
import { PriceRangeVO } from '@domain/value-objects/price-range';

// Search filters for customer queries
export interface CustomerSearchFilters {
  email?: string;                   // Exact email match
  phone?: string;                   // Phone number search
  name?: string;                    // Search in first/last name
  language?: 'es' | 'en';          // Preferred language
  source?: 'website' | 'referral' | 'advertising' | 'walk_in' | 'phone';
  hasTestDriven?: boolean;          // Has customer test driven
  isFinancingPreApproved?: boolean; // Pre-approved for financing
  creditScoreMin?: number;          // Minimum credit score
  creditScoreMax?: number;          // Maximum credit score
  budgetRange?: PriceRangeVO;       // Budget range filter
  createdAfter?: Date;              // Customers created after date
  createdBefore?: Date;             // Customers created before date
}

// Customer sorting options
export interface CustomerSortOptions {
  field: 'created_at' | 'last_name' | 'first_name' | 'email' | 'budget_max';
  direction: 'asc' | 'desc';
}

// Pagination for customer results
export interface PaginationOptions {
  page: number;                     // Page number (1-based)
  limit: number;                    // Items per page
}

// Customer search result with pagination
export interface CustomerSearchResult {
  customers: Customer[];            // Found customers
  total: number;                    // Total count
  page: number;                     // Current page
  totalPages: number;               // Total pages available
}

// Customer analytics data
export interface CustomerAnalytics {
  total: number;                    // Total customers
  bySource: Record<string, number>; // Customers by acquisition source
  byLanguage: Record<string, number>; // Language preferences
  averageBudget: number;            // Average budget
  testDriveRate: number;            // Percentage who test drove
  preApprovalRate: number;          // Percentage pre-approved
  averageCreditScore: number;       // Average credit score
}

// Repository interface for customer data access
export interface ICustomerRepository {
  // Basic CRUD operations
  findById(id: string): Promise<Customer | null>;
  findByEmail(email: string): Promise<Customer | null>;
  findByPhone(phone: string): Promise<Customer | null>;
  save(customer: Customer): Promise<Customer>;
  update(customer: Customer): Promise<Customer>;
  delete(id: string): Promise<void>;

  // Search and filtering operations
  search(
    filters?: CustomerSearchFilters,
    sort?: CustomerSortOptions,
    pagination?: PaginationOptions
  ): Promise<CustomerSearchResult>;

  // Business-specific queries
  findQualifiedBuyers(): Promise<Customer[]>;
  findByBudgetRange(priceRange: PriceRangeVO): Promise<Customer[]>;
  findByPreferredMake(make: string): Promise<Customer[]>;
  findRecentCustomers(days: number): Promise<Customer[]>;

  // Customer relationship queries
  findSimilarCustomers(customerId: string, limit?: number): Promise<Customer[]>;
  findCustomersWithoutLeads(): Promise<Customer[]>;
  findHighValueCustomers(minBudget: number): Promise<Customer[]>;

  // Update operations
  markAsTestDriven(id: string): Promise<Customer>;
  updateBudget(id: string, newBudget: PriceRangeVO): Promise<Customer>;
  updateCreditScore(id: string, creditScore: number): Promise<Customer>;
  updatePreferences(id: string, preferences: any): Promise<Customer>;

  // Analytics and reporting
  getCustomerAnalytics(): Promise<CustomerAnalytics>;
  getCustomersByTimeRange(start: Date, end: Date): Promise<Customer[]>;

  // Bulk operations
  findByIds(ids: string[]): Promise<Customer[]>;
  bulkUpdateSource(ids: string[], source: string): Promise<void>;
}