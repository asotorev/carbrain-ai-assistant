import { z } from 'zod';
import { PriceRangeVO, PriceRangeSchema } from '../value-objects/price-range';
import { ContactPreferenceVO, ContactPreferenceSchema } from '../value-objects/contact-preference';

export const CustomerPreferencesSchema = z.object({
  preferredMakes: z.array(z.string()).default([]),
  bodyTypes: z.array(z.enum(['sedan', 'suv', 'pickup', 'hatchback', 'coupe', 'convertible', 'wagon'])).default([]),
  maxMileage: z.number().int().min(0).optional(),
  minYear: z.number().int().min(1990).optional(),
  fuelTypes: z.array(z.enum(['gasoline', 'diesel', 'hybrid', 'electric'])).default([]),
  transmissionTypes: z.array(z.enum(['manual', 'automatic', 'cvt'])).default([]),
  requiredFeatures: z.array(z.string()).default([]),
  dealbreakers: z.array(z.string()).default([])
});

export const CustomerSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Phone number is required'),
  language: z.enum(['es', 'en']).default('es'),
  budget: PriceRangeSchema,
  preferences: CustomerPreferencesSchema.default({}),
  contactPreferences: z.array(ContactPreferenceSchema).default([]),
  hasTestDriven: z.boolean().default(false),
  isFinancingPreApproved: z.boolean().default(false),
  creditScore: z.number().int().min(300).max(850).optional(),
  tradeInVehicle: z.string().optional(),
  notes: z.string().optional(),
  source: z.enum(['website', 'referral', 'advertising', 'walk_in', 'phone']).default('website'),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

export type CustomerData = z.infer<typeof CustomerSchema>;
export type CustomerPreferences = z.infer<typeof CustomerPreferencesSchema>;

export class Customer {
  private constructor(
    private readonly data: CustomerData,
    private readonly _budget: PriceRangeVO,
    private readonly _contactPreferences: ContactPreferenceVO[]
  ) {}

  static create(data: unknown): Customer {
    const validated = CustomerSchema.parse(data);
    const budget = PriceRangeVO.create(validated.budget);
    const contactPreferences = validated.contactPreferences.map(cp =>
      ContactPreferenceVO.create(cp)
    );

    return new Customer(validated, budget, contactPreferences);
  }

  static createNew(params: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    language?: 'es' | 'en';
    budget: unknown;
    preferences?: CustomerPreferences;
    contactPreferences?: unknown[];
    source?: 'website' | 'referral' | 'advertising' | 'walk_in' | 'phone';
  }): Customer {
    const id = crypto.randomUUID();
    const customerData = {
      id,
      ...params,
      language: params.language || 'es',
      preferences: params.preferences || {},
      contactPreferences: params.contactPreferences || [],
      hasTestDriven: false,
      isFinancingPreApproved: false,
      source: params.source || 'website',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return Customer.create(customerData);
  }

  get id(): string {
    return this.data.id;
  }

  get firstName(): string {
    return this.data.firstName;
  }

  get lastName(): string {
    return this.data.lastName;
  }

  get fullName(): string {
    return `${this.data.firstName} ${this.data.lastName}`;
  }

  get email(): string {
    return this.data.email;
  }

  get phone(): string {
    return this.data.phone;
  }

  get language(): string {
    return this.data.language;
  }

  get budget(): PriceRangeVO {
    return this._budget;
  }

  get preferences(): CustomerPreferences {
    return this.data.preferences;
  }

  get contactPreferences(): readonly ContactPreferenceVO[] {
    return this._contactPreferences;
  }

  get hasTestDriven(): boolean {
    return this.data.hasTestDriven;
  }

  get isFinancingPreApproved(): boolean {
    return this.data.isFinancingPreApproved;
  }

  get creditScore(): number | undefined {
    return this.data.creditScore;
  }

  get tradeInVehicle(): string | undefined {
    return this.data.tradeInVehicle;
  }

  get notes(): string | undefined {
    return this.data.notes;
  }

  get source(): string {
    return this.data.source;
  }

  get createdAt(): Date {
    return this.data.createdAt;
  }

  get updatedAt(): Date {
    return this.data.updatedAt;
  }

  getPreferredContactMethod(): ContactPreferenceVO | null {
    const preferred = this._contactPreferences.find(cp => cp.isPreferred);
    return preferred || this._contactPreferences[0] || null;
  }

  isSpanishSpeaker(): boolean {
    return this.data.language === 'es';
  }

  isQualifiedBuyer(): boolean {
    return this.data.isFinancingPreApproved ||
           (this.data.creditScore !== undefined && this.data.creditScore >= 600) ||
           this._budget.monthlyBudget !== undefined;
  }

  hasPreferredMake(make: string): boolean {
    return this.data.preferences.preferredMakes.includes(make.toLowerCase());
  }

  canAfford(price: number): boolean {
    return this._budget.contains(price);
  }

  updateBudget(newBudget: unknown): Customer {
    const budget = PriceRangeVO.create(newBudget);
    const updatedData = {
      ...this.data,
      budget: budget.toJSON(),
      updatedAt: new Date()
    };

    return new Customer(updatedData, budget, this._contactPreferences);
  }

  markAsTestDriven(): Customer {
    const updatedData = {
      ...this.data,
      hasTestDriven: true,
      updatedAt: new Date()
    };

    return new Customer(updatedData, this._budget, this._contactPreferences);
  }

  setCreditScore(score: number): Customer {
    if (score < 300 || score > 850) {
      throw new Error('Credit score must be between 300 and 850');
    }

    const updatedData = {
      ...this.data,
      creditScore: score,
      updatedAt: new Date()
    };

    return new Customer(updatedData, this._budget, this._contactPreferences);
  }

  toJSON(): CustomerData {
    return {
      ...this.data,
      budget: this._budget.toJSON(),
      contactPreferences: this._contactPreferences.map(cp => cp.toJSON())
    };
  }
}