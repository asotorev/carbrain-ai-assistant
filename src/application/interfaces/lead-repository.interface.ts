// Lead repository interface for Clean Architecture application layer
// Defines contract for lead management and sales pipeline operations

import { Lead } from '@domain/entities/lead';

// Lead search and filtering options
export interface LeadSearchFilters {
  customerId?: string;              // Filter by customer
  vehicleOfInterestId?: string;     // Filter by vehicle of interest
  stage?: 'new' | 'contacted' | 'qualified' | 'demo_scheduled' | 'demo_completed' | 'negotiating' | 'closed_won' | 'closed_lost';
  assignedAgent?: string;           // Filter by assigned agent
  source?: 'website_chat' | 'vehicle_inquiry' | 'phone_call' | 'walk_in' | 'referral' | 'advertising';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  scoreMin?: number;                // Minimum lead score
  scoreMax?: number;                // Maximum lead score
  isActive?: boolean;               // Only active leads (not closed)
  requiresFollowUp?: boolean;       // Leads needing follow-up
  createdAfter?: Date;              // Leads created after date
  createdBefore?: Date;             // Leads created before date
  estimatedValueMin?: number;       // Minimum estimated value
  estimatedValueMax?: number;       // Maximum estimated value
  tags?: string[];                  // Filter by tags
}

// Lead sorting options
export interface LeadSortOptions {
  field: 'score' | 'created_at' | 'last_contact_date' | 'next_follow_up_date' | 'estimated_value' | 'stage';
  direction: 'asc' | 'desc';
}

// Pagination for lead results
export interface PaginationOptions {
  page: number;                     // Page number (1-based)
  limit: number;                    // Items per page
}

// Lead search result with pagination
export interface LeadSearchResult {
  leads: Lead[];                    // Found leads
  total: number;                    // Total count
  page: number;                     // Current page
  totalPages: number;               // Total pages available
}

// Sales pipeline analytics
export interface PipelineAnalytics {
  totalLeads: number;               // Total number of leads
  activeLeads: number;              // Active leads (not closed)
  byStage: Record<string, number>;  // Leads count by stage
  bySource: Record<string, number>; // Leads count by source
  byPriority: Record<string, number>; // Leads count by priority
  averageScore: number;             // Average lead score
  conversionRate: number;           // Percentage of won leads
  averageTimeToClose: number;       // Average days to close
  totalEstimatedValue: number;      // Total pipeline value
  lostReasons: Record<string, number>; // Reasons for lost leads
}

// Lead performance metrics
export interface LeadPerformanceMetrics {
  agentId: string;                  // Agent identifier
  totalLeads: number;               // Total leads assigned
  closedWon: number;                // Successfully closed leads
  closedLost: number;               // Lost leads
  activeLeads: number;              // Currently active leads
  conversionRate: number;           // Win percentage
  averageScore: number;             // Average lead score
  totalValue: number;               // Total closed value
}

// Repository interface for lead management
export interface ILeadRepository {
  // Basic CRUD operations
  findById(id: string): Promise<Lead | null>;
  findByCustomerId(customerId: string): Promise<Lead[]>;
  save(lead: Lead): Promise<Lead>;
  update(lead: Lead): Promise<Lead>;
  delete(id: string): Promise<void>;

  // Search and filtering operations
  search(
    filters?: LeadSearchFilters,
    sort?: LeadSortOptions,
    pagination?: PaginationOptions
  ): Promise<LeadSearchResult>;

  // Sales pipeline queries
  findActiveLeads(): Promise<Lead[]>;
  findLeadsByStage(stage: string): Promise<Lead[]>;
  findLeadsByAgent(agentId: string): Promise<Lead[]>;
  findHighPriorityLeads(): Promise<Lead[]>;
  findLeadsRequiringFollowUp(): Promise<Lead[]>;

  // Lead scoring and prioritization
  findTopScoringLeads(limit: number): Promise<Lead[]>;
  findLeadsByScoreRange(minScore: number, maxScore: number): Promise<Lead[]>;
  recalculateLeadScore(id: string): Promise<Lead>;

  // Lead lifecycle management
  updateStage(id: string, stage: string): Promise<Lead>;
  assignToAgent(id: string, agentId: string): Promise<Lead>;
  addNote(id: string, note: string, agentId: string): Promise<Lead>;
  scheduleFollowUp(id: string, date: Date): Promise<Lead>;
  markAsContacted(id: string): Promise<Lead>;

  // Lead closure operations
  markAsWon(id: string): Promise<Lead>;
  markAsLost(id: string, reason: string): Promise<Lead>;

  // Analytics and reporting
  getPipelineAnalytics(): Promise<PipelineAnalytics>;
  getAgentPerformance(agentId: string): Promise<LeadPerformanceMetrics>;
  getLeadsByTimeRange(start: Date, end: Date): Promise<Lead[]>;
  getConversionFunnel(): Promise<Record<string, { count: number; conversionRate: number }>>;

  // Bulk operations
  findByIds(ids: string[]): Promise<Lead[]>;
  bulkUpdateStage(ids: string[], stage: string): Promise<void>;
  bulkAssignToAgent(ids: string[], agentId: string): Promise<void>;
  bulkUpdatePriority(ids: string[], priority: string): Promise<void>;

  // Advanced queries for AI/ML features
  findSimilarLeads(leadId: string, limit?: number): Promise<Lead[]>;
  findLeadsForRecommendation(criteria: any): Promise<Lead[]>;
  getLeadHistoryForModel(customerId: string): Promise<Lead[]>;
}