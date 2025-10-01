// Customer repository implementation for PostgreSQL database
// Implements customer data access with Clean Architecture principles

import { Customer } from '@domain/entities/customer';
import { PriceRangeVO } from '@domain/value-objects/price-range';
import {
  ICustomerRepository,
  CustomerSearchFilters,
  CustomerSearchResult,
  CustomerSortOptions,
  PaginationOptions,
  CustomerAnalytics
} from '@application/interfaces/customer-repository.interface';
import { DatabaseConnection } from '@infrastructure/database/connection';

export class CustomerRepository implements ICustomerRepository {
  constructor(private db: DatabaseConnection) {}

  async findById(id: string): Promise<Customer | null> {
    const query = 'SELECT * FROM customers WHERE id = $1';
    const result = await this.db.query<any>(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToCustomer(result.rows[0]);
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const query = 'SELECT * FROM customers WHERE LOWER(email) = LOWER($1)';
    const result = await this.db.query<any>(query, [email]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToCustomer(result.rows[0]);
  }

  async findByPhone(phone: string): Promise<Customer | null> {
    const query = 'SELECT * FROM customers WHERE phone = $1';
    const result = await this.db.query<any>(query, [phone]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToCustomer(result.rows[0]);
  }

  async search(
    filters?: CustomerSearchFilters,
    sort?: CustomerSortOptions,
    pagination?: PaginationOptions
  ): Promise<CustomerSearchResult> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters) {
      if (filters.name) {
        whereClause += ` AND (LOWER(first_name) LIKE LOWER($${paramIndex}) OR LOWER(last_name) LIKE LOWER($${paramIndex}))`;
        params.push(`%${filters.name}%`);
        paramIndex++;
      }

      if (filters.email) {
        whereClause += ` AND LOWER(email) LIKE LOWER($${paramIndex})`;
        params.push(`%${filters.email}%`);
        paramIndex++;
      }

      if (filters.phone) {
        whereClause += ` AND phone LIKE $${paramIndex}`;
        params.push(`%${filters.phone}%`);
        paramIndex++;
      }

      if (filters.language) {
        whereClause += ` AND language = $${paramIndex}`;
        params.push(filters.language);
        paramIndex++;
      }

      if (filters.hasTestDriven !== undefined) {
        whereClause += ` AND has_test_driven = $${paramIndex}`;
        params.push(filters.hasTestDriven);
        paramIndex++;
      }

      if (filters.isFinancingPreApproved !== undefined) {
        whereClause += ` AND is_financing_pre_approved = $${paramIndex}`;
        params.push(filters.isFinancingPreApproved);
        paramIndex++;
      }

      if (filters.creditScoreMin !== undefined) {
        whereClause += ` AND credit_score >= $${paramIndex}`;
        params.push(filters.creditScoreMin);
        paramIndex++;
      }

      if (filters.creditScoreMax !== undefined) {
        whereClause += ` AND credit_score <= $${paramIndex}`;
        params.push(filters.creditScoreMax);
        paramIndex++;
      }

      if (filters.source) {
        whereClause += ` AND source = $${paramIndex}`;
        params.push(filters.source);
        paramIndex++;
      }

      if (filters.createdAfter) {
        whereClause += ` AND created_at >= $${paramIndex}`;
        params.push(filters.createdAfter);
        paramIndex++;
      }

      if (filters.createdBefore) {
        whereClause += ` AND created_at <= $${paramIndex}`;
        params.push(filters.createdBefore);
        paramIndex++;
      }
    }

    // Count total records
    const countQuery = `SELECT COUNT(*) FROM customers ${whereClause}`;
    const countResult = await this.db.query<{ count: string }>(countQuery, params);
    const total = parseInt(countResult.rows[0]?.count || '0');

    // Build main query with sorting and pagination
    let orderClause = 'ORDER BY created_at DESC';
    if (sort) {
      const fieldMap: Record<string, string> = {
        'created_at': 'created_at',
        'last_name': 'last_name',
        'first_name': 'first_name',
        'email': 'email',
        'budget_max': 'budget_max'
      };
      const dbField = fieldMap[sort.field];
      if (dbField) {
        orderClause = `ORDER BY ${dbField} ${sort.direction.toUpperCase()}`;
      }
    }

    const query = `
      SELECT * FROM customers
      ${whereClause}
      ${orderClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await this.db.query<any>(query, params);
    const customers = result.rows.map(row => this.mapRowToCustomer(row));

    return {
      customers,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async save(customer: Customer): Promise<Customer> {
    if (customer.id) {
      return this.update(customer);
    } else {
      return this.create(customer);
    }
  }

  async update(customer: Customer): Promise<Customer> {
    const query = `
      UPDATE customers SET
        first_name = $2, last_name = $3, email = $4, phone = $5,
        language = $6, budget = $7, preferences = $8, contact_preferences = $9,
        notes = $10, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const params = [
      customer.id,
      customer.firstName,
      customer.lastName,
      customer.email,
      customer.phone,
      customer.language,
      JSON.stringify(customer.budget),
      JSON.stringify(customer.preferences),
      JSON.stringify(customer.contactPreferences),
      customer.notes
    ];

    const result = await this.db.query<any>(query, params);

    if (result.rows.length === 0) {
      throw new Error('Customer not found or could not be updated');
    }

    return this.mapRowToCustomer(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM customers WHERE id = $1';
    await this.db.query(query, [id]);
  }

  async updateBudget(id: string, budget: PriceRangeVO): Promise<Customer> {
    const query = `
      UPDATE customers SET budget = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query<any>(query, [id, JSON.stringify(budget.toJSON())]);

    if (result.rows.length === 0) {
      throw new Error('Customer not found');
    }

    return this.mapRowToCustomer(result.rows[0]);
  }

  async updatePreferences(id: string, preferences: any): Promise<Customer> {
    const query = `
      UPDATE customers SET preferences = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query<any>(query, [id, JSON.stringify(preferences)]);

    if (result.rows.length === 0) {
      throw new Error('Customer not found');
    }

    return this.mapRowToCustomer(result.rows[0]);
  }

  async findQualifiedBuyers(): Promise<Customer[]> {
    const query = 'SELECT * FROM customers WHERE is_qualified = true ORDER BY created_at DESC';
    const result = await this.db.query<any>(query);
    return result.rows.map(row => this.mapRowToCustomer(row));
  }

  async findByBudgetRange(priceRange: PriceRangeVO): Promise<Customer[]> {
    const query = `
      SELECT * FROM customers
      WHERE 1=1
        AND (budget->>'min')::numeric <= $1
        AND (budget->>'max')::numeric >= $2
      ORDER BY (budget->>'max')::numeric DESC
    `;
    const result = await this.db.query<any>(query, [priceRange.max, priceRange.min]);
    return result.rows.map(row => this.mapRowToCustomer(row));
  }

  async findByPreferredMake(make: string): Promise<Customer[]> {
    const query = `
      SELECT * FROM customers
      WHERE 1=1
        AND preferences ? 'preferredMakes'
        AND preferences->'preferredMakes' @> $1
      ORDER BY created_at DESC
    `;
    const result = await this.db.query<any>(query, [JSON.stringify([make])]);
    return result.rows.map(row => this.mapRowToCustomer(row));
  }

  async findRecentCustomers(days: number): Promise<Customer[]> {
    const query = `
      SELECT * FROM customers
      WHERE 1=1
        AND created_at >= NOW() - INTERVAL '${days} days'
      ORDER BY created_at DESC
    `;
    const result = await this.db.query<any>(query);
    return result.rows.map(row => this.mapRowToCustomer(row));
  }

  async findSimilarCustomers(customerId: string, limit: number): Promise<Customer[]> {
    // Find customers with similar budget and preferences
    const query = `
      WITH reference_customer AS (
        SELECT budget, preferences FROM customers WHERE id = $1
      )
      SELECT c.* FROM customers c, reference_customer rc
      WHERE c.id != $1
        AND c.deleted_at IS NULL
        AND (
          ABS((c.budget->>'max')::numeric - (rc.budget->>'max')::numeric) < (rc.budget->>'max')::numeric * 0.3
          OR c.preferences @> rc.preferences
        )
      ORDER BY
        ABS((c.budget->>'max')::numeric - (rc.budget->>'max')::numeric)
      LIMIT $2
    `;
    const result = await this.db.query<any>(query, [customerId, limit]);
    return result.rows.map(row => this.mapRowToCustomer(row));
  }

  async findCustomersWithoutLeads(): Promise<Customer[]> {
    const query = `
      SELECT c.* FROM customers c
      LEFT JOIN leads l ON c.id = l.customer_id AND l.deleted_at IS NULL
      WHERE c.deleted_at IS NULL AND l.id IS NULL
      ORDER BY c.created_at DESC
    `;
    const result = await this.db.query<any>(query);
    return result.rows.map(row => this.mapRowToCustomer(row));
  }

  async findHighValueCustomers(minBudget: number): Promise<Customer[]> {
    const query = `
      SELECT * FROM customers
      WHERE 1=1
        AND (budget->>'max')::numeric >= $1
      ORDER BY (budget->>'max')::numeric DESC
    `;
    const result = await this.db.query<any>(query, [minBudget]);
    return result.rows.map(row => this.mapRowToCustomer(row));
  }

  async markAsTestDriven(id: string): Promise<Customer> {
    const query = `
      UPDATE customers SET
        has_test_driven = true,
        test_drive_date = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query<any>(query, [id]);

    if (result.rows.length === 0) {
      throw new Error('Customer not found');
    }

    return this.mapRowToCustomer(result.rows[0]);
  }

  async updateCreditScore(id: string, creditScore: number): Promise<Customer> {
    const query = `
      UPDATE customers SET
        credit_score = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query<any>(query, [id, creditScore]);

    if (result.rows.length === 0) {
      throw new Error('Customer not found');
    }

    return this.mapRowToCustomer(result.rows[0]);
  }

  async getCustomerAnalytics(): Promise<CustomerAnalytics> {
    const queries = [
      'SELECT COUNT(*) as total FROM customers',
      'SELECT source, COUNT(*) as count FROM customers GROUP BY source',
      'SELECT language, COUNT(*) as count FROM customers GROUP BY language',
      'SELECT AVG(budget_max) as avg_budget FROM customers',
      'SELECT COUNT(*) as test_driven FROM customers WHERE has_test_driven = true',
      'SELECT COUNT(*) as pre_approved FROM customers WHERE is_financing_pre_approved = true',
      'SELECT AVG(credit_score) as avg_credit_score FROM customers WHERE credit_score IS NOT NULL',
      'SELECT COUNT(*) as total FROM customers'
    ];

    const [totalResult, sourceResult, languageResult, avgBudgetResult, testDrivenResult, preApprovedResult, creditScoreResult] =
      await Promise.all(queries.map(q => this.db.query<any>(q)));

    const total = parseInt(totalResult?.rows[0]?.total || '0');
    const bySource: Record<string, number> = {};
    sourceResult?.rows.forEach((row: any) => {
      bySource[row.source] = parseInt(row.count);
    });

    const byLanguage: Record<string, number> = {};
    languageResult?.rows.forEach((row: any) => {
      byLanguage[row.language] = parseInt(row.count);
    });

    const testDriven = parseInt(testDrivenResult?.rows[0]?.test_driven || '0');
    const preApproved = parseInt(preApprovedResult?.rows[0]?.pre_approved || '0');

    return {
      total,
      bySource,
      byLanguage,
      averageBudget: parseFloat(avgBudgetResult?.rows[0]?.avg_budget || '0'),
      testDriveRate: total > 0 ? (testDriven / total) * 100 : 0,
      preApprovalRate: total > 0 ? (preApproved / total) * 100 : 0,
      averageCreditScore: parseFloat(creditScoreResult?.rows[0]?.avg_credit_score || '0')
    };
  }

  private async create(customer: Customer): Promise<Customer> {
    const query = `
      INSERT INTO customers (
        id, first_name, last_name, email, phone, language, budget,
        preferences, contact_preferences, source, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      ) RETURNING *
    `;

    const params = [
      customer.id,
      customer.firstName,
      customer.lastName,
      customer.email,
      customer.phone,
      customer.language,
      JSON.stringify(customer.budget),
      JSON.stringify(customer.preferences),
      JSON.stringify(customer.contactPreferences),
      customer.source,
      customer.notes
    ];

    const result = await this.db.query<any>(query, params);
    return this.mapRowToCustomer(result.rows[0]);
  }

  private mapRowToCustomer(row: any): Customer {
    return Customer.create({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      language: row.language,
      budget: typeof row.budget === 'string' ? JSON.parse(row.budget) : row.budget,
      preferences: typeof row.preferences === 'string' ? JSON.parse(row.preferences) : row.preferences,
      contactPreferences: typeof row.contact_preferences === 'string' ? JSON.parse(row.contact_preferences) : row.contact_preferences,
      source: row.source,
      notes: row.notes,
      isQualified: row.is_qualified,
      hasTestDriven: row.has_test_driven,
      testDriveDate: row.test_drive_date,
      creditScore: row.credit_score,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  async getCustomersByTimeRange(start: Date, end: Date): Promise<Customer[]> {
    const query = 'SELECT * FROM customers WHERE created_at >= $1 AND created_at <= $2 ORDER BY created_at DESC';
    const result = await this.db.query<any>(query, [start, end]);
    return result.rows.map(row => this.mapRowToCustomer(row));
  }

  async findByIds(ids: string[]): Promise<Customer[]> {
    if (ids.length === 0) return [];
    const query = 'SELECT * FROM customers WHERE id = ANY($1::uuid[])';
    const result = await this.db.query<any>(query, [ids]);
    return result.rows.map(row => this.mapRowToCustomer(row));
  }

  async bulkUpdateSource(ids: string[], source: string): Promise<void> {
    if (ids.length === 0) return;
    const query = 'UPDATE customers SET source = $1, updated_at = NOW() WHERE id = ANY($2::uuid[])';
    await this.db.query(query, [source, ids]);
  }
}