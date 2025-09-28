import { z } from 'zod';

export const LeadQualificationSchema = z.object({
  budgetConfirmed: z.boolean().default(false),
  timeframeToBuy: z.enum(['immediate', 'within_month', 'within_quarter', 'just_browsing']),
  financingNeeded: z.boolean().default(true),
  hasTradeIn: z.boolean().default(false),
  decisionMaker: z.boolean().default(true),
  specificVehicleInterest: z.boolean().default(false),
  priceNegotiationLevel: z.enum(['price_focused', 'value_focused', 'feature_focused']).default('value_focused')
});

export const LeadSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  vehicleOfInterestId: z.string().uuid().optional(),
  stage: z.enum(['new', 'contacted', 'qualified', 'demo_scheduled', 'demo_completed', 'negotiating', 'closed_won', 'closed_lost']).default('new'),
  score: z.number().int().min(0).max(100).default(0),
  qualification: LeadQualificationSchema,
  assignedAgent: z.string().optional(),
  lastContactDate: z.date().optional(),
  nextFollowUpDate: z.date().optional(),
  source: z.enum(['website_chat', 'vehicle_inquiry', 'phone_call', 'walk_in', 'referral', 'advertising']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  tags: z.array(z.string()).default([]),
  notes: z.array(z.object({
    content: z.string(),
    agentId: z.string(),
    timestamp: z.date().default(() => new Date())
  })).default([]),
  estimatedCloseDate: z.date().optional(),
  estimatedValue: z.number().min(0).optional(),
  lostReason: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

export type LeadData = z.infer<typeof LeadSchema>;
export type LeadQualification = z.infer<typeof LeadQualificationSchema>;
export type LeadNote = { content: string; agentId: string; timestamp: Date };

export class Lead {
  private constructor(private readonly data: LeadData) {}

  static create(data: unknown): Lead {
    const validated = LeadSchema.parse(data);
    return new Lead(validated);
  }

  static createNew(params: {
    customerId: string;
    source: 'website_chat' | 'vehicle_inquiry' | 'phone_call' | 'walk_in' | 'referral' | 'advertising';
    vehicleOfInterestId?: string;
    qualification?: LeadQualification;
    assignedAgent?: string;
    estimatedValue?: number;
  }): Lead {
    const id = crypto.randomUUID();
    const leadData = {
      id,
      ...params,
      stage: 'new' as const,
      score: 0,
      qualification: params.qualification || {
        budgetConfirmed: false,
        timeframeToBuy: 'just_browsing' as const,
        financingNeeded: true,
        hasTradeIn: false,
        decisionMaker: true,
        specificVehicleInterest: false,
        priceNegotiationLevel: 'value_focused' as const
      },
      priority: 'medium' as const,
      tags: [],
      notes: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return Lead.create(leadData);
  }

  get id(): string {
    return this.data.id;
  }

  get customerId(): string {
    return this.data.customerId;
  }

  get vehicleOfInterestId(): string | undefined {
    return this.data.vehicleOfInterestId;
  }

  get stage(): string {
    return this.data.stage;
  }

  get score(): number {
    return this.data.score;
  }

  get qualification(): LeadQualification {
    return this.data.qualification;
  }

  get assignedAgent(): string | undefined {
    return this.data.assignedAgent;
  }

  get lastContactDate(): Date | undefined {
    return this.data.lastContactDate;
  }

  get nextFollowUpDate(): Date | undefined {
    return this.data.nextFollowUpDate;
  }

  get source(): string {
    return this.data.source;
  }

  get priority(): string {
    return this.data.priority;
  }

  get tags(): readonly string[] {
    return this.data.tags;
  }

  get notes(): readonly LeadNote[] {
    return this.data.notes;
  }

  get estimatedCloseDate(): Date | undefined {
    return this.data.estimatedCloseDate;
  }

  get estimatedValue(): number | undefined {
    return this.data.estimatedValue;
  }

  get lostReason(): string | undefined {
    return this.data.lostReason;
  }

  get createdAt(): Date {
    return this.data.createdAt;
  }

  get updatedAt(): Date {
    return this.data.updatedAt;
  }

  isActive(): boolean {
    return !['closed_won', 'closed_lost'].includes(this.data.stage);
  }

  isQualified(): boolean {
    return this.data.stage !== 'new' && this.data.score >= 50;
  }

  isHotLead(): boolean {
    return this.data.score >= 75 || this.data.priority === 'urgent';
  }

  requiresFollowUp(): boolean {
    if (!this.data.nextFollowUpDate) return false;
    return this.data.nextFollowUpDate <= new Date();
  }

  daysSinceCreated(): number {
    const now = new Date();
    const diffTime = now.getTime() - this.data.createdAt.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  calculateScore(): number {
    let score = 0;

    // Budget qualification (30 points)
    if (this.data.qualification.budgetConfirmed) score += 30;

    // Timeframe (25 points)
    const timeframeScores = {
      immediate: 25,
      within_month: 20,
      within_quarter: 10,
      just_browsing: 0
    };
    score += timeframeScores[this.data.qualification.timeframeToBuy];

    // Decision maker (20 points)
    if (this.data.qualification.decisionMaker) score += 20;

    // Specific interest (15 points)
    if (this.data.qualification.specificVehicleInterest) score += 15;

    // Recent activity (10 points)
    if (this.data.lastContactDate) {
      const daysSinceContact = Math.floor(
        (new Date().getTime() - this.data.lastContactDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceContact <= 7) score += 10;
      else if (daysSinceContact <= 30) score += 5;
    }

    return Math.min(score, 100);
  }

  updateStage(
    newStage: 'new' | 'contacted' | 'qualified' | 'demo_scheduled' | 'demo_completed' | 'negotiating' | 'closed_won' | 'closed_lost'
  ): Lead {
    const updatedData = {
      ...this.data,
      stage: newStage,
      lastContactDate: new Date(),
      updatedAt: new Date()
    };

    return new Lead(updatedData);
  }

  addNote(content: string, agentId: string): Lead {
    const newNote = {
      content,
      agentId,
      timestamp: new Date()
    };

    const updatedData = {
      ...this.data,
      notes: [...this.data.notes, newNote],
      updatedAt: new Date()
    };

    return new Lead(updatedData);
  }

  updateQualification(qualification: Partial<LeadQualification>): Lead {
    const updatedQualification = { ...this.data.qualification, ...qualification };
    const newScore = this.calculateScore();

    const updatedData = {
      ...this.data,
      qualification: updatedQualification,
      score: newScore,
      updatedAt: new Date()
    };

    return new Lead(updatedData);
  }

  scheduleFollowUp(date: Date): Lead {
    const updatedData = {
      ...this.data,
      nextFollowUpDate: date,
      updatedAt: new Date()
    };

    return new Lead(updatedData);
  }

  assignAgent(agentId: string): Lead {
    const updatedData = {
      ...this.data,
      assignedAgent: agentId,
      updatedAt: new Date()
    };

    return new Lead(updatedData);
  }

  close(won: boolean, reason?: string): Lead {
    const updatedData = {
      ...this.data,
      stage: won ? 'closed_won' as const : 'closed_lost' as const,
      lostReason: won ? undefined : reason,
      updatedAt: new Date()
    };

    return new Lead(updatedData);
  }

  toJSON(): LeadData {
    return { ...this.data };
  }
}