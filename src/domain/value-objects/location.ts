import { z } from 'zod';

export const LocationSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().min(5, 'Postal code is required'),
  country: z.enum(['MX', 'US']).default('MX'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  type: z.enum(['dealership', 'customer', 'service_center']).default('dealership')
});

export type Location = z.infer<typeof LocationSchema>;

export class LocationVO {
  private constructor(private readonly data: Location) {}

  static create(data: unknown): LocationVO {
    const validated = LocationSchema.parse(data);
    return new LocationVO(validated);
  }

  static createDealership(
    address: string,
    city: string,
    state: string,
    postalCode: string
  ): LocationVO {
    return new LocationVO({
      address,
      city,
      state,
      postalCode,
      country: 'MX',
      type: 'dealership'
    });
  }

  get address(): string {
    return this.data.address;
  }

  get city(): string {
    return this.data.city;
  }

  get state(): string {
    return this.data.state;
  }

  get postalCode(): string {
    return this.data.postalCode;
  }

  get country(): string {
    return this.data.country;
  }

  get coordinates(): { latitude?: number; longitude?: number } {
    const result: { latitude?: number; longitude?: number } = {};
    if (this.data.latitude !== undefined) {
      result.latitude = this.data.latitude;
    }
    if (this.data.longitude !== undefined) {
      result.longitude = this.data.longitude;
    }
    return result;
  }

  get type(): string {
    return this.data.type;
  }

  getFullAddress(): string {
    return `${this.data.address}, ${this.data.city}, ${this.data.state} ${this.data.postalCode}, ${this.data.country}`;
  }

  hasCoordinates(): boolean {
    return this.data.latitude !== undefined && this.data.longitude !== undefined;
  }

  calculateDistance(other: LocationVO): number | null {
    if (!this.hasCoordinates() || !other.hasCoordinates()) {
      return null;
    }

    const lat1 = this.data.latitude!;
    const lon1 = this.data.longitude!;
    const lat2 = other.data.latitude!;
    const lon2 = other.data.longitude!;

    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  toJSON(): Location {
    return { ...this.data };
  }
}