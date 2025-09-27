import { z } from 'zod';

export const VehicleSpecificationSchema = z.object({
  engine: z.string().min(1, 'Engine type is required'),
  transmission: z.enum(['manual', 'automatic', 'cvt']),
  fuelType: z.enum(['gasoline', 'diesel', 'hybrid', 'electric']),
  drivetrain: z.enum(['fwd', 'rwd', 'awd', '4wd']),
  doors: z.number().int().min(2).max(5),
  seats: z.number().int().min(2).max(8),
  safetyFeatures: z.array(z.string()).default([]),
  techFeatures: z.array(z.string()).default([]),
  comfortFeatures: z.array(z.string()).default([])
});

export type VehicleSpecification = z.infer<typeof VehicleSpecificationSchema>;

export class VehicleSpecificationVO {
  private constructor(private readonly data: VehicleSpecification) {}

  static create(data: unknown): VehicleSpecificationVO {
    const validated = VehicleSpecificationSchema.parse(data);
    return new VehicleSpecificationVO(validated);
  }

  get engine(): string {
    return this.data.engine;
  }

  get transmission(): string {
    return this.data.transmission;
  }

  get fuelType(): string {
    return this.data.fuelType;
  }

  get drivetrain(): string {
    return this.data.drivetrain;
  }

  get doors(): number {
    return this.data.doors;
  }

  get seats(): number {
    return this.data.seats;
  }

  get safetyFeatures(): readonly string[] {
    return this.data.safetyFeatures;
  }

  get techFeatures(): readonly string[] {
    return this.data.techFeatures;
  }

  get comfortFeatures(): readonly string[] {
    return this.data.comfortFeatures;
  }

  hasFeature(feature: string): boolean {
    return [
      ...this.data.safetyFeatures,
      ...this.data.techFeatures,
      ...this.data.comfortFeatures
    ].includes(feature);
  }

  toJSON(): VehicleSpecification {
    return { ...this.data };
  }
}