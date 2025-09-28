import { z } from 'zod';
import { VehicleSpecificationVO, VehicleSpecificationSchema } from '../value-objects/vehicle-specification';
import { LocationVO, LocationSchema } from '../value-objects/location';

export const VehicleSchema = z.object({
  id: z.string().uuid(),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.number().int().min(1990).max(new Date().getFullYear() + 1),
  price: z.number().min(0, 'Price must be non-negative'),
  mileage: z.number().int().min(0, 'Mileage must be non-negative'),
  condition: z.enum(['new', 'certified_pre_owned', 'used', 'salvage']),
  vin: z.string().length(17, 'VIN must be 17 characters'),
  color: z.string().min(1, 'Color is required'),
  isAvailable: z.boolean().default(true),
  images: z.array(z.string().url()).default([]),
  description: z.string().optional(),
  specification: VehicleSpecificationSchema,
  location: LocationSchema,
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

export type VehicleData = z.infer<typeof VehicleSchema>;

export class Vehicle {
  private constructor(
    private readonly data: VehicleData,
    private readonly _specification: VehicleSpecificationVO,
    private readonly _location: LocationVO
  ) {}

  static create(data: unknown): Vehicle {
    const validated = VehicleSchema.parse(data);
    const specification = VehicleSpecificationVO.create(validated.specification);
    const location = LocationVO.create(validated.location);

    return new Vehicle(validated, specification, location);
  }

  static createNew(params: {
    make: string;
    model: string;
    year: number;
    price: number;
    mileage: number;
    condition: 'new' | 'certified_pre_owned' | 'used' | 'salvage';
    vin: string;
    color: string;
    specification: unknown;
    location: unknown;
    description?: string;
    images?: string[];
  }): Vehicle {
    const id = crypto.randomUUID();
    const vehicleData = {
      id,
      ...params,
      isAvailable: true,
      images: params.images || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return Vehicle.create(vehicleData);
  }

  get id(): string {
    return this.data.id;
  }

  get make(): string {
    return this.data.make;
  }

  get model(): string {
    return this.data.model;
  }

  get year(): number {
    return this.data.year;
  }

  get price(): number {
    return this.data.price;
  }

  get mileage(): number {
    return this.data.mileage;
  }

  get condition(): string {
    return this.data.condition;
  }

  get vin(): string {
    return this.data.vin;
  }

  get color(): string {
    return this.data.color;
  }

  get isAvailable(): boolean {
    return this.data.isAvailable;
  }

  get images(): readonly string[] {
    return this.data.images;
  }

  get description(): string | undefined {
    return this.data.description;
  }

  get specification(): VehicleSpecificationVO {
    return this._specification;
  }

  get location(): LocationVO {
    return this._location;
  }

  get createdAt(): Date {
    return this.data.createdAt;
  }

  get updatedAt(): Date {
    return this.data.updatedAt;
  }

  getDisplayName(): string {
    return `${this.data.year} ${this.data.make} ${this.data.model}`;
  }

  getAge(): number {
    return new Date().getFullYear() - this.data.year;
  }

  isNew(): boolean {
    return this.data.condition === 'new';
  }

  isCertified(): boolean {
    return this.data.condition === 'certified_pre_owned';
  }

  isHighMileage(): boolean {
    const ageInYears = this.getAge();
    const averageMilesPerYear = 12000;
    const expectedMileage = ageInYears * averageMilesPerYear;
    return this.data.mileage > expectedMileage * 1.5;
  }

  updatePrice(newPrice: number): Vehicle {
    if (newPrice < 0) {
      throw new Error('Price must be non-negative');
    }

    const updatedData = {
      ...this.data,
      price: newPrice,
      updatedAt: new Date()
    };

    return new Vehicle(updatedData, this._specification, this._location);
  }

  markAsUnavailable(): Vehicle {
    const updatedData = {
      ...this.data,
      isAvailable: false,
      updatedAt: new Date()
    };

    return new Vehicle(updatedData, this._specification, this._location);
  }

  toJSON(): VehicleData {
    return {
      ...this.data,
      specification: this._specification.toJSON(),
      location: this._location.toJSON()
    };
  }
}