// Appointment repository implementation for PostgreSQL database
// Implements appointment data access with Clean Architecture principles

import { Appointment } from '@domain/entities/appointment';
import {
  IAppointmentRepository,
  AppointmentSearchFilters,
  AppointmentSearchResult,
  AppointmentSortOptions,
  PaginationOptions,
  TimeSlot,
  CalendarView
} from '@application/interfaces/appointment-repository.interface';
import { DatabaseConnection } from '@infrastructure/database/connection';

export class AppointmentRepository implements IAppointmentRepository {
  constructor(private db: DatabaseConnection) {}

  async findById(id: string): Promise<Appointment | null> {
    const query = 'SELECT * FROM appointments WHERE id = $1';
    const result = await this.db.query<any>(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToAppointment(result.rows[0]);
  }

  async findByCustomerId(customerId: string): Promise<Appointment[]> {
    const query = 'SELECT * FROM appointments WHERE customer_id = $1 ORDER BY scheduled_date DESC';
    const result = await this.db.query<any>(query, [customerId]);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  async findByVehicleId(vehicleId: string): Promise<Appointment[]> {
    const query = 'SELECT * FROM appointments WHERE vehicle_id = $1 ORDER BY scheduled_date DESC';
    const result = await this.db.query<any>(query, [vehicleId]);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  async findByLeadId(leadId: string): Promise<Appointment[]> {
    const query = 'SELECT * FROM appointments WHERE lead_id = $1 ORDER BY scheduled_date DESC';
    const result = await this.db.query<any>(query, [leadId]);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  async search(
    filters?: AppointmentSearchFilters,
    sort?: AppointmentSortOptions,
    pagination?: PaginationOptions
  ): Promise<AppointmentSearchResult> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters) {
      if (filters.customerId) {
        whereClause += ` AND customer_id = $${paramIndex}`;
        params.push(filters.customerId);
        paramIndex++;
      }

      if (filters.vehicleId) {
        whereClause += ` AND vehicle_id = $${paramIndex}`;
        params.push(filters.vehicleId);
        paramIndex++;
      }

      if (filters.agentId) {
        whereClause += ` AND agent_id = $${paramIndex}`;
        params.push(filters.agentId);
        paramIndex++;
      }

      if (filters.locationId) {
        whereClause += ` AND location_id = $${paramIndex}`;
        params.push(filters.locationId);
        paramIndex++;
      }

      if (filters.type) {
        whereClause += ` AND type = $${paramIndex}`;
        params.push(filters.type);
        paramIndex++;
      }

      if (filters.status) {
        whereClause += ` AND status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.scheduledAfter) {
        whereClause += ` AND scheduled_date >= $${paramIndex}`;
        params.push(filters.scheduledAfter);
        paramIndex++;
      }

      if (filters.scheduledBefore) {
        whereClause += ` AND scheduled_date <= $${paramIndex}`;
        params.push(filters.scheduledBefore);
        paramIndex++;
      }

      if (filters.isToday) {
        whereClause += ` AND DATE(scheduled_date) = CURRENT_DATE`;
      }

      if (filters.isUpcoming) {
        whereClause += ` AND scheduled_date > NOW()`;
      }

      if (filters.customerConfirmed !== undefined) {
        whereClause += ` AND customer_confirmed = $${paramIndex}`;
        params.push(filters.customerConfirmed);
        paramIndex++;
      }

      if (filters.needsReminder !== undefined) {
        whereClause += ` AND reminder_sent = false AND scheduled_date > NOW()`;
      }

      if (filters.rating) {
        whereClause += ` AND rating = $${paramIndex}`;
        params.push(filters.rating);
        paramIndex++;
      }
    }

    // Count total records
    const countQuery = `SELECT COUNT(*) FROM appointments ${whereClause}`;
    const countResult = await this.db.query<{ count: string }>(countQuery, params);
    const total = parseInt(countResult.rows[0]?.count || '0');

    // Build main query with sorting and pagination
    let orderClause = 'ORDER BY scheduled_date ASC';
    if (sort) {
      const fieldMap: Record<string, string> = {
        'scheduled_date': 'scheduled_date',
        'created_at': 'created_at',
        'estimated_duration': 'estimated_duration',
        'rating': 'rating',
        'type': 'type'
      };
      const dbField = fieldMap[sort.field];
      if (dbField) {
        orderClause = `ORDER BY ${dbField} ${sort.direction.toUpperCase()}`;
      }
    }

    const query = `
      SELECT * FROM appointments
      ${whereClause}
      ${orderClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await this.db.query<any>(query, params);
    const appointments = result.rows.map(row => this.mapRowToAppointment(row));

    return {
      appointments,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async save(appointment: Appointment): Promise<Appointment> {
    if (appointment.id) {
      return this.update(appointment);
    } else {
      return this.create(appointment);
    }
  }

  async update(appointment: Appointment): Promise<Appointment> {
    const query = `
      UPDATE appointments SET
        scheduled_date = $2, estimated_duration = $3, type = $4, status = $5,
        agent_id = $6, location = $7, notes = $8, preparation_items = $9,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const params = [
      appointment.id,
      appointment.scheduledDate,
      appointment.estimatedDuration,
      appointment.type,
      appointment.status,
      appointment.agentId,
      JSON.stringify(appointment.location),
      appointment.notes,
      JSON.stringify(appointment.preparationItems)
    ];

    const result = await this.db.query<any>(query, params);

    if (result.rows.length === 0) {
      throw new Error('Appointment not found or could not be updated');
    }

    return this.mapRowToAppointment(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM WHERE id = $1';
    await this.db.query(query, [id]);
  }

  async rescheduleAppointment(id: string, newDate: Date): Promise<Appointment> {
    const query = `
      UPDATE appointments SET
        scheduled_date = $2,
        status = 'rescheduled',
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query<any>(query, [id, newDate]);

    if (result.rows.length === 0) {
      throw new Error('Appointment not found');
    }

    return this.mapRowToAppointment(result.rows[0]);
  }

  async confirmAppointment(id: string): Promise<Appointment> {
    const query = `
      UPDATE appointments SET
        status = 'confirmed',
        confirmed_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query<any>(query, [id]);

    if (result.rows.length === 0) {
      throw new Error('Appointment not found');
    }

    return this.mapRowToAppointment(result.rows[0]);
  }

  async startAppointment(id: string): Promise<Appointment> {
    const query = `
      UPDATE appointments SET
        status = 'in_progress',
        started_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query<any>(query, [id]);

    if (result.rows.length === 0) {
      throw new Error('Appointment not found');
    }

    return this.mapRowToAppointment(result.rows[0]);
  }

  async completeAppointment(id: string, rating?: number, feedback?: string, nextSteps?: string[]): Promise<Appointment> {
    const query = `
      UPDATE appointments SET
        status = 'completed',
        completed_at = NOW(),
        rating = $2,
        feedback = $3,
        next_steps = $4,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query<any>(query, [id, rating, feedback, JSON.stringify(nextSteps || [])]);

    if (result.rows.length === 0) {
      throw new Error('Appointment not found');
    }

    return this.mapRowToAppointment(result.rows[0]);
  }

  async cancelAppointment(id: string, reason: string): Promise<Appointment> {
    const query = `
      UPDATE appointments SET
        status = 'cancelled',
        cancellation_reason = $2,
        cancelled_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query<any>(query, [id, reason]);

    if (result.rows.length === 0) {
      throw new Error('Appointment not found');
    }

    return this.mapRowToAppointment(result.rows[0]);
  }

  async markAsNoShow(id: string): Promise<Appointment> {
    const query = `
      UPDATE appointments SET
        status = 'no_show',
        no_show_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query<any>(query, [id]);

    if (result.rows.length === 0) {
      throw new Error('Appointment not found');
    }

    return this.mapRowToAppointment(result.rows[0]);
  }

  async findTodaysAppointments(agentId?: string): Promise<Appointment[]> {
    let query = `
      SELECT * FROM appointments
      WHERE 1=1
        AND DATE(scheduled_date) = CURRENT_DATE
    `;
    const params: any[] = [];

    if (agentId) {
      query += ' AND agent_id = $1';
      params.push(agentId);
    }

    query += ' ORDER BY scheduled_date ASC';

    const result = await this.db.query<any>(query, params);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  async findUpcomingAppointments(days: number): Promise<Appointment[]> {
    const query = `
      SELECT * FROM appointments
      WHERE 1=1
        AND scheduled_date BETWEEN NOW() AND NOW() + INTERVAL '${days} days'
        AND status IN ('scheduled', 'confirmed')
      ORDER BY scheduled_date ASC
    `;

    const result = await this.db.query<any>(query);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  async findOverdueAppointments(): Promise<Appointment[]> {
    const query = `
      SELECT * FROM appointments
      WHERE 1=1
        AND scheduled_date < NOW()
        AND status IN ('scheduled', 'confirmed')
      ORDER BY scheduled_date ASC
    `;

    const result = await this.db.query<any>(query);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  async findAppointmentsByStatus(status: string): Promise<Appointment[]> {
    const query = 'SELECT * FROM appointments WHERE status = $1 ORDER BY scheduled_date ASC';
    const result = await this.db.query<any>(query, [status]);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  async findAppointmentsByAgent(agentId: string): Promise<Appointment[]> {
    const query = 'SELECT * FROM appointments WHERE agent_id = $1 ORDER BY scheduled_date ASC';
    const result = await this.db.query<any>(query, [agentId]);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  async findConflictingAppointments(scheduledDate: Date, duration: number, agentId?: string): Promise<Appointment[]> {
    const endTime = new Date(scheduledDate.getTime() + duration * 60000); // duration in minutes

    let query = `
      SELECT * FROM appointments
      WHERE 1=1
        AND status IN ('scheduled', 'confirmed', 'in_progress')
        AND (
          (scheduled_date BETWEEN $1 AND $2)
          OR (scheduled_date + INTERVAL '1 minute' * estimated_duration BETWEEN $1 AND $2)
          OR (scheduled_date <= $1 AND scheduled_date + INTERVAL '1 minute' * estimated_duration >= $2)
        )
    `;
    const params: any[] = [scheduledDate, endTime];

    if (agentId) {
      query += ' AND agent_id = $3';
      params.push(agentId);
    }

    const result = await this.db.query<any>(query, params);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  async findAvailableSlots(date: Date, duration: number, agentId?: string, locationId?: string): Promise<TimeSlot[]> {
    // This is a simplified implementation
    // In a real system, you'd consider business hours, agent availability, etc.
    const slots: TimeSlot[] = [];
    const startHour = 9; // 9 AM
    const endHour = 18; // 6 PM
    const slotDuration = duration;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const slotStart = new Date(date);
        slotStart.setHours(hour, minute, 0, 0);

        const slotEnd = new Date(slotStart.getTime() + duration * 60000);

        // Check for conflicts
        const conflicts = await this.findConflictingAppointments(slotStart, duration, agentId);

        if (conflicts.length === 0) {
          const slot: any = {
            startTime: slotStart,
            endTime: slotEnd,
            isAvailable: true
          };
          if (agentId) {
            slot.agentId = agentId;
          }
          slots.push(slot);
        }
      }
    }

    return slots;
  }

  async getCalendarView(startDate: Date, endDate: Date, agentId?: string): Promise<CalendarView[]> {
    let query = `
      SELECT
        DATE(scheduled_date) as date,
        COUNT(*) as appointment_count,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', id,
            'time', scheduled_date,
            'type', type,
            'status', status,
            'customer_id', customer_id
          )
        ) as appointments
      FROM appointments
      WHERE 1=1
        AND scheduled_date BETWEEN $1 AND $2
    `;
    const params: any[] = [startDate, endDate];

    if (agentId) {
      query += ' AND agent_id = $3';
      params.push(agentId);
    }

    query += ' GROUP BY DATE(scheduled_date) ORDER BY date';

    const result = await this.db.query<any>(query, params);
    return result.rows.map(row => ({
      date: row.date,
      appointments: row.appointments,
      availableSlots: [],
      totalScheduled: parseInt(row.appointment_count)
    }));
  }

  async findAppointmentsNeedingReminders(): Promise<Appointment[]> {
    // Find appointments that need reminders (24 hours before, not yet sent)
    const query = `
      SELECT * FROM appointments
      WHERE 1=1
        AND status IN ('scheduled', 'confirmed')
        AND scheduled_date BETWEEN NOW() + INTERVAL '23 hours' AND NOW() + INTERVAL '25 hours'
        AND reminder_sent_at IS NULL
      ORDER BY scheduled_date ASC
    `;

    const result = await this.db.query<any>(query);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  async markReminderSent(id: string): Promise<Appointment> {
    const query = `
      UPDATE appointments SET
        reminder_sent = true,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query<any>(query, [id]);
    if (result.rows.length === 0) {
      throw new Error('Appointment not found');
    }
    return this.mapRowToAppointment(result.rows[0]);
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Appointment[]> {
    const query = `
      SELECT * FROM appointments
      WHERE 1=1
        AND scheduled_date BETWEEN $1 AND $2
      ORDER BY scheduled_date ASC
    `;
    const result = await this.db.query<any>(query, [startDate, endDate]);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  async findByType(type: string): Promise<Appointment[]> {
    const query = 'SELECT * FROM appointments WHERE type = $1 ORDER BY scheduled_date DESC';
    const result = await this.db.query<any>(query, [type]);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  async findByStatus(status: string): Promise<Appointment[]> {
    const query = 'SELECT * FROM appointments WHERE status = $1 ORDER BY scheduled_date DESC';
    const result = await this.db.query<any>(query, [status]);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  async markAsCompleted(id: string, notes?: string): Promise<Appointment> {
    const query = `
      UPDATE appointments SET
        status = 'completed',
        completion_notes = $2,
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query<any>(query, [id, notes]);

    if (result.rows.length === 0) {
      throw new Error('Appointment not found');
    }

    return this.mapRowToAppointment(result.rows[0]);
  }

  async checkAgentAvailability(
    agentId: string,
    startTime: Date,
    duration: number
  ): Promise<boolean> {
    const endTime = new Date(startTime.getTime() + duration * 60000);

    const query = `
      SELECT COUNT(*) as count FROM appointments
      WHERE agent_id = $1
        AND status IN ('scheduled', 'confirmed', 'in_progress')
        AND (
          (scheduled_date <= $2 AND (scheduled_date + INTERVAL '1 minute' * estimated_duration) > $2)
          OR (scheduled_date < $3 AND (scheduled_date + INTERVAL '1 minute' * estimated_duration) >= $3)
          OR (scheduled_date >= $2 AND scheduled_date < $3)
        )
    `;

    const result = await this.db.query<any>(query, [agentId, startTime, endTime]);
    return parseInt(result.rows[0]?.count || '0') === 0;
  }

  async findAgentSchedule(agentId: string, startDate: Date, endDate: Date): Promise<Appointment[]> {
    const query = `
      SELECT * FROM appointments
      WHERE agent_id = $1
       
        AND scheduled_date BETWEEN $2 AND $3
      ORDER BY scheduled_date ASC
    `;
    const result = await this.db.query<any>(query, [agentId, startDate, endDate]);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  private async create(appointment: Appointment): Promise<Appointment> {
    const query = `
      INSERT INTO appointments (
        id, customer_id, vehicle_id, lead_id, type, scheduled_date,
        estimated_duration, agent_id, location, notes, preparation_items, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      ) RETURNING *
    `;

    const params = [
      appointment.id,
      appointment.customerId,
      appointment.vehicleId,
      appointment.leadId,
      appointment.type,
      appointment.scheduledDate,
      appointment.estimatedDuration,
      appointment.agentId,
      JSON.stringify(appointment.location),
      appointment.notes,
      JSON.stringify(appointment.preparationItems),
      appointment.status
    ];

    const result = await this.db.query<any>(query, params);
    return this.mapRowToAppointment(result.rows[0]);
  }

  private mapRowToAppointment(row: any): Appointment {
    return Appointment.create({
      id: row.id,
      customerId: row.customer_id,
      vehicleId: row.vehicle_id,
      leadId: row.lead_id,
      type: row.type,
      scheduledDate: row.scheduled_date,
      estimatedDuration: row.estimated_duration,
      agentId: row.agent_id,
      location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
      notes: row.notes,
      preparationItems: typeof row.preparation_items === 'string' ? JSON.parse(row.preparation_items || '[]') : (row.preparation_items || []),
      status: row.status,
      confirmedAt: row.confirmed_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      cancelledAt: row.cancelled_at,
      noShowAt: row.no_show_at,
      cancellationReason: row.cancellation_reason,
      rating: row.rating,
      feedback: row.feedback,
      nextSteps: typeof row.next_steps === 'string' ? JSON.parse(row.next_steps || '[]') : (row.next_steps || []),
      reminderSentAt: row.reminder_sent_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  async getAppointmentsByTimeRange(start: Date, end: Date): Promise<Appointment[]> {
    return this.findByDateRange(start, end);
  }

  async getPopularTimeSlots(): Promise<Array<{ hour: number; count: number }>> {
    const query = `
      SELECT EXTRACT(HOUR FROM scheduled_date) as hour, COUNT(*) as count
      FROM appointments
      WHERE status IN ('scheduled', 'confirmed', 'completed')
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 10
    `;
    const result = await this.db.query<any>(query);
    return result.rows.map((row: any) => ({
      hour: parseInt(row.hour),
      count: parseInt(row.count)
    }));
  }

  async getAppointmentAnalytics(startDate?: Date, endDate?: Date): Promise<any> {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (startDate) {
      whereClause += ` AND scheduled_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND scheduled_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    const queries = [
      `SELECT COUNT(*) as total FROM appointments ${whereClause}`,
      `SELECT type, COUNT(*) as count FROM appointments ${whereClause} GROUP BY type`,
      `SELECT status, COUNT(*) as count FROM appointments ${whereClause} GROUP BY status`,
      `SELECT AVG(estimated_duration) as avg_duration FROM appointments ${whereClause} WHERE status = 'completed'`
    ];

    const [totalResult, typeResult, statusResult, durationResult] =
      await Promise.all(queries.map(q => this.db.query<any>(q, params)));

    const byType: Record<string, number> = {};
    typeResult?.rows.forEach((row: any) => {
      byType[row.type] = parseInt(row.count);
    });

    const byStatus: Record<string, number> = {};
    statusResult?.rows.forEach((row: any) => {
      byStatus[row.status] = parseInt(row.count);
    });

    return {
      totalAppointments: parseInt(totalResult?.rows[0]?.total || '0'),
      byType,
      byStatus,
      averageDuration: parseFloat(durationResult?.rows[0]?.avg_duration || '0'),
      popularTimeSlots: await this.getPopularTimeSlots()
    };
  }

  async getAgentPerformance(agentId: string, startDate?: Date, endDate?: Date): Promise<any> {
    let whereClause = 'WHERE agent_id = $1';
    const params: any[] = [agentId];
    let paramIndex = 2;

    if (startDate) {
      whereClause += ` AND scheduled_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND scheduled_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    const queries = [
      `SELECT COUNT(*) as total FROM appointments ${whereClause}`,
      `SELECT COUNT(*) as completed FROM appointments ${whereClause} AND status = 'completed'`,
      `SELECT COUNT(*) as cancelled FROM appointments ${whereClause} AND status = 'cancelled'`,
      `SELECT COUNT(*) as no_show FROM appointments ${whereClause} AND status = 'no_show'`,
      `SELECT AVG(rating) as avg_rating FROM appointments ${whereClause} AND rating IS NOT NULL`,
      `SELECT AVG(estimated_duration) as avg_duration FROM appointments ${whereClause} AND status = 'completed'`
    ];

    const [totalResult, completedResult, cancelledResult, noShowResult, ratingResult, durationResult] =
      await Promise.all(queries.map(q => this.db.query<any>(q, params)));

    const total = parseInt(totalResult?.rows[0]?.total || '0');
    const completed = parseInt(completedResult?.rows[0]?.completed || '0');

    return {
      agentId,
      totalAppointments: total,
      completedCount: completed,
      cancelledCount: parseInt(cancelledResult?.rows[0]?.cancelled || '0'),
      noShowCount: parseInt(noShowResult?.rows[0]?.no_show || '0'),
      averageRating: parseFloat(ratingResult?.rows[0]?.avg_rating || '0'),
      averageDuration: parseFloat(durationResult?.rows[0]?.avg_duration || '0'),
      onTimePercentage: 0,
      followUpRate: 0
    };
  }

  async findByIds(ids: string[]): Promise<Appointment[]> {
    if (ids.length === 0) return [];
    const query = 'SELECT * FROM appointments WHERE id = ANY($1::uuid[])';
    const result = await this.db.query<any>(query, [ids]);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  async findAppointmentsByRating(minRating: number): Promise<Appointment[]> {
    const query = 'SELECT * FROM appointments WHERE rating >= $1 ORDER BY rating DESC, scheduled_date DESC';
    const result = await this.db.query<any>(query, [minRating]);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  async findHighValueAppointments(minEstimatedValue?: number): Promise<Appointment[]> {
    const value = minEstimatedValue || 50000;
    const query = `
      SELECT a.* FROM appointments a
      LEFT JOIN leads l ON a.lead_id = l.id
      WHERE l.estimated_value >= $1
      ORDER BY l.estimated_value DESC
    `;
    const result = await this.db.query<any>(query, [value]);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  async findUnratedCompletedAppointments(): Promise<Appointment[]> {
    const query = 'SELECT * FROM appointments WHERE status = \'completed\' AND rating IS NULL ORDER BY completed_at DESC';
    const result = await this.db.query<any>(query);
    return result.rows.map(row => this.mapRowToAppointment(row));
  }

  async getAverageRatingByType(): Promise<Record<string, number>> {
    const query = 'SELECT type, AVG(rating) as avg_rating FROM appointments WHERE rating IS NOT NULL GROUP BY type';
    const result = await this.db.query<any>(query);
    const ratings: Record<string, number> = {};
    result.rows.forEach((row: any) => {
      ratings[row.type] = parseFloat(row.avg_rating);
    });
    return ratings;
  }

  async getConversionRateByAppointmentType(): Promise<Record<string, { scheduled: number; completed: number; conversionRate: number }>> {
    const query = `
      SELECT
        type,
        COUNT(*) as scheduled,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100 as conversion_rate
      FROM appointments
      GROUP BY type
    `;
    const result = await this.db.query<any>(query);
    const rates: Record<string, { scheduled: number; completed: number; conversionRate: number }> = {};
    result.rows.forEach((row: any) => {
      rates[row.type] = {
        scheduled: parseInt(row.scheduled),
        completed: parseInt(row.completed),
        conversionRate: parseFloat(row.conversion_rate || '0')
      };
    });
    return rates;
  }

  async getSeasonalTrends(year: number): Promise<Array<{ month: number; count: number; completionRate: number }>> {
    const query = `
      SELECT
        EXTRACT(MONTH FROM scheduled_date) as month,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100 as completion_rate
      FROM appointments
      WHERE EXTRACT(YEAR FROM scheduled_date) = $1
      GROUP BY month
      ORDER BY month
    `;
    const result = await this.db.query<any>(query, [year]);
    return result.rows.map((row: any) => ({
      month: parseInt(row.month),
      count: parseInt(row.count),
      completionRate: parseFloat(row.completion_rate || '0')
    }));
  }

  async bulkUpdateStatus(ids: string[], status: string): Promise<void> {
    if (ids.length === 0) return;
    const query = 'UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = ANY($2::uuid[])';
    await this.db.query(query, [status, ids]);
  }

  async bulkCancel(ids: string[], reason: string): Promise<void> {
    if (ids.length === 0) return;
    const query = 'UPDATE appointments SET status = \'cancelled\', cancellation_reason = $1, cancelled_at = NOW(), updated_at = NOW() WHERE id = ANY($2::uuid[])';
    await this.db.query(query, [reason, ids]);
  }

  async bulkReschedule(ids: string[], newDates: Date[]): Promise<void> {
    if (ids.length === 0 || ids.length !== newDates.length) return;

    // Update each appointment with its corresponding new date
    for (let i = 0; i < ids.length; i++) {
      const query = 'UPDATE appointments SET scheduled_date = $1, updated_at = NOW() WHERE id = $2';
      await this.db.query(query, [newDates[i], ids[i]]);
    }
  }
}