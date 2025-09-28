// Scheduling and calendar management service for Clean Architecture application layer
// Orchestrates appointment booking workflows and calendar operations

import { Appointment } from '@domain/entities/appointment';
import { LocationVO } from '@domain/value-objects/location';
import {
  IAppointmentRepository,
  AppointmentSearchFilters,
  AppointmentSearchResult,
  TimeSlot,
  CalendarView
} from '@application/interfaces/appointment-repository.interface';

export class AppointmentService {
  constructor(private appointmentRepository: IAppointmentRepository) {}

  async getAppointmentById(id: string): Promise<Appointment | null> {
    if (!id || id.trim().length === 0) {
      throw new Error('Appointment ID is required');
    }
    return await this.appointmentRepository.findById(id);
  }

  async getAppointmentsByCustomer(customerId: string): Promise<Appointment[]> {
    if (!customerId || customerId.trim().length === 0) {
      throw new Error('Customer ID is required');
    }
    return await this.appointmentRepository.findByCustomerId(customerId);
  }

  async getAppointmentsByVehicle(vehicleId: string): Promise<Appointment[]> {
    if (!vehicleId || vehicleId.trim().length === 0) {
      throw new Error('Vehicle ID is required');
    }
    return await this.appointmentRepository.findByVehicleId(vehicleId);
  }

  async getAppointmentsByLead(leadId: string): Promise<Appointment[]> {
    if (!leadId || leadId.trim().length === 0) {
      throw new Error('Lead ID is required');
    }
    return await this.appointmentRepository.findByLeadId(leadId);
  }

  async searchAppointments(
    filters?: AppointmentSearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<AppointmentSearchResult> {
    if (page < 1) {
      throw new Error('Page number must be greater than 0');
    }
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    return await this.appointmentRepository.search(filters, undefined, { page, limit });
  }

  async createAppointment(appointmentData: {
    customerId: string;
    vehicleId?: string;
    leadId?: string;
    type: 'test_drive' | 'vehicle_inspection' | 'financing_meeting' | 'delivery' | 'service_consultation';
    scheduledDate: Date;
    estimatedDuration: number;
    location: {
      address: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      latitude?: number;
      longitude?: number;
      type?: string;
    };
    agentId?: string;
    notes?: string;
    preparationItems?: string[];
  }): Promise<Appointment> {
    this.validateAppointmentData(appointmentData);

    await this.checkAvailability(
      appointmentData.scheduledDate,
      appointmentData.estimatedDuration,
      appointmentData.agentId
    );

    const location = LocationVO.create(appointmentData.location);

    const appointment = Appointment.create({
      customerId: appointmentData.customerId,
      vehicleId: appointmentData.vehicleId,
      leadId: appointmentData.leadId,
      type: appointmentData.type,
      scheduledDate: appointmentData.scheduledDate,
      estimatedDuration: appointmentData.estimatedDuration,
      location: location.toJSON(),
      agentId: appointmentData.agentId,
      notes: appointmentData.notes || '',
      preprationItems: appointmentData.preparationItems || []
    });

    return await this.appointmentRepository.save(appointment);
  }

  async updateAppointment(id: string, updates: Partial<{
    scheduledDate: Date;
    estimatedDuration: number;
    agentId: string;
    notes: string;
    preparationItems: string[];
  }>): Promise<Appointment> {
    const existingAppointment = await this.appointmentRepository.findById(id);
    if (!existingAppointment) {
      throw new Error('Appointment not found');
    }

    if (updates.scheduledDate || updates.estimatedDuration || updates.agentId) {
      const newDate = updates.scheduledDate || existingAppointment.scheduledDate;
      const newDuration = updates.estimatedDuration || existingAppointment.estimatedDuration;
      const newAgentId = updates.agentId || existingAppointment.agentId;

      await this.checkAvailability(newDate, newDuration, newAgentId, id);
    }

    return await this.appointmentRepository.update(existingAppointment);
  }

  async rescheduleAppointment(id: string, newDate: Date): Promise<Appointment> {
    if (!newDate || newDate <= new Date()) {
      throw new Error('New appointment date must be in the future');
    }

    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    await this.checkAvailability(newDate, appointment.estimatedDuration, appointment.agentId, id);

    return await this.appointmentRepository.rescheduleAppointment(id, newDate);
  }

  async confirmAppointment(id: string): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    return await this.appointmentRepository.confirmAppointment(id);
  }

  async startAppointment(id: string): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (appointment.status !== 'confirmed') {
      throw new Error('Only confirmed appointments can be started');
    }

    return await this.appointmentRepository.startAppointment(id);
  }

  async completeAppointment(
    id: string,
    rating?: number,
    feedback?: string,
    nextSteps?: string[]
  ): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (appointment.status !== 'in_progress') {
      throw new Error('Only in-progress appointments can be completed');
    }

    if (rating && (rating < 1 || rating > 5)) {
      throw new Error('Rating must be between 1 and 5');
    }

    return await this.appointmentRepository.completeAppointment(id, rating, feedback, nextSteps);
  }

  async cancelAppointment(id: string, reason: string): Promise<Appointment> {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Cancellation reason is required');
    }

    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (['completed', 'cancelled', 'no_show'].includes(appointment.status)) {
      throw new Error('Cannot cancel appointment with current status');
    }

    return await this.appointmentRepository.cancelAppointment(id, reason);
  }

  async markAsNoShow(id: string): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (appointment.status !== 'confirmed') {
      throw new Error('Only confirmed appointments can be marked as no-show');
    }

    return await this.appointmentRepository.markAsNoShow(id);
  }

  async findAvailableSlots(
    date: Date,
    duration: number,
    agentId?: string,
    locationId?: string
  ): Promise<TimeSlot[]> {
    if (!date || date <= new Date()) {
      throw new Error('Date must be in the future');
    }

    if (duration < 15 || duration > 480) {
      throw new Error('Duration must be between 15 minutes and 8 hours');
    }

    return await this.appointmentRepository.findAvailableSlots(date, duration, agentId, locationId);
  }

  async getCalendarView(startDate: Date, endDate: Date, agentId?: string): Promise<CalendarView[]> {
    if (!startDate || !endDate) {
      throw new Error('Start and end dates are required');
    }

    if (startDate >= endDate) {
      throw new Error('Start date must be before end date');
    }

    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      throw new Error('Date range cannot exceed 90 days');
    }

    return await this.appointmentRepository.getCalendarView(startDate, endDate, agentId);
  }

  async getTodaysAppointments(agentId?: string): Promise<Appointment[]> {
    return await this.appointmentRepository.findTodaysAppointments(agentId);
  }

  async getUpcomingAppointments(hours: number = 24): Promise<Appointment[]> {
    if (hours < 1 || hours > 168) {
      throw new Error('Hours parameter must be between 1 and 168 (1 week)');
    }
    return await this.appointmentRepository.findUpcomingAppointments(hours);
  }

  async getOverdueAppointments(): Promise<Appointment[]> {
    return await this.appointmentRepository.findOverdueAppointments();
  }

  async getAppointmentsByStatus(status: string): Promise<Appointment[]> {
    const validStatuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    return await this.appointmentRepository.findAppointmentsByStatus(status);
  }

  async getAppointmentsByAgent(agentId: string): Promise<Appointment[]> {
    if (!agentId || agentId.trim().length === 0) {
      throw new Error('Agent ID is required');
    }
    return await this.appointmentRepository.findAppointmentsByAgent(agentId);
  }

  async sendReminders(): Promise<Appointment[]> {
    const appointmentsNeedingReminders = await this.appointmentRepository.findAppointmentsNeedingReminders();

    for (const appointment of appointmentsNeedingReminders) {
      await this.appointmentRepository.markReminderSent(appointment.id);
    }

    return appointmentsNeedingReminders;
  }

  async deleteAppointment(id: string): Promise<void> {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    await this.appointmentRepository.delete(id);
  }

  private async checkAvailability(
    scheduledDate: Date,
    duration: number,
    agentId?: string,
    excludeAppointmentId?: string
  ): Promise<void> {
    const conflicts = await this.appointmentRepository.findConflictingAppointments(
      scheduledDate,
      duration,
      agentId
    );

    const relevantConflicts = excludeAppointmentId
      ? conflicts.filter(conflict => conflict.id !== excludeAppointmentId)
      : conflicts;

    if (relevantConflicts.length > 0) {
      throw new Error('Time slot is not available due to scheduling conflicts');
    }
  }

  private validateAppointmentData(data: any): void {
    if (!data.customerId || data.customerId.trim().length === 0) {
      throw new Error('Customer ID is required');
    }

    if (!data.type || !['test_drive', 'vehicle_inspection', 'financing_meeting', 'delivery', 'service_consultation'].includes(data.type)) {
      throw new Error('Valid appointment type is required');
    }

    if (!data.scheduledDate || data.scheduledDate <= new Date()) {
      throw new Error('Scheduled date must be in the future');
    }

    if (!data.estimatedDuration || data.estimatedDuration < 15 || data.estimatedDuration > 480) {
      throw new Error('Estimated duration must be between 15 minutes and 8 hours');
    }

    if (!data.location) {
      throw new Error('Appointment location is required');
    }

    if (!data.location.address || data.location.address.trim().length === 0) {
      throw new Error('Location address is required');
    }

    if (!data.location.city || data.location.city.trim().length === 0) {
      throw new Error('Location city is required');
    }
  }
}