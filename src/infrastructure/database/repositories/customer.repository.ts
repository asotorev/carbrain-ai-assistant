// PostgreSQL implementation of customer repository interface
// Handles customer data persistence and relationship management queries

import { Customer } from '@domain/entities/customer';
import { PriceRangeVO } from '@domain/value-objects/price-range';
import { ContactPreferenceVO } from '@domain/value-objects/contact-preference';
import {
  ICustomerRepository,
  CustomerSearchFilters,
  CustomerSortOptions,
  PaginationOptions,
  CustomerSearchResult,
  CustomerAnalytics
} from '@application/interfaces/customer-repository.interface';
import { db } from '../connection';

export class CustomerRepository implements ICustomerRepository {

  // Basic CRUD operations
  async findById(id: string): Promise<Customer | null> {
    const query = 'SELECT * FROM customers WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows.length > 0 ? this.mapRowToCustomer(result.rows[0]) : null;
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const query = 'SELECT * FROM customers WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows.length > 0 ? this.mapRowToCustomer(result.rows[0]) : null;
  }

  async findByPhone(phone: string): Promise<Customer | null> {
    const query = 'SELECT * FROM customers WHERE phone = $1';
    const result = await db.query(query, [phone]);
    return result.rows.length > 0 ? this.mapRowToCustomer(result.rows[0]) : null;
  }

  async save(customer: Customer): Promise<Customer> {
    const customerData = customer.toJSON();
    const query = `
      INSERT INTO customers (
        id, first_name, last_name, email, phone, language,
        budget_min, budget_max, budget_currency, monthly_budget,
        preferences, contact_preferences, has_test_driven,
        is_financing_pre_approved, credit_score, trade_in_vehicle,
        notes, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;

    await db.query(query, [
      customer.id, customer.firstName, customer.lastName, customer.email,
      customer.phone, customer.language, customerData.budget.min,
      customerData.budget.max, customerData.budget.currency,
      customerData.budget.monthlyBudget, JSON.stringify(customer.preferences),
      JSON.stringify(customerData.contactPreferences), customer.hasTestDriven,
      customer.isFinancingPreApproved, customer.creditScore,
      customer.tradeInVehicle, customer.notes, customer.source
    ]);

    return customer;
  }

  async update(customer: Customer): Promise<Customer> {
    const customerData = customer.toJSON();
    const query = `
      UPDATE customers SET
        first_name = $2, last_name = $3, email = $4, phone = $5,
        language = $6, budget_min = $7, budget_max = $8, budget_currency = $9,
        monthly_budget = $10, preferences = $11, contact_preferences = $12,
        has_test_driven = $13, is_financing_pre_approved = $14,
        credit_score = $15, trade_in_vehicle = $16, notes = $17,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    await db.query(query, [
      customer.id, customer.firstName, customer.lastName, customer.email,
      customer.phone, customer.language, customerData.budget.min,
      customerData.budget.max, customerData.budget.currency,
      customerData.budget.monthlyBudget, JSON.stringify(customer.preferences),
      JSON.stringify(customerData.contactPreferences), customer.hasTestDriven,
      customer.isFinancingPreApproved, customer.creditScore,
      customer.tradeInVehicle, customer.notes
    ]);

    return customer;
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM customers WHERE id = $1';
    await db.query(query, [id]);
  }

  // Search and filtering operations
  async search(
    filters?: CustomerSearchFilters,
    sort?: CustomerSortOptions,
    pagination?: PaginationOptions
  ): Promise<CustomerSearchResult> {
    let query = 'SELECT * FROM customers WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (filters) {
      if (filters.email) {
        query += ` AND email = $${paramIndex}`;
        params.push(filters.email);
        paramIndex++;
      }

      if (filters.phone) {
        query += ` AND phone = $${paramIndex}`;
        params.push(filters.phone);
        paramIndex++;
      }

      if (filters.name) {
        query += ` AND (first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`;
        params.push(`%${filters.name}%`);
        paramIndex++;
      }

      if (filters.language) {
        query += ` AND language = $${paramIndex}`;
        params.push(filters.language);
        paramIndex++;
      }

      if (filters.source) {
        query += ` AND source = $${paramIndex}`;
        params.push(filters.source);
        paramIndex++;
      }

      if (filters.hasTestDriven !== undefined) {
        query += ` AND has_test_driven = $${paramIndex}`;
        params.push(filters.hasTestDriven);
        paramIndex++;
      }

      if (filters.isFinancingPreApproved !== undefined) {
        query += ` AND is_financing_pre_approved = $${paramIndex}`;
        params.push(filters.isFinancingPreApproved);
        paramIndex++;
      }

      if (filters.creditScoreMin) {
        query += ` AND credit_score >= $${paramIndex}`;
        params.push(filters.creditScoreMin);
        paramIndex++;
      }

      if (filters.creditScoreMax) {
        query += ` AND credit_score <= $${paramIndex}`;
        params.push(filters.creditScoreMax);
        paramIndex++;
      }

      if (filters.budgetRange) {
        query += ` AND budget_max >= $${paramIndex} AND budget_min <= $${paramIndex + 1}`;
        params.push(filters.budgetRange.min, filters.budgetRange.max);
        paramIndex += 2;
      }

      if (filters.createdAfter) {
        query += ` AND created_at >= $${paramIndex}`;
        params.push(filters.createdAfter);
        paramIndex++;
      }

      if (filters.createdBefore) {
        query += ` AND created_at <= $${paramIndex}`;
        params.push(filters.createdBefore);
        paramIndex++;
      }
    }

    // Get total count for pagination
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Apply sorting
    if (sort) {
      query += ` ORDER BY ${sort.field} ${sort.direction.toUpperCase()}`;
    } else {
      query += ` ORDER BY created_at DESC`;
    }

    // Apply pagination
    if (pagination) {
      const offset = (pagination.page - 1) * pagination.limit;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(pagination.limit, offset);
    }

    const result = await db.query(query, params);
    const customers = result.rows.map(row => this.mapRowToCustomer(row));

    const totalPages = pagination ? Math.ceil(total / pagination.limit) : 1;
    const currentPage = pagination?.page || 1;

    return {
      customers,
      total,
      page: currentPage,
      totalPages
    };
  }

  // Business-specific queries
  async findQualifiedBuyers(): Promise<Customer[]> {
    const query = `
      SELECT * FROM customers
      WHERE (is_financing_pre_approved = true
             OR credit_score >= 600
             OR monthly_budget IS NOT NULL)
      AND budget_max > 0
      ORDER BY credit_score DESC NULLS LAST
    `;

    const result = await db.query(query);
    return result.rows.map(row => this.mapRowToCustomer(row));
  }

  async findByBudgetRange(priceRange: PriceRangeVO): Promise<Customer[]> {
    const query = `
      SELECT * FROM customers
      WHERE budget_min <= $1 AND budget_max >= $2
      ORDER BY budget_max DESC
    `;

    const result = await db.query(query, [priceRange.max, priceRange.min]);
    return result.rows.map(row => this.mapRowToCustomer(row));
  }

  async findByPreferredMake(make: string): Promise<Customer[]> {
    const query = `
      SELECT * FROM customers
      WHERE preferences->>'preferredMakes' ? $1
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, [make.toLowerCase()]);
    return result.rows.map(row => this.mapRowToCustomer(row));
  }

  async findRecentCustomers(days: number): Promise<Customer[]> {
    const query = `
      SELECT * FROM customers
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY created_at DESC
    `;

    const result = await db.query(query);
    return result.rows.map(row => this.mapRowToCustomer(row));
  }

  // Customer relationship queries
  async findSimilarCustomers(customerId: string, limit = 5): Promise<Customer[]> {
    const customer = await this.findById(customerId);
    if (!customer) return [];

    const query = `
      SELECT * FROM customers
      WHERE id != $1
      AND (
        budget_min BETWEEN $2 AND $3
        OR budget_max BETWEEN $4 AND $5
        OR language = $6
      )
      ORDER BY created_at DESC
      LIMIT $7
    `;

    const budget = customer.budget;
    const result = await db.query(query, [
      customerId,
      budget.min * 0.8, budget.min * 1.2,
      budget.max * 0.8, budget.max * 1.2,
      customer.language,
      limit
    ]);

    return result.rows.map(row => this.mapRowToCustomer(row));
  }

  async findCustomersWithoutLeads(): Promise<Customer[]> {
    const query = `
      SELECT c.* FROM customers c
      LEFT JOIN leads l ON c.id = l.customer_id
      WHERE l.id IS NULL
      ORDER BY c.created_at DESC
    `;

    const result = await db.query(query);
    return result.rows.map(row => this.mapRowToCustomer(row));
  }

  async findHighValueCustomers(minBudget: number): Promise<Customer[]> {
    const query = `
      SELECT * FROM customers
      WHERE budget_max >= $1
      ORDER BY budget_max DESC
    `;

    const result = await db.query(query, [minBudget]);
    return result.rows.map(row => this.mapRowToCustomer(row));
  }

  // Update operations
  async markAsTestDriven(id: string): Promise<Customer> {
    const query = `
      UPDATE customers
      SET has_test_driven = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await db.query(query, [id]);

    const customer = await this.findById(id);
    if (!customer) throw new Error('Customer not found after update');
    return customer;
  }

  async updateBudget(id: string, newBudget: PriceRangeVO): Promise<Customer> {
    const query = `
      UPDATE customers
      SET budget_min = $2, budget_max = $3, budget_currency = $4,
          monthly_budget = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await db.query(query, [
      id, newBudget.min, newBudget.max,
      newBudget.currency, newBudget.monthlyBudget
    ]);

    const customer = await this.findById(id);
    if (!customer) throw new Error('Customer not found after budget update');
    return customer;
  }

  async updateCreditScore(id: string, creditScore: number): Promise<Customer> {
    const query = `
      UPDATE customers
      SET credit_score = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await db.query(query, [id, creditScore]);

    const customer = await this.findById(id);
    if (!customer) throw new Error('Customer not found after credit score update');
    return customer;
  }

  async updatePreferences(id: string, preferences: any): Promise<Customer> {
    const query = `
      UPDATE customers
      SET preferences = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await db.query(query, [id, JSON.stringify(preferences)]);

    const customer = await this.findById(id);
    if (!customer) throw new Error('Customer not found after preferences update');
    return customer;
  }

  // Analytics and reporting
  async getCustomerAnalytics(): Promise<CustomerAnalytics> {
    const statsQuery = `
      SELECT
        COUNT(*) as total,
        AVG(budget_max) as average_budget,
        AVG(credit_score) as average_credit_score,
        COUNT(*) FILTER (WHERE has_test_driven = true) as test_drive_count,
        COUNT(*) FILTER (WHERE is_financing_pre_approved = true) as pre_approval_count
      FROM customers
    `;

    const sourceQuery = `
      SELECT source, COUNT(*) as count
      FROM customers
      GROUP BY source
    `;

    const languageQuery = `
      SELECT language, COUNT(*) as count
      FROM customers
      GROUP BY language
    `;

    const [statsResult, sourceResult, languageResult] = await Promise.all([
      db.query(statsQuery),
      db.query(sourceQuery),
      db.query(languageQuery)
    ]);

    const stats = statsResult.rows[0];
    const total = parseInt(stats.total);

    const bySource: Record<string, number> = {};
    sourceResult.rows.forEach(row => {
      bySource[row.source] = parseInt(row.count);
    });

    const byLanguage: Record<string, number> = {};
    languageResult.rows.forEach(row => {
      byLanguage[row.language] = parseInt(row.count);
    });

    return {
      total,
      bySource,
      byLanguage,
      averageBudget: parseFloat(stats.average_budget) || 0,
      testDriveRate: total > 0 ? (parseInt(stats.test_drive_count) / total) * 100 : 0,
      preApprovalRate: total > 0 ? (parseInt(stats.pre_approval_count) / total) * 100 : 0,
      averageCreditScore: parseFloat(stats.average_credit_score) || 0
    };
  }

  async getCustomersByTimeRange(start: Date, end: Date): Promise<Customer[]> {
    const query = `
      SELECT * FROM customers
      WHERE created_at BETWEEN $1 AND $2
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, [start, end]);
    return result.rows.map(row => this.mapRowToCustomer(row));
  }

  // Bulk operations
  async findByIds(ids: string[]): Promise<Customer[]> {
    if (ids.length === 0) return [];

    const query = 'SELECT * FROM customers WHERE id = ANY($1)';
    const result = await db.query(query, [ids]);
    return result.rows.map(row => this.mapRowToCustomer(row));
  }

  async bulkUpdateSource(ids: string[], source: string): Promise<void> {
    if (ids.length === 0) return;

    const query = `
      UPDATE customers
      SET source = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($2)
    `;
    await db.query(query, [source, ids]);
  }

  // Helper method to map database row to Customer entity
  private mapRowToCustomer(row: any): Customer {
    const budget = PriceRangeVO.create({
      min: parseFloat(row.budget_min) || 0,
      max: parseFloat(row.budget_max) || 0,
      currency: row.budget_currency || 'MXN',
      monthlyBudget: row.monthly_budget ? parseFloat(row.monthly_budget) : undefined
    });

    const contactPreferences = (row.contact_preferences || []).map((cp: any) =>
      ContactPreferenceVO.create(cp)
    );

    return Customer.create({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      language: row.language,
      budget: budget.toJSON(),
      preferences: row.preferences || {},
      contactPreferences: contactPreferences.map((cp: any) => cp.toJSON()),
      hasTestDriven: row.has_test_driven,
      isFinancingPreApproved: row.is_financing_pre_approved,
      creditScore: row.credit_score,
      tradeInVehicle: row.trade_in_vehicle,
      notes: row.notes,
      source: row.source,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}