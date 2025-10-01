// Sales pipeline orchestration service for Clean Architecture application layer
// Manages lead lifecycle and sales process workflows

import { Lead } from '@domain/entities/lead';
import {
  ILeadRepository,
  LeadSearchFilters,
  LeadSearchResult
} from '@application/interfaces/lead-repository.interface';

export class LeadService {
  constructor(private leadRepository: ILeadRepository) {}

  async getLeadById(id: string): Promise<Lead | null> {
    if (!id || id.trim().length === 0) {
      throw new Error('Lead ID is required');
    }
    return await this.leadRepository.findById(id);
  }

  async getLeadsByCustomer(customerId: string): Promise<Lead[]> {
    if (!customerId || customerId.trim().length === 0) {
      throw new Error('Customer ID is required');
    }
    return await this.leadRepository.findByCustomerId(customerId);
  }

  async getLeadsByVehicle(vehicleId: string): Promise<Lead[]> {
    if (!vehicleId || vehicleId.trim().length === 0) {
      throw new Error('Vehicle ID is required');
    }
    return await this.leadRepository.findByVehicleId(vehicleId);
  }

  async searchLeads(
    filters?: LeadSearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<LeadSearchResult> {
    if (page < 1) {
      throw new Error('Page number must be greater than 0');
    }
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    return await this.leadRepository.search(filters, undefined, { page, limit });
  }

  async createLead(leadData: {
    customerId: string;
    vehicleId: string;
    source: string;
    estimatedValue: number;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    notes?: string;
    assignedAgentId?: string;
  }): Promise<Lead> {
    this.validateLeadData(leadData);

    const lead = Lead.create({
      customerId: leadData.customerId,
      vehicleId: leadData.vehicleId,
      source: leadData.source,
      estimatedValue: leadData.estimatedValue,
      priority: leadData.priority || 'medium',
      notes: leadData.notes || '',
      assignedAgentId: leadData.assignedAgentId
    });

    return await this.leadRepository.save(lead);
  }

  async updateLead(id: string, updates: Partial<{
    estimatedValue: number;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    notes: string;
    assignedAgentId: string;
  }>): Promise<Lead> {
    const existingLead = await this.leadRepository.findById(id);
    if (!existingLead) {
      throw new Error('Lead not found');
    }

    // Note: Entity methods will need to be implemented
    // For now, we'll update the lead directly through repository

    return await this.leadRepository.update(existingLead);
  }

  async progressLeadStage(id: string, newStage: string): Promise<Lead> {
    const validStages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
    if (!validStages.includes(newStage)) {
      throw new Error(`Invalid stage. Must be one of: ${validStages.join(', ')}`);
    }

    return await this.leadRepository.updateStage(id, newStage);
  }

  async convertLead(id: string): Promise<Lead> {
    return await this.leadRepository.markAsWon(id);
  }

  async markLeadAsLost(id: string, reason: string): Promise<Lead> {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Loss reason is required');
    }

    return await this.leadRepository.markAsLost(id, reason);
  }

  async assignLeadToAgent(id: string, agentId: string): Promise<Lead> {
    if (!agentId || agentId.trim().length === 0) {
      throw new Error('Agent ID is required');
    }

    return await this.leadRepository.assignToAgent(id, agentId);
  }

  async getLeadsByStage(stage: string): Promise<Lead[]> {
    const validStages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
    if (!validStages.includes(stage)) {
      throw new Error(`Invalid stage. Must be one of: ${validStages.join(', ')}`);
    }

    return await this.leadRepository.findByStage(stage);
  }

  async getLeadsByAgent(agentId: string): Promise<Lead[]> {
    if (!agentId || agentId.trim().length === 0) {
      throw new Error('Agent ID is required');
    }
    return await this.leadRepository.findByAgentId(agentId);
  }

  async getActiveLeads(): Promise<Lead[]> {
    return await this.leadRepository.findActiveLeads();
  }

  async getLeadsInPriceRange(minValue: number, maxValue: number): Promise<Lead[]> {
    if (minValue < 0 || maxValue < 0) {
      throw new Error('Price values must be non-negative');
    }
    if (minValue > maxValue) {
      throw new Error('Minimum value cannot be greater than maximum value');
    }

    return await this.leadRepository.findInPriceRange(minValue, maxValue);
  }

  async getRecentLeads(days: number = 30): Promise<Lead[]> {
    if (days < 1 || days > 365) {
      throw new Error('Days parameter must be between 1 and 365');
    }
    return await this.leadRepository.findRecentLeads(days);
  }

  async deleteLead(id: string): Promise<void> {
    const lead = await this.leadRepository.findById(id);
    if (!lead) {
      throw new Error('Lead not found');
    }

    await this.leadRepository.delete(id);
  }

  private validateLeadData(data: any): void {
    if (!data.customerId || data.customerId.trim().length === 0) {
      throw new Error('Customer ID is required');
    }

    if (!data.vehicleId || data.vehicleId.trim().length === 0) {
      throw new Error('Vehicle ID is required');
    }

    if (!data.source || data.source.trim().length === 0) {
      throw new Error('Lead source is required');
    }

    if (!data.estimatedValue || data.estimatedValue < 0) {
      throw new Error('Valid estimated value is required');
    }

    if (data.priority && !['low', 'medium', 'high', 'urgent'].includes(data.priority)) {
      throw new Error('Priority must be one of: low, medium, high, urgent');
    }
  }
}