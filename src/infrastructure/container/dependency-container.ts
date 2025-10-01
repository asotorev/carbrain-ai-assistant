// Clean Architecture dependency injection container
// Wires together all layers of the application using proper dependency injection

import { DatabaseConnection } from '@infrastructure/database/connection';

// Interface Adapters (Controllers)
import { VehicleController } from '@interface-adapters/controllers/vehicle.controller';
import { CustomerController } from '@interface-adapters/controllers/customer.controller';
import { LeadController } from '@interface-adapters/controllers/lead.controller';
import { AppointmentController } from '@interface-adapters/controllers/appointment.controller';

// Application services
import { VehicleService } from '@application/services/vehicle.service';
import { CustomerService } from '@application/services/customer.service';
import { LeadService } from '@application/services/lead.service';
import { AppointmentService } from '@application/services/appointment.service';

// Use cases
import { SearchVehiclesUseCase } from '@application/use-cases/vehicle/search-vehicles.use-case';
import { GetVehicleDetailsUseCase } from '@application/use-cases/vehicle/get-vehicle-details.use-case';
import { CreateCustomerUseCase } from '@application/use-cases/customer/create-customer.use-case';
import { UpdateCustomerUseCase } from '@application/use-cases/customer/update-customer.use-case';

// Infrastructure repositories
import { VehicleRepository } from '@infrastructure/database/repositories/vehicle.repository';
import { CustomerRepository } from '@infrastructure/database/repositories/customer.repository';
import { LeadRepository } from '@infrastructure/database/repositories/lead.repository';
import { AppointmentRepository } from '@infrastructure/database/repositories/appointment.repository';

export interface ApiControllers {
  vehicleController: VehicleController;
  customerController: CustomerController;
  leadController: LeadController;
  appointmentController: AppointmentController;
}

export class DependencyContainer {
  private dbConnection!: DatabaseConnection;

  // Repositories
  private vehicleRepository!: VehicleRepository;
  private customerRepository!: CustomerRepository;
  private leadRepository!: LeadRepository;
  private appointmentRepository!: AppointmentRepository;

  // Services
  private vehicleService!: VehicleService;
  private customerService!: CustomerService;
  private leadService!: LeadService;
  private appointmentService!: AppointmentService;

  // Use cases
  private searchVehiclesUseCase!: SearchVehiclesUseCase;
  private getVehicleDetailsUseCase!: GetVehicleDetailsUseCase;
  private createCustomerUseCase!: CreateCustomerUseCase;
  private updateCustomerUseCase!: UpdateCustomerUseCase;

  // Controllers
  private vehicleController!: VehicleController;
  private customerController!: CustomerController;
  private leadController!: LeadController;
  private appointmentController!: AppointmentController;

  constructor() {
    this.initializeInfrastructure();
    this.initializeRepositories();
    this.initializeServices();
    this.initializeUseCases();
    this.initializeControllers();
  }

  private initializeInfrastructure(): void {
    this.dbConnection = DatabaseConnection.getInstance();
  }

  private initializeRepositories(): void {
    this.vehicleRepository = new VehicleRepository(this.dbConnection);
    this.customerRepository = new CustomerRepository(this.dbConnection);
    this.leadRepository = new LeadRepository(this.dbConnection);
    this.appointmentRepository = new AppointmentRepository(this.dbConnection);
  }

  private initializeServices(): void {
    this.vehicleService = new VehicleService(this.vehicleRepository);
    this.customerService = new CustomerService(this.customerRepository);
    this.leadService = new LeadService(this.leadRepository);
    this.appointmentService = new AppointmentService(this.appointmentRepository);
  }

  private initializeUseCases(): void {
    this.searchVehiclesUseCase = new SearchVehiclesUseCase(this.vehicleRepository);
    this.getVehicleDetailsUseCase = new GetVehicleDetailsUseCase(this.vehicleService);
    this.createCustomerUseCase = new CreateCustomerUseCase(this.customerService);
    this.updateCustomerUseCase = new UpdateCustomerUseCase(this.customerService);
  }

  private initializeControllers(): void {
    this.vehicleController = new VehicleController(
      this.vehicleService,
      this.searchVehiclesUseCase,
      this.getVehicleDetailsUseCase
    );

    this.customerController = new CustomerController(
      this.customerService,
      this.createCustomerUseCase,
      this.updateCustomerUseCase
    );

    this.leadController = new LeadController(this.leadService);

    this.appointmentController = new AppointmentController(this.appointmentService);
  }

  public getControllers(): ApiControllers {
    return {
      vehicleController: this.vehicleController,
      customerController: this.customerController,
      leadController: this.leadController,
      appointmentController: this.appointmentController
    };
  }

  public async initialize(): Promise<void> {
    console.log('Initializing Clean Architecture dependency container...');

    const isHealthy = await this.dbConnection.healthCheck();
    if (!isHealthy) {
      console.warn('Database connection failed - API will work with in-memory repositories');
      console.warn('Note: Data will not persist between server restarts');
    }

    console.log('Clean Architecture dependency container initialized successfully');
    console.log('- Database connection:', isHealthy ? '✓' : '⚠️  (using in-memory fallback)');
    console.log('- Repositories: ✓');
    console.log('- Services: ✓');
    console.log('- Use cases: ✓');
    console.log('- Controllers: ✓');
  }

  public async shutdown(): Promise<void> {
    console.log('Shutting down Clean Architecture dependency container...');
    await this.dbConnection.close();
    console.log('Dependency container shutdown complete');
  }
}