// Appointment repository interface for Clean Architecture application layer
// Defines contract for appointment scheduling and management operations

import { Appointment } from '@domain/entities/appointment';

// Search filters for appointment queries
export interface AppointmentSearchFilters {
  customerId?: string;              // Filter by customer
  vehicleId?: string;               // Filter by vehicle
  leadId?: string;                  // Filter by associated lead
  type?: 'test_drive' | 'vehicle_inspection' | 'financing_meeting' | 'delivery' | 'service_consultation';
  status?: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  agentId?: string;                 // Filter by assigned agent
  locationId?: string;              // Filter by appointment location
  scheduledAfter?: Date;            // Appointments after date
  scheduledBefore?: Date;           // Appointments before date
  isToday?: boolean;                // Only today's appointments
  isUpcoming?: boolean;             // Only future appointments
  needsReminder?: boolean;          // Appointments needing reminders
  customerConfirmed?: boolean;      // Confirmation status
  rating?: number;                  // Filter by customer rating
}

// Appointment sorting options
export interface AppointmentSortOptions {
  field: 'scheduled_date' | 'created_at' | 'estimated_duration' | 'rating' | 'type';
  direction: 'asc' | 'desc';
}

// Pagination for appointment results
export interface PaginationOptions {
  page: number;                     // Page number (1-based)
  limit: number;                    // Items per page
}

// Appointment search result with pagination
export interface AppointmentSearchResult {
  appointments: Appointment[];      // Found appointments
  total: number;                    // Total count
  page: number;                     // Current page
  totalPages: number;               // Total pages available
}

// Calendar view data for scheduling interface
export interface CalendarView {
  date: Date;                       // Calendar date
  appointments: Appointment[];      // Appointments for this date
  availableSlots: TimeSlot[];       // Available time slots
  totalScheduled: number;           // Total appointments for date
}

// Available time slot for scheduling
export interface TimeSlot {
  startTime: Date;                  // Slot start time
  endTime: Date;                    // Slot end time
  isAvailable: boolean;             // Slot availability
  agentId?: string;                 // Available agent for slot
}

// Appointment analytics and metrics
export interface AppointmentAnalytics {
  totalAppointments: number;        // Total scheduled
  completedAppointments: number;    // Successfully completed
  cancelledAppointments: number;    // Cancelled by customer/agent
  noShowCount: number;              // Customer no-shows
  completionRate: number;           // Percentage completed
  noShowRate: number;               // Percentage no-shows
  averageRating: number;            // Average customer rating
  byType: Record<string, number>;   // Appointments by type
  byStatus: Record<string, number>; // Appointments by status
  averageDuration: number;          // Average actual duration
  popularTimeSlots: Array<{ hour: number; count: number }>; // Popular booking times
}

// Agent performance metrics for appointments
export interface AgentPerformance {
  agentId: string;                  // Agent identifier
  totalAppointments: number;        // Total appointments handled
  completedCount: number;           // Successfully completed
  cancelledCount: number;           // Cancelled appointments
  noShowCount: number;              // No-show appointments
  averageRating: number;            // Average customer rating
  averageDuration: number;          // Average appointment duration
  onTimePercentage: number;         // Percentage started on time
  followUpRate: number;             // Percentage with follow-up actions
}

// Repository interface for appointment management
export interface IAppointmentRepository {
  // Basic CRUD operations
  findById(id: string): Promise<Appointment | null>;
  findByCustomerId(customerId: string): Promise<Appointment[]>;
  findByVehicleId(vehicleId: string): Promise<Appointment[]>;
  findByLeadId(leadId: string): Promise<Appointment[]>;
  save(appointment: Appointment): Promise<Appointment>;
  update(appointment: Appointment): Promise<Appointment>;
  delete(id: string): Promise<void>;

  // Search and filtering operations
  search(
    filters?: AppointmentSearchFilters,
    sort?: AppointmentSortOptions,
    pagination?: PaginationOptions
  ): Promise<AppointmentSearchResult>;

  // Scheduling and calendar operations
  findAvailableSlots(
    date: Date,
    duration: number,
    agentId?: string,
    locationId?: string
  ): Promise<TimeSlot[]>;
  getCalendarView(startDate: Date, endDate: Date, agentId?: string): Promise<CalendarView[]>;
  findConflictingAppointments(
    scheduledDate: Date,
    duration: number,
    agentId?: string
  ): Promise<Appointment[]>;

  // Appointment lifecycle management
  confirmAppointment(id: string): Promise<Appointment>;
  startAppointment(id: string): Promise<Appointment>;
  completeAppointment(
    id: string,
    rating?: number,
    feedback?: string,
    nextSteps?: string[]
  ): Promise<Appointment>;
  cancelAppointment(id: string, reason: string): Promise<Appointment>;
  markAsNoShow(id: string): Promise<Appointment>;
  rescheduleAppointment(id: string, newDate: Date): Promise<Appointment>;

  // Reminder and notification management
  findAppointmentsNeedingReminders(): Promise<Appointment[]>;
  markReminderSent(id: string): Promise<Appointment>;
  findUpcomingAppointments(hours: number): Promise<Appointment[]>;

  // Status and tracking queries
  findTodaysAppointments(agentId?: string): Promise<Appointment[]>;
  findOverdueAppointments(): Promise<Appointment[]>;
  findAppointmentsByStatus(status: string): Promise<Appointment[]>;
  findAppointmentsByAgent(agentId: string): Promise<Appointment[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<Appointment[]>;
  findByType(type: string): Promise<Appointment[]>;
  findByStatus(status: string): Promise<Appointment[]>;
  markAsCompleted(id: string, notes?: string): Promise<Appointment>;
  checkAgentAvailability(agentId: string, startTime: Date, duration: number): Promise<boolean>;
  findAgentSchedule(agentId: string, startDate: Date, endDate: Date): Promise<Appointment[]>;

  // Analytics and reporting
  getAppointmentAnalytics(startDate?: Date, endDate?: Date): Promise<AppointmentAnalytics>;
  getAgentPerformance(agentId: string, startDate?: Date, endDate?: Date): Promise<AgentPerformance>;
  getAppointmentsByTimeRange(start: Date, end: Date): Promise<Appointment[]>;
  getPopularTimeSlots(): Promise<Array<{ hour: number; count: number; day?: string }>>;

  // Customer satisfaction tracking
  findAppointmentsByRating(minRating: number): Promise<Appointment[]>;
  getAverageRatingByType(): Promise<Record<string, number>>;
  findUnratedCompletedAppointments(): Promise<Appointment[]>;

  // Business intelligence queries
  getConversionRateByAppointmentType(): Promise<Record<string, { scheduled: number; completed: number; conversionRate: number }>>;
  findHighValueAppointments(minEstimatedValue?: number): Promise<Appointment[]>;
  getSeasonalTrends(year: number): Promise<Array<{ month: number; count: number; completionRate: number }>>;

  // Bulk operations
  findByIds(ids: string[]): Promise<Appointment[]>;
  bulkUpdateStatus(ids: string[], status: string): Promise<void>;
  bulkReschedule(ids: string[], newDates: Date[]): Promise<void>;
  bulkCancel(ids: string[], reason: string): Promise<void>;
}