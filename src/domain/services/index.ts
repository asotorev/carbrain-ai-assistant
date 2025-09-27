// Domain services will be implemented in future commits
// These services will contain complex business logic that doesn't belong in entities

export interface VehicleRecommendationService {
  generateRecommendations(customerId: string): Promise<string[]>;
}

export interface PricingCalculationService {
  calculateFinancingOptions(vehiclePrice: number, customerProfile: any): Promise<any>;
  calculateTradeInValue(vehicleId: string): Promise<number>;
}

export interface LeadScoringService {
  calculateLeadScore(leadId: string): Promise<number>;
  prioritizeLeads(leadIds: string[]): Promise<string[]>;
}