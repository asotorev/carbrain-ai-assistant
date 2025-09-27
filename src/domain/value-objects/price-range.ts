import { z } from 'zod';

export const PriceRangeSchema = z.object({
  min: z.number().min(0, 'Minimum price must be non-negative'),
  max: z.number().min(0, 'Maximum price must be non-negative'),
  currency: z.enum(['MXN', 'USD']).default('MXN'),
  monthlyBudget: z.number().min(0).optional()
}).refine(data => data.max >= data.min, {
  message: 'Maximum price must be greater than or equal to minimum price'
});

export type PriceRange = z.infer<typeof PriceRangeSchema>;

export class PriceRangeVO {
  private constructor(private readonly data: PriceRange) {}

  static create(data: unknown): PriceRangeVO {
    const validated = PriceRangeSchema.parse(data);
    return new PriceRangeVO(validated);
  }

  static fromMonthlyBudget(monthlyBudget: number, currency: 'MXN' | 'USD' = 'MXN'): PriceRangeVO {
    const maxLoanTerm = 60; // months
    const estimatedRate = 0.12; // 12% annual
    const monthlyRate = estimatedRate / 12;

    // Calculate maximum loan amount from monthly payment
    const maxLoanAmount = monthlyBudget * (1 - Math.pow(1 + monthlyRate, -maxLoanTerm)) / monthlyRate;
    const downPaymentPercentage = 0.2; // 20% down payment
    const maxPrice = maxLoanAmount / (1 - downPaymentPercentage);

    return new PriceRangeVO({
      min: 0,
      max: Math.floor(maxPrice),
      currency,
      monthlyBudget
    });
  }

  get min(): number {
    return this.data.min;
  }

  get max(): number {
    return this.data.max;
  }

  get currency(): string {
    return this.data.currency;
  }

  get monthlyBudget(): number | undefined {
    return this.data.monthlyBudget;
  }

  contains(price: number): boolean {
    return price >= this.data.min && price <= this.data.max;
  }

  getRange(): number {
    return this.data.max - this.data.min;
  }

  getMidpoint(): number {
    return (this.data.min + this.data.max) / 2;
  }

  toJSON(): PriceRange {
    return { ...this.data };
  }
}