// PostgreSQL implementation of appointment repository interface
// Handles appointment scheduling, calendar management, and analytics

import { Appointment } from '@domain/entities/appointment';
import { LocationVO } from '@domain/value-objects/location';
import { randomUUID } from 'crypto';
import {
  IAppointmentRepository,
  AppointmentSearchFilters,
  AppointmentSortOptions,
  PaginationOptions,
  AppointmentSearchResult,
  CalendarView,
  TimeSlot,
  AppointmentAnalytics,
  AgentPerformance
} from '@application/interfaces/appointment-repository.interface';
import { db } from '../connection';

export class AppointmentRepository implements IAppointmentRepository {

  // Basic CRUD operations
  async findById(id: string): Promise<Appointment | null> {
    const query = `
      SELECT a.*, l.*
      FROM appointments a
      JOIN locations l ON a.location_id = l.id
      WHERE a.id = $1
    `;

    const result = await db.query(query, [id]);
    return result.rows.length > 0 ? this.mapRowToAppointment(result.rows[0]) : null;
  }

  async findByCustomerId(customerId: string): Promise<Appointment[]> {
    const query = `
      SELECT a.*, l.*
      FROM appointments a
      JOIN locations l ON a.location_id = l.id
      WHERE a.customer_id = $1
      ORDER BY a.scheduled_date DESC
    `;

    const result = await db.query(query, [customerId]);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  async findByVehicleId(vehicleId: string): Promise<Appointment[]> {
    const query = `
      SELECT a.*, l.*
      FROM appointments a
      JOIN locations l ON a.location_id = l.id
      WHERE a.vehicle_id = $1
      ORDER BY a.scheduled_date DESC
    `;

    const result = await db.query(query, [vehicleId]);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  async findByLeadId(leadId: string): Promise<Appointment[]> {
    const query = `
      SELECT a.*, l.*
      FROM appointments a
      JOIN locations l ON a.location_id = l.id
      WHERE a.lead_id = $1
      ORDER BY a.scheduled_date DESC
    `;

    const result = await db.query(query, [leadId]);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  async save(appointment: Appointment): Promise<Appointment> {
    const appointmentData = appointment.toJSON();
    const query = `
      INSERT INTO appointments (
        id, customer_id, vehicle_id, lead_id, type, status,
        scheduled_date, estimated_duration, actual_start_time,
        actual_end_time, location_id, agent_id, notes,
        preparation_items, follow_up_required, customer_confirmed,
        reminder_sent, rating, feedback, next_steps, cancellation_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *
    `;

    await db.query(query, [
      appointment.id, appointment.customerId, appointment.vehicleId,
      appointment.leadId, appointment.type, appointment.status,
      appointment.scheduledDate, appointment.estimatedDuration,
      appointment.actualStartTime, appointment.actualEndTime,
      randomUUID(), appointment.agentId, appointment.notes,
      JSON.stringify(appointment.preprationItems), appointment.followUpRequired,
      appointment.customerConfirmed, appointment.reminderSent, appointment.rating,
      appointment.feedback, JSON.stringify(appointment.nextSteps),
      appointment.cancellationReason
    ]);

    return appointment;
  }

  async update(appointment: Appointment): Promise<Appointment> {
    const appointmentData = appointment.toJSON();
    const query = `
      UPDATE appointments SET
        vehicle_id = $2, lead_id = $3, type = $4, status = $5,
        scheduled_date = $6, estimated_duration = $7, actual_start_time = $8,
        actual_end_time = $9, agent_id = $10, notes = $11,
        preparation_items = $12, follow_up_required = $13,
        customer_confirmed = $14, reminder_sent = $15, rating = $16,
        feedback = $17, next_steps = $18, cancellation_reason = $19,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    await db.query(query, [
      appointment.id, appointment.vehicleId, appointment.leadId,
      appointment.type, appointment.status, appointment.scheduledDate,
      appointment.estimatedDuration, appointment.actualStartTime,
      appointment.actualEndTime, appointment.agentId, appointment.notes,
      JSON.stringify(appointment.preprationItems), appointment.followUpRequired,
      appointment.customerConfirmed, appointment.reminderSent, appointment.rating,
      appointment.feedback, JSON.stringify(appointment.nextSteps),
      appointment.cancellationReason
    ]);

    return appointment;
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM appointments WHERE id = $1';
    await db.query(query, [id]);
  }

  // Search and filtering operations
  async search(
    filters?: AppointmentSearchFilters,
    sort?: AppointmentSortOptions,
    pagination?: PaginationOptions
  ): Promise<AppointmentSearchResult> {
    let query = `
      SELECT a.*, l.*
      FROM appointments a
      JOIN locations l ON a.location_id = l.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (filters) {
      if (filters.customerId) {
        query += ` AND a.customer_id = $${paramIndex}`;
        params.push(filters.customerId);
        paramIndex++;
      }

      if (filters.vehicleId) {
        query += ` AND a.vehicle_id = $${paramIndex}`;
        params.push(filters.vehicleId);
        paramIndex++;
      }

      if (filters.leadId) {
        query += ` AND a.lead_id = $${paramIndex}`;
        params.push(filters.leadId);
        paramIndex++;
      }

      if (filters.type) {
        query += ` AND a.type = $${paramIndex}`;
        params.push(filters.type);
        paramIndex++;
      }

      if (filters.status) {
        query += ` AND a.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.agentId) {
        query += ` AND a.agent_id = $${paramIndex}`;
        params.push(filters.agentId);
        paramIndex++;
      }

      if (filters.locationId) {
        query += ` AND a.location_id = $${paramIndex}`;
        params.push(filters.locationId);
        paramIndex++;
      }

      if (filters.scheduledAfter) {
        query += ` AND a.scheduled_date >= $${paramIndex}`;
        params.push(filters.scheduledAfter);
        paramIndex++;
      }

      if (filters.scheduledBefore) {
        query += ` AND a.scheduled_date <= $${paramIndex}`;
        params.push(filters.scheduledBefore);
        paramIndex++;
      }

      if (filters.isToday) {
        query += ` AND DATE(a.scheduled_date) = CURRENT_DATE`;
      }

      if (filters.isUpcoming) {
        query += ` AND a.scheduled_date > CURRENT_TIMESTAMP`;
      }

      if (filters.needsReminder) {
        query += ` AND a.reminder_sent = false AND a.scheduled_date BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '24 hours'`;
      }

      if (filters.customerConfirmed !== undefined) {
        query += ` AND a.customer_confirmed = $${paramIndex}`;
        params.push(filters.customerConfirmed);
        paramIndex++;
      }

      if (filters.rating) {
        query += ` AND a.rating = $${paramIndex}`;
        params.push(filters.rating);
        paramIndex++;
      }
    }

    // Get total count for pagination
    const countQuery = query.replace('SELECT a.*, l.*', 'SELECT COUNT(*)');
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Apply sorting
    if (sort) {
      query += ` ORDER BY a.${sort.field} ${sort.direction.toUpperCase()}`;
    } else {
      query += ` ORDER BY a.scheduled_date ASC`;
    }

    // Apply pagination
    if (pagination) {
      const offset = (pagination.page - 1) * pagination.limit;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(pagination.limit, offset);
    }

    const result = await db.query(query, params);
    const appointments = result.rows.map(row => this.mapRowToAppointment(row));

    const totalPages = pagination ? Math.ceil(total / pagination.limit) : 1;
    const currentPage = pagination?.page || 1;

    return {
      appointments,
      total,
      page: currentPage,
      totalPages
    };
  }

  // Scheduling and calendar operations
  async findAvailableSlots(
    date: Date,
    duration: number,
    agentId?: string,
    locationId?: string
  ): Promise<TimeSlot[]> {
    // Simplified implementation - in production would consider business hours, agent availability, etc.
    const startOfDay = new Date(date);
    startOfDay.setHours(9, 0, 0, 0); // 9 AM start

    const endOfDay = new Date(date);
    endOfDay.setHours(18, 0, 0, 0); // 6 PM end

    const slots: TimeSlot[] = [];

    // Generate hourly slots
    for (let hour = 9; hour < 18; hour++) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);

      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + duration);

      // Check for conflicts
      const conflicts = await this.findConflictingAppointments(slotStart, duration, agentId);

      const slot: TimeSlot = {
        startTime: slotStart,
        endTime: slotEnd,
        isAvailable: conflicts.length === 0
      };
      if (agentId) {
        slot.agentId = agentId;
      }
      slots.push(slot);
    }

    return slots;
  }

  async getCalendarView(startDate: Date, endDate: Date, agentId?: string): Promise<CalendarView[]> {
    let query = `
      SELECT a.*, l.*
      FROM appointments a
      JOIN locations l ON a.location_id = l.id
      WHERE a.scheduled_date BETWEEN $1 AND $2
    `;
    const params: any[] = [startDate, endDate];

    if (agentId) {
      query += ` AND a.agent_id = $3`;
      params.push(agentId);
    }

    query += ` ORDER BY a.scheduled_date ASC`;

    const result = await db.query(query, params);
    const appointments = result.rows.map(row => this.mapRowToAppointment(row));

    // Group appointments by date
    const calendarDays: Record<string, Appointment[]> = {};
    appointments.forEach(appointment => {
      const dateParts = appointment.scheduledDate.toISOString().split('T');
      if (dateParts[0]) {
        const dateKey = dateParts[0];
        if (!calendarDays[dateKey]) {
          calendarDays[dateKey] = [];
        }
        const dayArray = calendarDays[dateKey];
        if (dayArray) {
          dayArray.push(appointment);
        }
      }
    });

    // Generate calendar view
    const calendarView: CalendarView[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateParts = currentDate.toISOString().split('T');
      const dateKey = dateParts[0] || '';
      const dayAppointments = calendarDays[dateKey] || [];

      // Generate available slots for this day
      const availableSlots = await this.findAvailableSlots(currentDate, 60, agentId);

      calendarView.push({
        date: new Date(currentDate),
        appointments: dayAppointments,
        availableSlots,
        totalScheduled: dayAppointments.length
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return calendarView;
  }

  async findConflictingAppointments(
    scheduledDate: Date,
    duration: number,
    agentId?: string
  ): Promise<Appointment[]> {
    const endTime = new Date(scheduledDate);
    endTime.setMinutes(endTime.getMinutes() + duration);

    let query = `
      SELECT a.*, l.*
      FROM appointments a
      JOIN locations l ON a.location_id = l.id
      WHERE a.scheduled_date < $1
      AND (a.scheduled_date + INTERVAL '1 minute' * a.estimated_duration) > $2
      AND a.status NOT IN ('cancelled', 'no_show')
    `;
    const params: any[] = [endTime, scheduledDate];

    if (agentId) {
      query += ` AND a.agent_id = $3`;
      params.push(agentId);
    }

    const result = await db.query(query, params);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  // Appointment lifecycle management
  async confirmAppointment(id: string): Promise<Appointment> {
    const appointment = await this.findById(id);
    if (!appointment) throw new Error('Appointment not found');

    const confirmed = appointment.confirm();
    await this.update(confirmed);
    return confirmed;
  }

  async startAppointment(id: string): Promise<Appointment> {
    const appointment = await this.findById(id);
    if (!appointment) throw new Error('Appointment not found');

    const started = appointment.start();
    await this.update(started);
    return started;
  }

  async completeAppointment(
    id: string,
    rating?: number,
    feedback?: string,
    nextSteps?: string[]
  ): Promise<Appointment> {
    const appointment = await this.findById(id);
    if (!appointment) throw new Error('Appointment not found');

    const completed = appointment.complete(rating, feedback, nextSteps);
    await this.update(completed);
    return completed;
  }

  async cancelAppointment(id: string, reason: string): Promise<Appointment> {
    const appointment = await this.findById(id);
    if (!appointment) throw new Error('Appointment not found');

    const cancelled = appointment.cancel(reason);
    await this.update(cancelled);
    return cancelled;
  }

  async markAsNoShow(id: string): Promise<Appointment> {
    const appointment = await this.findById(id);
    if (!appointment) throw new Error('Appointment not found');

    const noShow = appointment.markAsNoShow();
    await this.update(noShow);
    return noShow;
  }

  async rescheduleAppointment(id: string, newDate: Date): Promise<Appointment> {
    const appointment = await this.findById(id);
    if (!appointment) throw new Error('Appointment not found');

    const rescheduled = appointment.reschedule(newDate);
    await this.update(rescheduled);
    return rescheduled;
  }

  // Reminder and notification management
  async findAppointmentsNeedingReminders(): Promise<Appointment[]> {
    const query = `
      SELECT a.*, l.*
      FROM appointments a
      JOIN locations l ON a.location_id = l.id
      WHERE a.reminder_sent = false
      AND a.scheduled_date BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '24 hours'
      AND a.status IN ('scheduled', 'confirmed')
      ORDER BY a.scheduled_date ASC
    `;

    const result = await db.query(query);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  async markReminderSent(id: string): Promise<Appointment> {
    const appointment = await this.findById(id);
    if (!appointment) throw new Error('Appointment not found');

    const reminded = appointment.markReminderSent();
    await this.update(reminded);
    return reminded;
  }

  async findUpcomingAppointments(hours: number): Promise<Appointment[]> {
    const query = `
      SELECT a.*, l.*
      FROM appointments a
      JOIN locations l ON a.location_id = l.id
      WHERE a.scheduled_date BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '${hours} hours'
      AND a.status IN ('scheduled', 'confirmed')
      ORDER BY a.scheduled_date ASC
    `;

    const result = await db.query(query);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  // Status and tracking queries
  async findTodaysAppointments(agentId?: string): Promise<Appointment[]> {
    let query = `
      SELECT a.*, l.*
      FROM appointments a
      JOIN locations l ON a.location_id = l.id
      WHERE DATE(a.scheduled_date) = CURRENT_DATE
    `;
    const params: any[] = [];

    if (agentId) {
      query += ` AND a.agent_id = $1`;
      params.push(agentId);
    }

    query += ` ORDER BY a.scheduled_date ASC`;

    const result = await db.query(query, params);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  async findOverdueAppointments(): Promise<Appointment[]> {
    const query = `
      SELECT a.*, l.*
      FROM appointments a
      JOIN locations l ON a.location_id = l.id
      WHERE a.scheduled_date < CURRENT_TIMESTAMP
      AND a.status IN ('scheduled', 'confirmed')
      ORDER BY a.scheduled_date ASC
    `;

    const result = await db.query(query);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  async findAppointmentsByStatus(status: string): Promise<Appointment[]> {
    const query = `
      SELECT a.*, l.*
      FROM appointments a
      JOIN locations l ON a.location_id = l.id
      WHERE a.status = $1
      ORDER BY a.scheduled_date DESC
    `;

    const result = await db.query(query, [status]);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  async findAppointmentsByAgent(agentId: string): Promise<Appointment[]> {
    const query = `
      SELECT a.*, l.*
      FROM appointments a
      JOIN locations l ON a.location_id = l.id
      WHERE a.agent_id = $1
      ORDER BY a.scheduled_date DESC
    `;

    const result = await db.query(query, [agentId]);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  // Analytics and reporting
  async getAppointmentAnalytics(startDate?: Date, endDate?: Date): Promise<AppointmentAnalytics> {
    let dateFilter = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (startDate && endDate) {
      dateFilter = ` WHERE created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(startDate, endDate);
      paramIndex += 2;
    }

    const statsQuery = `
      SELECT
        COUNT(*) as total_appointments,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
        COUNT(*) FILTER (WHERE status = 'no_show') as no_show_count,
        AVG(rating) FILTER (WHERE rating IS NOT NULL) as average_rating,
        AVG(EXTRACT(minutes FROM (actual_end_time - actual_start_time))) FILTER (WHERE actual_end_time IS NOT NULL) as avg_duration
      FROM appointments${dateFilter}
    `;

    const typeQuery = `
      SELECT type, COUNT(*) as count
      FROM appointments${dateFilter}
      GROUP BY type
    `;

    const statusQuery = `
      SELECT status, COUNT(*) as count
      FROM appointments${dateFilter}
      GROUP BY status
    `;

    const timeSlotQuery = `
      SELECT EXTRACT(hour FROM scheduled_date) as hour, COUNT(*) as count
      FROM appointments${dateFilter}
      GROUP BY EXTRACT(hour FROM scheduled_date)
      ORDER BY count DESC
      LIMIT 10
    `;

    const [statsResult, typeResult, statusResult, timeSlotResult] = await Promise.all([
      db.query(statsQuery, params),
      db.query(typeQuery, params),
      db.query(statusQuery, params),
      db.query(timeSlotQuery, params)
    ]);

    const stats = statsResult.rows[0];
    const totalAppointments = parseInt(stats.total_appointments);
    const completedCount = parseInt(stats.completed_count);
    const cancelledCount = parseInt(stats.cancelled_count);
    const noShowCount = parseInt(stats.no_show_count);

    const byType: Record<string, number> = {};
    typeResult.rows.forEach(row => {
      byType[row.type] = parseInt(row.count);
    });

    const byStatus: Record<string, number> = {};
    statusResult.rows.forEach(row => {
      byStatus[row.status] = parseInt(row.count);
    });

    const popularTimeSlots = timeSlotResult.rows.map(row => ({
      hour: parseInt(row.hour),
      count: parseInt(row.count)
    }));

    return {
      totalAppointments,
      completedAppointments: completedCount,
      cancelledAppointments: cancelledCount,
      noShowCount,
      completionRate: totalAppointments > 0 ? (completedCount / totalAppointments) * 100 : 0,
      noShowRate: totalAppointments > 0 ? (noShowCount / totalAppointments) * 100 : 0,
      averageRating: parseFloat(stats.average_rating) || 0,
      byType,
      byStatus,
      averageDuration: parseFloat(stats.avg_duration) || 0,
      popularTimeSlots
    };
  }

  async getAgentPerformance(agentId: string, startDate?: Date, endDate?: Date): Promise<AgentPerformance> {
    let dateFilter = '';
    const params: any[] = [agentId];
    let paramIndex = 2;

    if (startDate && endDate) {
      dateFilter = ` AND created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(startDate, endDate);
    }

    const query = `
      SELECT
        COUNT(*) as total_appointments,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
        COUNT(*) FILTER (WHERE status = 'no_show') as no_show_count,
        AVG(rating) FILTER (WHERE rating IS NOT NULL) as average_rating,
        AVG(EXTRACT(minutes FROM (actual_end_time - actual_start_time))) FILTER (WHERE actual_end_time IS NOT NULL) as avg_duration,
        COUNT(*) FILTER (WHERE actual_start_time <= scheduled_date + INTERVAL '15 minutes') as on_time_count,
        COUNT(*) FILTER (WHERE follow_up_required = true) as follow_up_count
      FROM appointments
      WHERE agent_id = $1${dateFilter}
    `;

    const result = await db.query(query, params);
    const stats = result.rows[0];

    const totalAppointments = parseInt(stats.total_appointments);
    const completedCount = parseInt(stats.completed_count);
    const onTimeCount = parseInt(stats.on_time_count);
    const followUpCount = parseInt(stats.follow_up_count);

    return {
      agentId,
      totalAppointments,
      completedCount,
      cancelledCount: parseInt(stats.cancelled_count),
      noShowCount: parseInt(stats.no_show_count),
      averageRating: parseFloat(stats.average_rating) || 0,
      averageDuration: parseFloat(stats.avg_duration) || 0,
      onTimePercentage: totalAppointments > 0 ? (onTimeCount / totalAppointments) * 100 : 0,
      followUpRate: totalAppointments > 0 ? (followUpCount / totalAppointments) * 100 : 0
    };
  }

  async getAppointmentsByTimeRange(start: Date, end: Date): Promise<Appointment[]> {
    const query = `
      SELECT a.*, l.*
      FROM appointments a
      JOIN locations l ON a.location_id = l.id
      WHERE a.scheduled_date BETWEEN $1 AND $2
      ORDER BY a.scheduled_date ASC
    `;

    const result = await db.query(query, [start, end]);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  async getPopularTimeSlots(): Promise<Array<{ hour: number; count: number; day?: string }>> {
    const query = `
      SELECT
        EXTRACT(hour FROM scheduled_date) as hour,
        EXTRACT(dow FROM scheduled_date) as day_of_week,
        COUNT(*) as count
      FROM appointments
      WHERE status = 'completed'
      GROUP BY EXTRACT(hour FROM scheduled_date), EXTRACT(dow FROM scheduled_date)
      ORDER BY count DESC
      LIMIT 20
    `;

    const result = await db.query(query);
    return result.rows.map(row => {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayIndex = parseInt(row.day_of_week);
      const slot: { hour: number; count: number; day?: string } = {
        hour: parseInt(row.hour),
        count: parseInt(row.count)
      };
      if (dayIndex >= 0 && dayIndex < dayNames.length && dayNames[dayIndex]) {
        slot.day = dayNames[dayIndex]!;
      }
      return slot;
    });
  }

  // Customer satisfaction tracking
  async findAppointmentsByRating(minRating: number): Promise<Appointment[]> {
    const query = `
      SELECT a.*, l.*
      FROM appointments a
      JOIN locations l ON a.location_id = l.id
      WHERE a.rating >= $1
      ORDER BY a.rating DESC, a.scheduled_date DESC
    `;

    const result = await db.query(query, [minRating]);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  async getAverageRatingByType(): Promise<Record<string, number>> {
    const query = `
      SELECT type, AVG(rating) as average_rating
      FROM appointments
      WHERE rating IS NOT NULL
      GROUP BY type
    `;

    const result = await db.query(query);
    const ratings: Record<string, number> = {};

    result.rows.forEach(row => {
      ratings[row.type] = parseFloat(row.average_rating);
    });

    return ratings;
  }

  async findUnratedCompletedAppointments(): Promise<Appointment[]> {
    const query = `
      SELECT a.*, l.*
      FROM appointments a
      JOIN locations l ON a.location_id = l.id
      WHERE a.status = 'completed'
      AND a.rating IS NULL
      ORDER BY a.scheduled_date DESC
    `;

    const result = await db.query(query);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  // Business intelligence queries
  async getConversionRateByAppointmentType(): Promise<Record<string, { scheduled: number; completed: number; conversionRate: number }>> {
    const query = `
      SELECT
        type,
        COUNT(*) as scheduled,
        COUNT(*) FILTER (WHERE status = 'completed') as completed
      FROM appointments
      GROUP BY type
    `;

    const result = await db.query(query);
    const conversions: Record<string, { scheduled: number; completed: number; conversionRate: number }> = {};

    result.rows.forEach(row => {
      const scheduled = parseInt(row.scheduled);
      const completed = parseInt(row.completed);
      conversions[row.type] = {
        scheduled,
        completed,
        conversionRate: scheduled > 0 ? (completed / scheduled) * 100 : 0
      };
    });

    return conversions;
  }

  async findHighValueAppointments(minEstimatedValue = 500000): Promise<Appointment[]> {
    const query = `
      SELECT a.*, l.*
      FROM appointments a
      JOIN locations l ON a.location_id = l.id
      JOIN leads ld ON a.lead_id = ld.id
      WHERE ld.estimated_value >= $1
      ORDER BY ld.estimated_value DESC
    `;

    const result = await db.query(query, [minEstimatedValue]);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  async getSeasonalTrends(year: number): Promise<Array<{ month: number; count: number; completionRate: number }>> {
    const query = `
      SELECT
        EXTRACT(month FROM scheduled_date) as month,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed
      FROM appointments
      WHERE EXTRACT(year FROM scheduled_date) = $1
      GROUP BY EXTRACT(month FROM scheduled_date)
      ORDER BY month
    `;

    const result = await db.query(query, [year]);
    return result.rows.map(row => {
      const count = parseInt(row.count);
      const completed = parseInt(row.completed);
      return {
        month: parseInt(row.month),
        count,
        completionRate: count > 0 ? (completed / count) * 100 : 0
      };
    });
  }

  // Bulk operations
  async findByIds(ids: string[]): Promise<Appointment[]> {
    if (ids.length === 0) return [];

    const query = `
      SELECT a.*, l.*
      FROM appointments a
      JOIN locations l ON a.location_id = l.id
      WHERE a.id = ANY($1)
    `;

    const result = await db.query(query, [ids]);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  async bulkUpdateStatus(ids: string[], status: string): Promise<void> {
    if (ids.length === 0) return;

    const query = `
      UPDATE appointments
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($2)
    `;
    await db.query(query, [status, ids]);
  }

  async bulkReschedule(ids: string[], newDates: Date[]): Promise<void> {
    if (ids.length === 0 || ids.length !== newDates.length) return;

    await db.transaction(async (client) => {
      for (let i = 0; i < ids.length; i++) {
        await client.query(
          'UPDATE appointments SET scheduled_date = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [newDates[i], ids[i]]
        );
      }
    });
  }

  async bulkCancel(ids: string[], reason: string): Promise<void> {
    if (ids.length === 0) return;

    const query = `
      UPDATE appointments
      SET status = 'cancelled', cancellation_reason = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($2)
    `;
    await db.query(query, [reason, ids]);
  }

  // Helper method to map database row to Appointment entity
  private mapRowToAppointment(row: any): Appointment {
    const location = LocationVO.create({
      address: row.address,
      city: row.city,
      state: row.state,
      postalCode: row.postal_code,
      country: row.country,
      latitude: row.latitude,
      longitude: row.longitude,
      type: row.type
    });

    return Appointment.create({
      id: row.id,
      customerId: row.customer_id,
      vehicleId: row.vehicle_id,
      leadId: row.lead_id,
      type: row.type,
      status: row.status,
      scheduledDate: row.scheduled_date,
      estimatedDuration: row.estimated_duration,
      actualStartTime: row.actual_start_time,
      actualEndTime: row.actual_end_time,
      location: location.toJSON(),
      agentId: row.agent_id,
      notes: row.notes,
      preprationItems: row.preparation_items || [],
      followUpRequired: row.follow_up_required,
      customerConfirmed: row.customer_confirmed,
      reminderSent: row.reminder_sent,
      rating: row.rating,
      feedback: row.feedback,
      nextSteps: row.next_steps || [],
      cancellationReason: row.cancellation_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}