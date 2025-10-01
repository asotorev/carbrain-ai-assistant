// Lead repository implementation for PostgreSQL database
// Implements lead data access with Clean Architecture principles

import { Lead } from '@domain/entities/lead';
import {
  ILeadRepository,
  LeadSearchFilters,
  LeadSearchResult,
  LeadSortOptions,
  PaginationOptions
} from '@application/interfaces/lead-repository.interface';
import { DatabaseConnection } from '@infrastructure/database/connection';

export class LeadRepository implements ILeadRepository {
  constructor(private db: DatabaseConnection) {}

  async findById(id: string): Promise<Lead | null> {
    const query = 'SELECT * FROM leads WHERE id = $1';
    const result = await this.db.query<any>(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToLead(result.rows[0]);
  }

  async findByCustomerId(customerId: string): Promise<Lead[]> {
    const query = 'SELECT * FROM leads WHERE customer_id = $1 ORDER BY created_at DESC';
    const result = await this.db.query<any>(query, [customerId]);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  async findByVehicleId(vehicleId: string): Promise<Lead[]> {
    const query = 'SELECT * FROM leads WHERE vehicle_id = $1 ORDER BY created_at DESC';
    const result = await this.db.query<any>(query, [vehicleId]);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  async search(
    filters?: LeadSearchFilters,
    sort?: LeadSortOptions,
    pagination?: PaginationOptions
  ): Promise<LeadSearchResult> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters) {
      if (filters.customerId) {
        whereClause += ` AND customer_id = $${paramIndex}`;
        params.push(filters.customerId);
        paramIndex++;
      }

      if (filters.vehicleOfInterestId) {
        whereClause += ` AND vehicle_id = $${paramIndex}`;
        params.push(filters.vehicleOfInterestId);
        paramIndex++;
      }

      if (filters.stage) {
        whereClause += ` AND stage = $${paramIndex}`;
        params.push(filters.stage);
        paramIndex++;
      }

      if (filters.priority) {
        whereClause += ` AND priority = $${paramIndex}`;
        params.push(filters.priority);
        paramIndex++;
      }

      if (filters.assignedAgent) {
        whereClause += ` AND assigned_agent_id = $${paramIndex}`;
        params.push(filters.assignedAgent);
        paramIndex++;
      }

      if (filters.source) {
        whereClause += ` AND source = $${paramIndex}`;
        params.push(filters.source);
        paramIndex++;
      }

      if (filters.isActive !== undefined) {
        whereClause += ` AND is_active = $${paramIndex}`;
        params.push(filters.isActive);
        paramIndex++;
      }

      if (filters.estimatedValueMin !== undefined) {
        whereClause += ` AND estimated_value >= $${paramIndex}`;
        params.push(filters.estimatedValueMin);
        paramIndex++;
      }

      if (filters.estimatedValueMax !== undefined) {
        whereClause += ` AND estimated_value <= $${paramIndex}`;
        params.push(filters.estimatedValueMax);
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
    const countQuery = `SELECT COUNT(*) FROM leads ${whereClause}`;
    const countResult = await this.db.query<{ count: string }>(countQuery, params);
    const total = parseInt(countResult.rows[0]?.count || '0');

    // Build main query with sorting and pagination
    let orderClause = 'ORDER BY created_at DESC';
    if (sort) {
      const fieldMap: Record<string, string> = {
        'score': 'score',
        'created_at': 'created_at',
        'last_contact_date': 'last_contact_date',
        'next_follow_up_date': 'next_follow_up_date',
        'estimated_value': 'estimated_value',
        'stage': 'stage'
      };
      const dbField = fieldMap[sort.field];
      if (dbField) {
        orderClause = `ORDER BY ${dbField} ${sort.direction.toUpperCase()}`;
      }
    }

    const query = `
      SELECT * FROM leads
      ${whereClause}
      ${orderClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await this.db.query<any>(query, params);
    const leads = result.rows.map(row => this.mapRowToLead(row));

    return {
      leads,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async save(lead: Lead): Promise<Lead> {
    if (lead.id) {
      return this.update(lead);
    } else {
      return this.create(lead);
    }
  }

  async update(lead: Lead): Promise<Lead> {
    const query = `
      UPDATE leads SET
        stage = $2, priority = $3, estimated_value = $4, notes = $5,
        assigned_agent_id = $6, is_active = $7, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const params = [
      lead.id,
      lead.stage,
      lead.priority,
      lead.estimatedValue,
      JSON.stringify(lead.notes),
      lead.assignedAgent,
      lead.isActive()
    ];

    const result = await this.db.query<any>(query, params);

    if (result.rows.length === 0) {
      throw new Error('Lead not found or could not be updated');
    }

    return this.mapRowToLead(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM leads WHERE id = $1';
    await this.db.query(query, [id]);
  }

  async findByStage(stage: string): Promise<Lead[]> {
    const query = 'SELECT * FROM leads WHERE stage = $1 ORDER BY created_at DESC';
    const result = await this.db.query<any>(query, [stage]);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  async findByPriority(priority: string): Promise<Lead[]> {
    const query = 'SELECT * FROM leads WHERE priority = $1 ORDER BY created_at DESC';
    const result = await this.db.query<any>(query, [priority]);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  async findByAgentId(agentId: string): Promise<Lead[]> {
    const query = 'SELECT * FROM leads WHERE assigned_agent_id = $1 ORDER BY created_at DESC';
    const result = await this.db.query<any>(query, [agentId]);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  async findActiveLeads(): Promise<Lead[]> {
    const query = 'SELECT * FROM leads WHERE is_active = true ORDER BY priority DESC, created_at DESC';
    const result = await this.db.query<any>(query);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  async findInPriceRange(minValue: number, maxValue: number): Promise<Lead[]> {
    const query = 'SELECT * FROM leads WHERE estimated_value BETWEEN $1 AND $2 ORDER BY estimated_value DESC';
    const result = await this.db.query<any>(query, [minValue, maxValue]);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  async findRecentLeads(days: number): Promise<Lead[]> {
    const query = `
      SELECT * FROM leads
      WHERE 1=1
        AND created_at >= NOW() - INTERVAL '${days} days'
      ORDER BY created_at DESC
    `;
    const result = await this.db.query<any>(query);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  async findOverdueLeads(): Promise<Lead[]> {
    const query = `
      SELECT * FROM leads
      WHERE 1=1
        AND is_active = true
        AND stage NOT IN ('closed_won', 'closed_lost')
        AND updated_at < NOW() - INTERVAL '7 days'
      ORDER BY updated_at ASC
    `;
    const result = await this.db.query<any>(query);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  async findHotLeads(): Promise<Lead[]> {
    const query = `
      SELECT * FROM leads
      WHERE 1=1
        AND is_active = true
        AND priority IN ('high', 'urgent')
        AND stage IN ('qualified', 'demo_scheduled', 'negotiating')
      ORDER BY
        CASE priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          ELSE 3
        END,
        created_at DESC
    `;
    const result = await this.db.query<any>(query);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  async updateStage(id: string, newStage: string, notes?: string): Promise<Lead> {
    const query = `
      UPDATE leads SET
        stage = $2,
        notes = CASE WHEN $3 IS NOT NULL THEN $3 ELSE notes END,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query<any>(query, [id, newStage, notes]);

    if (result.rows.length === 0) {
      throw new Error('Lead not found');
    }

    return this.mapRowToLead(result.rows[0]);
  }

  async assignToAgent(id: string, agentId: string): Promise<Lead> {
    const query = `
      UPDATE leads SET
        assigned_agent_id = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query<any>(query, [id, agentId]);

    if (result.rows.length === 0) {
      throw new Error('Lead not found');
    }

    return this.mapRowToLead(result.rows[0]);
  }

  async markAsLost(id: string, lossReason: string): Promise<Lead> {
    const query = `
      UPDATE leads SET
        stage = 'closed_lost',
        is_active = false,
        loss_reason = $2,
        closed_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query<any>(query, [id, lossReason]);

    if (result.rows.length === 0) {
      throw new Error('Lead not found');
    }

    return this.mapRowToLead(result.rows[0]);
  }

  async markAsWon(id: string, saleAmount?: number): Promise<Lead> {
    const query = `
      UPDATE leads SET
        stage = 'closed_won',
        is_active = false,
        sale_amount = $2,
        closed_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query<any>(query, [id, saleAmount]);

    if (result.rows.length === 0) {
      throw new Error('Lead not found');
    }

    return this.mapRowToLead(result.rows[0]);
  }

  async getLeadConversionStats(): Promise<any> {
    const query = `
      SELECT
        stage,
        COUNT(*) as count,
        AVG(estimated_value) as avg_value,
        SUM(CASE WHEN stage = 'closed_won' THEN sale_amount ELSE 0 END) as total_sales
      FROM leads
      WHERE 1=1
      GROUP BY stage
      ORDER BY
        CASE stage
          WHEN 'new' THEN 1
          WHEN 'contacted' THEN 2
          WHEN 'qualified' THEN 3
          WHEN 'demo_scheduled' THEN 4
          WHEN 'demo_completed' THEN 5
          WHEN 'negotiating' THEN 6
          WHEN 'closed_won' THEN 7
          WHEN 'closed_lost' THEN 8
          ELSE 9
        END
    `;

    const result = await this.db.query<any>(query);
    return result.rows;
  }

  private async create(lead: Lead): Promise<Lead> {
    const query = `
      INSERT INTO leads (
        id, customer_id, vehicle_id, source, stage, priority,
        estimated_value, notes, assigned_agent_id, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      ) RETURNING *
    `;

    const params = [
      lead.id,
      lead.customerId,
      lead.vehicleOfInterestId,
      lead.source,
      lead.stage,
      lead.priority,
      lead.estimatedValue,
      JSON.stringify(lead.notes),
      lead.assignedAgent,
      lead.isActive()
    ];

    const result = await this.db.query<any>(query, params);
    return this.mapRowToLead(result.rows[0]);
  }

  private mapRowToLead(row: any): Lead {
    return Lead.create({
      id: row.id,
      customerId: row.customer_id,
      vehicleOfInterestId: row.vehicle_id,
      source: row.source,
      stage: row.stage,
      priority: row.priority,
      score: row.score || 0,
      qualification: typeof row.qualification === 'string' ? JSON.parse(row.qualification) : row.qualification,
      assignedAgent: row.assigned_agent_id,
      lastContactDate: row.last_contact_date ? new Date(row.last_contact_date) : undefined,
      nextFollowUpDate: row.next_follow_up_date ? new Date(row.next_follow_up_date) : undefined,
      tags: Array.isArray(row.tags) ? row.tags : (row.tags ? JSON.parse(row.tags) : []),
      notes: Array.isArray(row.notes) ? row.notes : (row.notes ? JSON.parse(row.notes) : []),
      estimatedCloseDate: row.estimated_close_date ? new Date(row.estimated_close_date) : undefined,
      estimatedValue: row.estimated_value,
      lostReason: row.lost_reason,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  }

  async findLeadsByStage(stage: string): Promise<Lead[]> {
    return this.findByStage(stage);
  }

  async findLeadsByAgent(agentId: string): Promise<Lead[]> {
    return this.findByAgentId(agentId);
  }

  async findHighPriorityLeads(): Promise<Lead[]> {
    const query = 'SELECT * FROM leads WHERE priority IN (\'high\', \'urgent\') AND stage NOT IN (\'closed_won\', \'closed_lost\') ORDER BY priority DESC, score DESC';
    const result = await this.db.query<any>(query);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  async findLeadsRequiringFollowUp(): Promise<Lead[]> {
    const query = 'SELECT * FROM leads WHERE next_follow_up_date <= NOW() AND stage NOT IN (\'closed_won\', \'closed_lost\') ORDER BY next_follow_up_date ASC';
    const result = await this.db.query<any>(query);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  async findTopScoringLeads(limit: number): Promise<Lead[]> {
    const query = 'SELECT * FROM leads WHERE stage NOT IN (\'closed_won\', \'closed_lost\') ORDER BY score DESC LIMIT $1';
    const result = await this.db.query<any>(query, [limit]);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  async findLeadsByScoreRange(minScore: number, maxScore: number): Promise<Lead[]> {
    const query = 'SELECT * FROM leads WHERE score >= $1 AND score <= $2 ORDER BY score DESC';
    const result = await this.db.query<any>(query, [minScore, maxScore]);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  async recalculateLeadScore(id: string): Promise<Lead> {
    const lead = await this.findById(id);
    if (!lead) throw new Error('Lead not found');

    const score = lead.calculateScore();
    const query = 'UPDATE leads SET score = $2, updated_at = NOW() WHERE id = $1 RETURNING *';
    const result = await this.db.query<any>(query, [id, score]);
    return this.mapRowToLead(result.rows[0]);
  }

  async addNote(id: string, note: string, agentId: string): Promise<Lead> {
    const lead = await this.findById(id);
    if (!lead) throw new Error('Lead not found');

    const notes = [...lead.notes, { content: note, agentId, timestamp: new Date() }];
    const query = 'UPDATE leads SET notes = $2, updated_at = NOW() WHERE id = $1 RETURNING *';
    const result = await this.db.query<any>(query, [id, JSON.stringify(notes)]);
    return this.mapRowToLead(result.rows[0]);
  }

  async scheduleFollowUp(id: string, date: Date): Promise<Lead> {
    const query = 'UPDATE leads SET next_follow_up_date = $2, updated_at = NOW() WHERE id = $1 RETURNING *';
    const result = await this.db.query<any>(query, [id, date]);
    if (result.rows.length === 0) throw new Error('Lead not found');
    return this.mapRowToLead(result.rows[0]);
  }

  async markAsContacted(id: string): Promise<Lead> {
    const query = 'UPDATE leads SET last_contact_date = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *';
    const result = await this.db.query<any>(query, [id]);
    if (result.rows.length === 0) throw new Error('Lead not found');
    return this.mapRowToLead(result.rows[0]);
  }

  async getPipelineAnalytics(): Promise<any> {
    const queries = [
      'SELECT COUNT(*) as total FROM leads',
      'SELECT COUNT(*) as active FROM leads WHERE stage NOT IN (\'closed_won\', \'closed_lost\')',
      'SELECT stage, COUNT(*) as count FROM leads GROUP BY stage',
      'SELECT source, COUNT(*) as count FROM leads GROUP BY source',
      'SELECT priority, COUNT(*) as count FROM leads GROUP BY priority',
      'SELECT AVG(score) as avg_score FROM leads WHERE stage NOT IN (\'closed_won\', \'closed_lost\')',
      'SELECT COUNT(CASE WHEN stage = \'closed_won\' THEN 1 END)::float / NULLIF(COUNT(CASE WHEN stage IN (\'closed_won\', \'closed_lost\') THEN 1 END), 0) * 100 as conversion_rate FROM leads',
      'SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) as avg_days FROM leads WHERE stage IN (\'closed_won\', \'closed_lost\')',
      'SELECT SUM(estimated_value) as total_value FROM leads WHERE stage NOT IN (\'closed_won\', \'closed_lost\')',
      'SELECT lost_reason, COUNT(*) as count FROM leads WHERE stage = \'closed_lost\' AND lost_reason IS NOT NULL GROUP BY lost_reason'
    ];

    const [totalResult, activeResult, stageResult, sourceResult, priorityResult, scoreResult, conversionResult, timeResult, valueResult, lostResult] =
      await Promise.all(queries.map(q => this.db.query<any>(q)));

    const byStage: Record<string, number> = {};
    stageResult?.rows.forEach((row: any) => {
      byStage[row.stage] = parseInt(row.count);
    });

    const bySource: Record<string, number> = {};
    sourceResult?.rows.forEach((row: any) => {
      bySource[row.source] = parseInt(row.count);
    });

    const byPriority: Record<string, number> = {};
    priorityResult?.rows.forEach((row: any) => {
      byPriority[row.priority] = parseInt(row.count);
    });

    const lostReasons: Record<string, number> = {};
    lostResult?.rows.forEach((row: any) => {
      lostReasons[row.lost_reason] = parseInt(row.count);
    });

    return {
      totalLeads: parseInt(totalResult?.rows[0]?.total || '0'),
      activeLeads: parseInt(activeResult?.rows[0]?.active || '0'),
      byStage,
      bySource,
      byPriority,
      averageScore: parseFloat(scoreResult?.rows[0]?.avg_score || '0'),
      conversionRate: parseFloat(conversionResult?.rows[0]?.conversion_rate || '0'),
      averageTimeToClose: parseFloat(timeResult?.rows[0]?.avg_days || '0'),
      totalEstimatedValue: parseFloat(valueResult?.rows[0]?.total_value || '0'),
      lostReasons
    };
  }

  async getAgentPerformance(agentId: string): Promise<any> {
    const queries = [
      'SELECT COUNT(*) as total FROM leads WHERE assigned_agent_id = $1',
      'SELECT COUNT(*) as closed_won FROM leads WHERE assigned_agent_id = $1 AND stage = \'closed_won\'',
      'SELECT COUNT(*) as closed_lost FROM leads WHERE assigned_agent_id = $1 AND stage = \'closed_lost\'',
      'SELECT COUNT(*) as active FROM leads WHERE assigned_agent_id = $1 AND stage NOT IN (\'closed_won\', \'closed_lost\')',
      'SELECT AVG(score) as avg_score FROM leads WHERE assigned_agent_id = $1 AND stage NOT IN (\'closed_won\', \'closed_lost\')',
      'SELECT SUM(estimated_value) as total_value FROM leads WHERE assigned_agent_id = $1 AND stage = \'closed_won\''
    ];

    const [totalResult, wonResult, lostResult, activeResult, scoreResult, valueResult] =
      await Promise.all(queries.map(q => this.db.query<any>(q, [agentId])));

    const total = parseInt(totalResult?.rows[0]?.total || '0');
    const closedWon = parseInt(wonResult?.rows[0]?.closed_won || '0');
    const closedLost = parseInt(lostResult?.rows[0]?.closed_lost || '0');

    return {
      agentId,
      totalLeads: total,
      closedWon,
      closedLost,
      activeLeads: parseInt(activeResult?.rows[0]?.active || '0'),
      conversionRate: total > 0 ? (closedWon / total) * 100 : 0,
      averageScore: parseFloat(scoreResult?.rows[0]?.avg_score || '0'),
      totalValue: parseFloat(valueResult?.rows[0]?.total_value || '0')
    };
  }

  async getLeadsByTimeRange(start: Date, end: Date): Promise<Lead[]> {
    const query = 'SELECT * FROM leads WHERE created_at >= $1 AND created_at <= $2 ORDER BY created_at DESC';
    const result = await this.db.query<any>(query, [start, end]);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  async getConversionFunnel(): Promise<Record<string, { count: number; conversionRate: number }>> {
    const query = `
      SELECT
        stage,
        COUNT(*) as count,
        COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as conversion_rate
      FROM leads
      GROUP BY stage
      ORDER BY
        CASE stage
          WHEN 'new' THEN 1
          WHEN 'contacted' THEN 2
          WHEN 'qualified' THEN 3
          WHEN 'demo_scheduled' THEN 4
          WHEN 'demo_completed' THEN 5
          WHEN 'negotiating' THEN 6
          WHEN 'closed_won' THEN 7
          WHEN 'closed_lost' THEN 8
        END
    `;

    const result = await this.db.query<any>(query);
    const funnel: Record<string, { count: number; conversionRate: number }> = {};

    result.rows.forEach((row: any) => {
      funnel[row.stage] = {
        count: parseInt(row.count),
        conversionRate: parseFloat(row.conversion_rate)
      };
    });

    return funnel;
  }

  async findByIds(ids: string[]): Promise<Lead[]> {
    if (ids.length === 0) return [];
    const query = 'SELECT * FROM leads WHERE id = ANY($1::uuid[])';
    const result = await this.db.query<any>(query, [ids]);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  async bulkUpdateStage(ids: string[], stage: string): Promise<void> {
    if (ids.length === 0) return;
    const query = 'UPDATE leads SET stage = $1, updated_at = NOW() WHERE id = ANY($2::uuid[])';
    await this.db.query(query, [stage, ids]);
  }

  async bulkAssignToAgent(ids: string[], agentId: string): Promise<void> {
    if (ids.length === 0) return;
    const query = 'UPDATE leads SET assigned_agent_id = $1, updated_at = NOW() WHERE id = ANY($2::uuid[])';
    await this.db.query(query, [agentId, ids]);
  }

  async bulkUpdatePriority(ids: string[], priority: string): Promise<void> {
    if (ids.length === 0) return;
    const query = 'UPDATE leads SET priority = $1, updated_at = NOW() WHERE id = ANY($2::uuid[])';
    await this.db.query(query, [priority, ids]);
  }

  async findSimilarLeads(leadId: string, limit: number = 5): Promise<Lead[]> {
    const lead = await this.findById(leadId);
    if (!lead) return [];

    const query = `
      SELECT * FROM leads
      WHERE id != $1
        AND stage NOT IN ('closed_won', 'closed_lost')
        AND ABS(score - $2) <= 10
      ORDER BY ABS(score - $2) ASC
      LIMIT $3
    `;

    const result = await this.db.query<any>(query, [leadId, lead.score, limit]);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  async findLeadsForRecommendation(criteria: any): Promise<Lead[]> {
    const query = 'SELECT * FROM leads WHERE stage NOT IN (\'closed_won\', \'closed_lost\') AND score >= 50 ORDER BY score DESC LIMIT 10';
    const result = await this.db.query<any>(query);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  async getLeadHistoryForModel(customerId: string): Promise<Lead[]> {
    const query = 'SELECT * FROM leads WHERE customer_id = $1 ORDER BY created_at DESC';
    const result = await this.db.query<any>(query, [customerId]);
    return result.rows.map(row => this.mapRowToLead(row));
  }
}