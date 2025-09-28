// Vehicle seed data for CarBrain automotive platform
// Realistic Mexican market inventory with popular brands and appropriate pricing

import { Vehicle } from '@domain/entities/vehicle';
import { VehicleSpecificationVO } from '@domain/value-objects/vehicle-specification';
import { LocationVO } from '@domain/value-objects/location';

// Main dealership location in Mexico City
const mainDealershipLocation = LocationVO.create({
  address: 'Av. Revolución 1234',
  city: 'Ciudad de México',
  state: 'CDMX',
  postalCode: '01000',
  country: 'MX',
  latitude: 19.4326,
  longitude: -99.1332,
  type: 'dealership'
});

// Popular vehicle specifications for Mexican market
const createHondaCivicSpec = () => VehicleSpecificationVO.create({
  engine: '2.0L 4-Cylinder',
  transmission: 'cvt',
  fuelType: 'gasoline',
  drivetrain: 'fwd',
  doors: 4,
  seats: 5,
  safetyFeatures: ['honda_sensing', 'collision_mitigation', 'lane_keeping_assist', 'adaptive_cruise_control'],
  techFeatures: ['android_auto', 'apple_carplay', 'bluetooth', 'usb_ports', 'backup_camera'],
  comfortFeatures: ['air_conditioning', 'power_windows', 'power_locks', 'cruise_control']
});

const createToyotaCorollaSpec = () => VehicleSpecificationVO.create({
  engine: '1.8L 4-Cylinder',
  transmission: 'cvt',
  fuelType: 'gasoline',
  drivetrain: 'fwd',
  doors: 4,
  seats: 5,
  safetyFeatures: ['toyota_safety_sense', 'pre_collision_system', 'lane_departure_alert', 'automatic_high_beams'],
  techFeatures: ['toyota_entune', 'android_auto', 'apple_carplay', 'bluetooth', 'backup_camera'],
  comfortFeatures: ['air_conditioning', 'power_windows', 'power_locks', 'keyless_entry']
});

const createNissanSentraSpec = () => VehicleSpecificationVO.create({
  engine: '2.0L 4-Cylinder',
  transmission: 'cvt',
  fuelType: 'gasoline',
  drivetrain: 'fwd',
  doors: 4,
  seats: 5,
  safetyFeatures: ['intelligent_emergency_braking', 'blind_spot_warning', 'rear_cross_traffic_alert'],
  techFeatures: ['nissan_connect', 'android_auto', 'apple_carplay', 'bluetooth', 'usb_ports'],
  comfortFeatures: ['air_conditioning', 'power_windows', 'power_locks', 'remote_start']
});

const createRAV4Spec = () => VehicleSpecificationVO.create({
  engine: '2.5L 4-Cylinder',
  transmission: 'automatic',
  fuelType: 'gasoline',
  drivetrain: 'awd',
  doors: 5,
  seats: 5,
  safetyFeatures: ['toyota_safety_sense', 'pre_collision_system', 'lane_departure_alert', 'blind_spot_monitor'],
  techFeatures: ['toyota_entune', 'android_auto', 'apple_carplay', 'wireless_charging', 'jbl_audio'],
  comfortFeatures: ['dual_zone_climate', 'heated_seats', 'power_liftgate', 'roof_rails']
});

const createCRVSpec = () => VehicleSpecificationVO.create({
  engine: '1.5L Turbo 4-Cylinder',
  transmission: 'cvt',
  fuelType: 'gasoline',
  drivetrain: 'awd',
  doors: 5,
  seats: 5,
  safetyFeatures: ['honda_sensing', 'collision_mitigation', 'road_departure_mitigation', 'traffic_sign_recognition'],
  techFeatures: ['honda_link', 'android_auto', 'apple_carplay', 'bose_audio', 'hands_free_power_tailgate'],
  comfortFeatures: ['dual_zone_climate', 'heated_seats', 'power_driver_seat', 'remote_start']
});

// Generate realistic VIN numbers for Mexican market
const generateVIN = (make: string, year: number, sequence: number): string => {
  const makeCodes: Record<string, string> = {
    'Honda': '19X',
    'Toyota': 'JTD',
    'Nissan': '3N1',
    'Mazda': 'JM1',
    'Volkswagen': '3VW'
  };

  const makeCode = makeCodes[make] || '1XX';
  const yearCode = year.toString().slice(-1);
  const sequenceStr = sequence.toString().padStart(6, '0');

  return `${makeCode}FB2${yearCode}XY${sequenceStr}`;
};

// Seed data for Mexican automotive market
export const vehicleSeedData: any[] = [
  // Honda Civic models - popular compact sedan in Mexico
  {
    make: 'Honda',
    model: 'Civic',
    year: 2024,
    price: 485000, // MXN - realistic Mexican pricing
    mileage: 0,
    condition: 'new',
    vin: generateVIN('Honda', 2024, 1),
    color: 'Blanco Perla',
    description: 'Honda Civic 2024 nuevo con garantía de fábrica. Incluye Honda Sensing y tecnología avanzada.',
    specification: createHondaCivicSpec().toJSON(),
    location: mainDealershipLocation.toJSON()
  },
  {
    make: 'Honda',
    model: 'Civic',
    year: 2023,
    price: 450000,
    mileage: 15000,
    condition: 'certified_pre_owned',
    vin: generateVIN('Honda', 2023, 2),
    color: 'Gris Metalico',
    description: 'Honda Civic 2023 seminuevo certificado. Un solo dueño, mantenimientos en agencia.',
    specification: createHondaCivicSpec().toJSON(),
    location: mainDealershipLocation.toJSON()
  },
  {
    make: 'Honda',
    model: 'Civic',
    year: 2022,
    price: 420000,
    mileage: 32000,
    condition: 'used',
    vin: generateVIN('Honda', 2022, 3),
    color: 'Negro',
    description: 'Honda Civic 2022 en excelentes condiciones. Historial de mantenimiento completo.',
    specification: createHondaCivicSpec().toJSON(),
    location: mainDealershipLocation.toJSON()
  },

  // Toyota Corolla models - best-selling sedan in Mexico
  {
    make: 'Toyota',
    model: 'Corolla',
    year: 2024,
    price: 465000,
    mileage: 0,
    condition: 'new',
    vin: generateVIN('Toyota', 2024, 4),
    color: 'Blanco',
    description: 'Toyota Corolla 2024 nuevo con Toyota Safety Sense 2.0 de serie. Garantía de 3 años.',
    specification: createToyotaCorollaSpec().toJSON(),
    location: mainDealershipLocation.toJSON()
  },
  {
    make: 'Toyota',
    model: 'Corolla',
    year: 2023,
    price: 430000,
    mileage: 18500,
    condition: 'certified_pre_owned',
    vin: generateVIN('Toyota', 2023, 5),
    color: 'Plata',
    description: 'Toyota Corolla 2023 certificado Toyota. Excelente economía de combustible.',
    specification: createToyotaCorollaSpec().toJSON(),
    location: mainDealershipLocation.toJSON()
  },
  {
    make: 'Toyota',
    model: 'Corolla',
    year: 2021,
    price: 385000,
    mileage: 45000,
    condition: 'used',
    vin: generateVIN('Toyota', 2021, 6),
    color: 'Azul Metalico',
    description: 'Toyota Corolla 2021 seminuevo. Ideal para ciudad, bajo consumo de combustible.',
    specification: createToyotaCorollaSpec().toJSON(),
    location: mainDealershipLocation.toJSON()
  },

  // Nissan Sentra models - affordable and practical
  {
    make: 'Nissan',
    model: 'Sentra',
    year: 2024,
    price: 425000,
    mileage: 0,
    condition: 'new',
    vin: generateVIN('Nissan', 2024, 7),
    color: 'Rojo',
    description: 'Nissan Sentra 2024 nuevo con tecnología Nissan Connect. Amplio espacio interior.',
    specification: createNissanSentraSpec().toJSON(),
    location: mainDealershipLocation.toJSON()
  },
  {
    make: 'Nissan',
    model: 'Sentra',
    year: 2023,
    price: 395000,
    mileage: 22000,
    condition: 'used',
    vin: generateVIN('Nissan', 2023, 8),
    color: 'Gris Oscuro',
    description: 'Nissan Sentra 2023 en perfecto estado. Mantenimientos al día en agencia Nissan.',
    specification: createNissanSentraSpec().toJSON(),
    location: mainDealershipLocation.toJSON()
  },

  // Toyota RAV4 models - popular SUV in Mexico
  {
    make: 'Toyota',
    model: 'RAV4',
    year: 2024,
    price: 685000,
    mileage: 0,
    condition: 'new',
    vin: generateVIN('Toyota', 2024, 9),
    color: 'Blanco Perla',
    description: 'Toyota RAV4 2024 nueva con tracción AWD. Perfecta para ciudad y carretera.',
    specification: createRAV4Spec().toJSON(),
    location: mainDealershipLocation.toJSON()
  },
  {
    make: 'Toyota',
    model: 'RAV4',
    year: 2023,
    price: 625000,
    mileage: 28000,
    condition: 'certified_pre_owned',
    vin: generateVIN('Toyota', 2023, 10),
    color: 'Gris Metalico',
    description: 'Toyota RAV4 2023 certificada. Tracción en las 4 ruedas, ideal para toda la familia.',
    specification: createRAV4Spec().toJSON(),
    location: mainDealershipLocation.toJSON()
  },
  {
    make: 'Toyota',
    model: 'RAV4',
    year: 2022,
    price: 575000,
    mileage: 41000,
    condition: 'used',
    vin: generateVIN('Toyota', 2022, 11),
    color: 'Negro',
    description: 'Toyota RAV4 2022 seminueva. SUV confiable con excelente valor de reventa.',
    specification: createRAV4Spec().toJSON(),
    location: mainDealershipLocation.toJSON()
  },

  // Honda CR-V models - premium compact SUV
  {
    make: 'Honda',
    model: 'CR-V',
    year: 2024,
    price: 720000,
    mileage: 0,
    condition: 'new',
    vin: generateVIN('Honda', 2024, 12),
    color: 'Azul Metalico',
    description: 'Honda CR-V 2024 nueva con motor turbo y AWD. La SUV más vendida en su segmento.',
    specification: createCRVSpec().toJSON(),
    location: mainDealershipLocation.toJSON()
  },
  {
    make: 'Honda',
    model: 'CR-V',
    year: 2023,
    price: 665000,
    mileage: 19500,
    condition: 'certified_pre_owned',
    vin: generateVIN('Honda', 2023, 13),
    color: 'Plata',
    description: 'Honda CR-V 2023 certificada Honda. Equipamiento completo y tecnología Honda Sensing.',
    specification: createCRVSpec().toJSON(),
    location: mainDealershipLocation.toJSON()
  },
  {
    make: 'Honda',
    model: 'CR-V',
    year: 2021,
    price: 585000,
    mileage: 52000,
    condition: 'used',
    vin: generateVIN('Honda', 2021, 14),
    color: 'Rojo Metalico',
    description: 'Honda CR-V 2021 seminueva. SUV espaciosa y eficiente, perfecta para la familia.',
    specification: createCRVSpec().toJSON(),
    location: mainDealershipLocation.toJSON()
  },

  // Additional affordable options for diverse customer base
  {
    make: 'Nissan',
    model: 'Versa',
    year: 2023,
    price: 315000,
    mileage: 25000,
    condition: 'used',
    vin: generateVIN('Nissan', 2023, 15),
    color: 'Blanco',
    description: 'Nissan Versa 2023 económico y confiable. Perfecto como primer auto o para uso urbano.',
    specification: createNissanSentraSpec().toJSON(),
    location: mainDealershipLocation.toJSON()
  },
  {
    make: 'Honda',
    model: 'Fit',
    year: 2022,
    price: 295000,
    mileage: 38000,
    condition: 'used',
    vin: generateVIN('Honda', 2022, 16),
    color: 'Azul',
    description: 'Honda Fit 2022 compacto y eficiente. Excelente para ciudad, muy bajo consumo.',
    specification: createHondaCivicSpec().toJSON(),
    location: mainDealershipLocation.toJSON()
  }
];

// Helper function to create Vehicle entities from seed data
export function createVehicleFromSeedData(data: any): Vehicle {
  return Vehicle.create({
    ...data,
    id: crypto.randomUUID(),
    isAvailable: true,
    images: [
      `https://images.carbrain.mx/${data.make.toLowerCase()}/${data.model.toLowerCase()}/${data.year}/exterior-1.jpg`,
      `https://images.carbrain.mx/${data.make.toLowerCase()}/${data.model.toLowerCase()}/${data.year}/interior-1.jpg`,
      `https://images.carbrain.mx/${data.make.toLowerCase()}/${data.model.toLowerCase()}/${data.year}/exterior-2.jpg`
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  });
}