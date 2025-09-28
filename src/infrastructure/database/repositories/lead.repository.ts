// PostgreSQL implementation of lead repository interface
// Handles sales pipeline management and lead analytics operations

import { Lead } from '@domain/entities/lead';
import {
  ILeadRepository,
  LeadSearchFilters,
  LeadSortOptions,
  PaginationOptions,
  LeadSearchResult,
  PipelineAnalytics,
  LeadPerformanceMetrics
} from '@application/interfaces/lead-repository.interface';
import { db } from '../connection';

export class LeadRepository implements ILeadRepository {

  // Basic CRUD operations
  async findById(id: string): Promise<Lead | null> {
    const query = 'SELECT * FROM leads WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows.length > 0 ? this.mapRowToLead(result.rows[0]) : null;
  }

  async findByCustomerId(customerId: string): Promise<Lead[]> {
    const query = 'SELECT * FROM leads WHERE customer_id = $1 ORDER BY created_at DESC';
    const result = await db.query(query, [customerId]);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  async save(lead: Lead): Promise<Lead> {
    const query = `
      INSERT INTO leads (
        id, customer_id, vehicle_of_interest_id, stage, score,
        qualification, assigned_agent, last_contact_date,
        next_follow_up_date, source, priority, tags, notes,
        estimated_close_date, estimated_value, lost_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    await db.query(query, [
      lead.id, lead.customerId, lead.vehicleOfInterestId, lead.stage,
      lead.score, JSON.stringify(lead.qualification), lead.assignedAgent,
      lead.lastContactDate, lead.nextFollowUpDate, lead.source, lead.priority,
      JSON.stringify(lead.tags), JSON.stringify(lead.notes),
      lead.estimatedCloseDate, lead.estimatedValue, lead.lostReason
    ]);

    return lead;
  }

  async update(lead: Lead): Promise<Lead> {
    const query = `
      UPDATE leads SET
        vehicle_of_interest_id = $2, stage = $3, score = $4,
        qualification = $5, assigned_agent = $6, last_contact_date = $7,
        next_follow_up_date = $8, priority = $9, tags = $10, notes = $11,
        estimated_close_date = $12, estimated_value = $13, lost_reason = $14,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    await db.query(query, [
      lead.id, lead.vehicleOfInterestId, lead.stage, lead.score,
      JSON.stringify(lead.qualification), lead.assignedAgent,
      lead.lastContactDate, lead.nextFollowUpDate, lead.priority,
      JSON.stringify(lead.tags), JSON.stringify(lead.notes),
      lead.estimatedCloseDate, lead.estimatedValue, lead.lostReason
    ]);

    return lead;
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM leads WHERE id = $1';
    await db.query(query, [id]);
  }

  // Search and filtering operations
  async search(
    filters?: LeadSearchFilters,
    sort?: LeadSortOptions,
    pagination?: PaginationOptions
  ): Promise<LeadSearchResult> {
    let query = 'SELECT * FROM leads WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (filters) {
      if (filters.customerId) {
        query += ` AND customer_id = $${paramIndex}`;
        params.push(filters.customerId);
        paramIndex++;
      }

      if (filters.vehicleOfInterestId) {
        query += ` AND vehicle_of_interest_id = $${paramIndex}`;
        params.push(filters.vehicleOfInterestId);
        paramIndex++;
      }

      if (filters.stage) {
        query += ` AND stage = $${paramIndex}`;
        params.push(filters.stage);
        paramIndex++;
      }

      if (filters.assignedAgent) {
        query += ` AND assigned_agent = $${paramIndex}`;
        params.push(filters.assignedAgent);
        paramIndex++;
      }

      if (filters.source) {
        query += ` AND source = $${paramIndex}`;
        params.push(filters.source);
        paramIndex++;
      }

      if (filters.priority) {
        query += ` AND priority = $${paramIndex}`;
        params.push(filters.priority);
        paramIndex++;
      }

      if (filters.scoreMin) {
        query += ` AND score >= $${paramIndex}`;
        params.push(filters.scoreMin);
        paramIndex++;
      }

      if (filters.scoreMax) {
        query += ` AND score <= $${paramIndex}`;
        params.push(filters.scoreMax);
        paramIndex++;
      }

      if (filters.isActive !== undefined) {
        if (filters.isActive) {
          query += ` AND stage NOT IN ('closed_won', 'closed_lost')`;
        } else {
          query += ` AND stage IN ('closed_won', 'closed_lost')`;
        }
      }

      if (filters.requiresFollowUp) {
        query += ` AND next_follow_up_date <= CURRENT_TIMESTAMP`;
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

      if (filters.estimatedValueMin) {
        query += ` AND estimated_value >= $${paramIndex}`;
        params.push(filters.estimatedValueMin);
        paramIndex++;
      }

      if (filters.estimatedValueMax) {
        query += ` AND estimated_value <= $${paramIndex}`;
        params.push(filters.estimatedValueMax);
        paramIndex++;
      }

      if (filters.tags && filters.tags.length > 0) {
        query += ` AND tags ?| $${paramIndex}`;
        params.push(filters.tags);
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
      query += ` ORDER BY score DESC, created_at DESC`;
    }

    // Apply pagination
    if (pagination) {
      const offset = (pagination.page - 1) * pagination.limit;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(pagination.limit, offset);
    }

    const result = await db.query(query, params);
    const leads = result.rows.map(row => this.mapRowToLead(row));

    const totalPages = pagination ? Math.ceil(total / pagination.limit) : 1;
    const currentPage = pagination?.page || 1;

    return {
      leads,
      total,
      page: currentPage,
      totalPages
    };
  }

  // Sales pipeline queries
  async findActiveLeads(): Promise<Lead[]> {
    const query = `
      SELECT * FROM leads
      WHERE stage NOT IN ('closed_won', 'closed_lost')
      ORDER BY score DESC, next_follow_up_date ASC NULLS LAST
    `;

    const result = await db.query(query);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  async findLeadsByStage(stage: string): Promise<Lead[]> {
    const query = 'SELECT * FROM leads WHERE stage = $1 ORDER BY score DESC';
    const result = await db.query(query, [stage]);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  async findLeadsByAgent(agentId: string): Promise<Lead[]> {
    const query = `
      SELECT * FROM leads
      WHERE assigned_agent = $1
      ORDER BY priority DESC, score DESC
    `;
    const result = await db.query(query, [agentId]);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  async findHighPriorityLeads(): Promise<Lead[]> {
    const query = `
      SELECT * FROM leads
      WHERE priority IN ('high', 'urgent')
      AND stage NOT IN ('closed_won', 'closed_lost')
      ORDER BY
        CASE priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
        END,
        score DESC
    `;

    const result = await db.query(query);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  async findLeadsRequiringFollowUp(): Promise<Lead[]> {
    const query = `
      SELECT * FROM leads
      WHERE next_follow_up_date <= CURRENT_TIMESTAMP
      AND stage NOT IN ('closed_won', 'closed_lost')
      ORDER BY next_follow_up_date ASC
    `;

    const result = await db.query(query);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  // Lead scoring and prioritization
  async findTopScoringLeads(limit: number): Promise<Lead[]> {
    const query = `
      SELECT * FROM leads
      WHERE stage NOT IN ('closed_won', 'closed_lost')
      ORDER BY score DESC
      LIMIT $1
    `;

    const result = await db.query(query, [limit]);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  async findLeadsByScoreRange(minScore: number, maxScore: number): Promise<Lead[]> {
    const query = `
      SELECT * FROM leads
      WHERE score BETWEEN $1 AND $2
      ORDER BY score DESC
    `;

    const result = await db.query(query, [minScore, maxScore]);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  async recalculateLeadScore(id: string): Promise<Lead> {
    const lead = await this.findById(id);
    if (!lead) throw new Error('Lead not found');

    const updatedLead = lead.updateQualification({ ...lead.qualification });

    await this.update(updatedLead);
    return updatedLead;
  }

  // Lead lifecycle management
  async updateStage(id: string, stage: string): Promise<Lead> {
    const lead = await this.findById(id);
    if (!lead) throw new Error('Lead not found');

    const updatedLead = lead.updateStage(stage as any);
    await this.update(updatedLead);
    return updatedLead;
  }

  async assignToAgent(id: string, agentId: string): Promise<Lead> {
    const lead = await this.findById(id);
    if (!lead) throw new Error('Lead not found');

    const updatedLead = lead.assignAgent(agentId);
    await this.update(updatedLead);
    return updatedLead;
  }

  async addNote(id: string, note: string, agentId: string): Promise<Lead> {
    const lead = await this.findById(id);
    if (!lead) throw new Error('Lead not found');

    const updatedLead = lead.addNote(note, agentId);
    await this.update(updatedLead);
    return updatedLead;
  }

  async scheduleFollowUp(id: string, date: Date): Promise<Lead> {
    const lead = await this.findById(id);
    if (!lead) throw new Error('Lead not found');

    const updatedLead = lead.scheduleFollowUp(date);
    await this.update(updatedLead);
    return updatedLead;
  }

  async markAsContacted(id: string): Promise<Lead> {
    const query = `
      UPDATE leads
      SET last_contact_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await db.query(query, [id]);

    const lead = await this.findById(id);
    if (!lead) throw new Error('Lead not found after update');
    return lead;
  }

  // Lead closure operations
  async markAsWon(id: string): Promise<Lead> {
    const lead = await this.findById(id);
    if (!lead) throw new Error('Lead not found');

    const updatedLead = lead.close(true);
    await this.update(updatedLead);
    return updatedLead;
  }

  async markAsLost(id: string, reason: string): Promise<Lead> {
    const lead = await this.findById(id);
    if (!lead) throw new Error('Lead not found');

    const updatedLead = lead.close(false, reason);
    await this.update(updatedLead);
    return updatedLead;
  }

  // Analytics and reporting
  async getPipelineAnalytics(): Promise<PipelineAnalytics> {
    const statsQuery = `
      SELECT
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE stage NOT IN ('closed_won', 'closed_lost')) as active_leads,
        AVG(score) as average_score,
        COUNT(*) FILTER (WHERE stage = 'closed_won') as won_count,
        COUNT(*) FILTER (WHERE stage IN ('closed_won', 'closed_lost')) as closed_count,
        AVG(estimated_value) as total_estimated_value,
        AVG(EXTRACT(days FROM (updated_at - created_at))) FILTER (WHERE stage IN ('closed_won', 'closed_lost')) as avg_time_to_close
      FROM leads
    `;

    const stageQuery = `
      SELECT stage, COUNT(*) as count
      FROM leads
      GROUP BY stage
    `;

    const sourceQuery = `
      SELECT source, COUNT(*) as count
      FROM leads
      GROUP BY source
    `;

    const priorityQuery = `
      SELECT priority, COUNT(*) as count
      FROM leads
      GROUP BY priority
    `;

    const lostReasonsQuery = `
      SELECT lost_reason, COUNT(*) as count
      FROM leads
      WHERE lost_reason IS NOT NULL
      GROUP BY lost_reason
    `;

    const [statsResult, stageResult, sourceResult, priorityResult, lostReasonsResult] = await Promise.all([
      db.query(statsQuery),
      db.query(stageQuery),
      db.query(sourceQuery),
      db.query(priorityQuery),
      db.query(lostReasonsQuery)
    ]);

    const stats = statsResult.rows[0];
    const totalLeads = parseInt(stats.total_leads);
    const wonCount = parseInt(stats.won_count);
    const closedCount = parseInt(stats.closed_count);

    const byStage: Record<string, number> = {};
    stageResult.rows.forEach(row => {
      byStage[row.stage] = parseInt(row.count);
    });

    const bySource: Record<string, number> = {};
    sourceResult.rows.forEach(row => {
      bySource[row.source] = parseInt(row.count);
    });

    const byPriority: Record<string, number> = {};
    priorityResult.rows.forEach(row => {
      byPriority[row.priority] = parseInt(row.count);
    });

    const lostReasons: Record<string, number> = {};
    lostReasonsResult.rows.forEach(row => {
      lostReasons[row.lost_reason] = parseInt(row.count);
    });

    return {
      totalLeads,
      activeLeads: parseInt(stats.active_leads),
      byStage,
      bySource,
      byPriority,
      averageScore: parseFloat(stats.average_score) || 0,
      conversionRate: closedCount > 0 ? (wonCount / closedCount) * 100 : 0,
      averageTimeToClose: parseFloat(stats.avg_time_to_close) || 0,
      totalEstimatedValue: parseFloat(stats.total_estimated_value) || 0,
      lostReasons
    };
  }

  async getAgentPerformance(agentId: string): Promise<LeadPerformanceMetrics> {
    const query = `
      SELECT
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE stage = 'closed_won') as closed_won,
        COUNT(*) FILTER (WHERE stage = 'closed_lost') as closed_lost,
        COUNT(*) FILTER (WHERE stage NOT IN ('closed_won', 'closed_lost')) as active_leads,
        AVG(score) as average_score,
        SUM(estimated_value) FILTER (WHERE stage = 'closed_won') as total_value
      FROM leads
      WHERE assigned_agent = $1
    `;

    const result = await db.query(query, [agentId]);
    const stats = result.rows[0];

    const totalLeads = parseInt(stats.total_leads);
    const closedWon = parseInt(stats.closed_won);
    const closedLost = parseInt(stats.closed_lost);
    const totalClosed = closedWon + closedLost;

    return {
      agentId,
      totalLeads,
      closedWon,
      closedLost,
      activeLeads: parseInt(stats.active_leads),
      conversionRate: totalClosed > 0 ? (closedWon / totalClosed) * 100 : 0,
      averageScore: parseFloat(stats.average_score) || 0,
      totalValue: parseFloat(stats.total_value) || 0
    };
  }

  async getLeadsByTimeRange(start: Date, end: Date): Promise<Lead[]> {
    const query = `
      SELECT * FROM leads
      WHERE created_at BETWEEN $1 AND $2
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, [start, end]);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  async getConversionFunnel(): Promise<Record<string, { count: number; conversionRate: number }>> {
    const query = `
      SELECT
        stage,
        COUNT(*) as count,
        COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
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

    const result = await db.query(query);
    const funnel: Record<string, { count: number; conversionRate: number }> = {};

    result.rows.forEach(row => {
      funnel[row.stage] = {
        count: parseInt(row.count),
        conversionRate: parseFloat(row.percentage)
      };
    });

    return funnel;
  }

  // Bulk operations
  async findByIds(ids: string[]): Promise<Lead[]> {
    if (ids.length === 0) return [];

    const query = 'SELECT * FROM leads WHERE id = ANY($1)';
    const result = await db.query(query, [ids]);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  async bulkUpdateStage(ids: string[], stage: string): Promise<void> {
    if (ids.length === 0) return;

    const query = `
      UPDATE leads
      SET stage = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($2)
    `;
    await db.query(query, [stage, ids]);
  }

  async bulkAssignToAgent(ids: string[], agentId: string): Promise<void> {
    if (ids.length === 0) return;

    const query = `
      UPDATE leads
      SET assigned_agent = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($2)
    `;
    await db.query(query, [agentId, ids]);
  }

  async bulkUpdatePriority(ids: string[], priority: string): Promise<void> {
    if (ids.length === 0) return;

    const query = `
      UPDATE leads
      SET priority = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($2)
    `;
    await db.query(query, [priority, ids]);
  }

  // Advanced queries for AI/ML features
  async findSimilarLeads(leadId: string, limit = 5): Promise<Lead[]> {
    const lead = await this.findById(leadId);
    if (!lead) return [];

    const query = `
      SELECT * FROM leads
      WHERE id != $1
      AND (
        score BETWEEN $2 AND $3
        OR source = $4
        OR stage = $5
      )
      ORDER BY
        ABS(score - $6),
        created_at DESC
      LIMIT $7
    `;

    const result = await db.query(query, [
      leadId,
      lead.score - 10, lead.score + 10,
      lead.source, lead.stage, lead.score,
      limit
    ]);

    return result.rows.map(row => this.mapRowToLead(row));
  }

  async findLeadsForRecommendation(_criteria: any): Promise<Lead[]> {
    // Simplified implementation - could be enhanced with ML algorithms
    const query = `
      SELECT * FROM leads
      WHERE stage NOT IN ('closed_won', 'closed_lost')
      AND score >= 50
      ORDER BY score DESC, created_at DESC
      LIMIT 10
    `;

    const result = await db.query(query);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  async getLeadHistoryForModel(customerId: string): Promise<Lead[]> {
    const query = `
      SELECT * FROM leads
      WHERE customer_id = $1
      ORDER BY created_at ASC
    `;

    const result = await db.query(query, [customerId]);
    return result.rows.map(row => this.mapRowToLead(row));
  }

  // Helper method to map database row to Lead entity
  private mapRowToLead(row: any): Lead {
    return Lead.create({
      id: row.id,
      customerId: row.customer_id,
      vehicleOfInterestId: row.vehicle_of_interest_id,
      stage: row.stage,
      score: row.score,
      qualification: row.qualification || {},
      assignedAgent: row.assigned_agent,
      lastContactDate: row.last_contact_date,
      nextFollowUpDate: row.next_follow_up_date,
      source: row.source,
      priority: row.priority,
      tags: row.tags || [],
      notes: row.notes || [],
      estimatedCloseDate: row.estimated_close_date,
      estimatedValue: row.estimated_value ? parseFloat(row.estimated_value) : undefined,
      lostReason: row.lost_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}