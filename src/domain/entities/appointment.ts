import { z } from 'zod';
import { LocationVO, LocationSchema } from '../value-objects/location';

export const AppointmentSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  vehicleId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  type: z.enum(['test_drive', 'vehicle_inspection', 'financing_meeting', 'delivery', 'service_consultation']),
  status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']).default('scheduled'),
  scheduledDate: z.date(),
  estimatedDuration: z.number().int().min(15).max(480).default(60), // minutes
  actualStartTime: z.date().optional(),
  actualEndTime: z.date().optional(),
  location: LocationSchema,
  agentId: z.string().optional(),
  notes: z.string().optional(),
  preprationItems: z.array(z.string()).default([]),
  followUpRequired: z.boolean().default(false),
  customerConfirmed: z.boolean().default(false),
  reminderSent: z.boolean().default(false),
  rating: z.number().int().min(1).max(5).optional(),
  feedback: z.string().optional(),
  nextSteps: z.array(z.string()).default([]),
  cancellationReason: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

export type AppointmentData = z.infer<typeof AppointmentSchema>;

export class Appointment {
  private constructor(
    private readonly data: AppointmentData,
    private readonly _location: LocationVO
  ) {}

  static create(data: unknown): Appointment {
    const validated = AppointmentSchema.parse(data);
    const location = LocationVO.create(validated.location);

    return new Appointment(validated, location);
  }

  static createTestDrive(params: {
    customerId: string;
    vehicleId: string;
    leadId?: string;
    scheduledDate: Date;
    location: unknown;
    agentId?: string;
    estimatedDuration?: number;
  }): Appointment {
    const id = crypto.randomUUID();
    const appointmentData = {
      id,
      ...params,
      type: 'test_drive' as const,
      status: 'scheduled' as const,
      estimatedDuration: params.estimatedDuration || 60,
      preprationItems: [
        'Verify customer driver license',
        'Check vehicle fuel level',
        'Review vehicle features',
        'Prepare insurance documentation'
      ],
      customerConfirmed: false,
      reminderSent: false,
      followUpRequired: true,
      nextSteps: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return Appointment.create(appointmentData);
  }

  static createFinancingMeeting(params: {
    customerId: string;
    leadId?: string;
    scheduledDate: Date;
    location: unknown;
    agentId?: string;
  }): Appointment {
    const id = crypto.randomUUID();
    const appointmentData = {
      id,
      ...params,
      type: 'financing_meeting' as const,
      status: 'scheduled' as const,
      estimatedDuration: 90,
      preprationItems: [
        'Gather customer financial documents',
        'Prepare financing options',
        'Review credit application',
        'Calculate payment scenarios'
      ],
      customerConfirmed: false,
      reminderSent: false,
      followUpRequired: true,
      nextSteps: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return Appointment.create(appointmentData);
  }

  get id(): string {
    return this.data.id;
  }

  get customerId(): string {
    return this.data.customerId;
  }

  get vehicleId(): string | undefined {
    return this.data.vehicleId;
  }

  get leadId(): string | undefined {
    return this.data.leadId;
  }

  get type(): string {
    return this.data.type;
  }

  get status(): string {
    return this.data.status;
  }

  get scheduledDate(): Date {
    return this.data.scheduledDate;
  }

  get estimatedDuration(): number {
    return this.data.estimatedDuration;
  }

  get actualStartTime(): Date | undefined {
    return this.data.actualStartTime;
  }

  get actualEndTime(): Date | undefined {
    return this.data.actualEndTime;
  }

  get location(): LocationVO {
    return this._location;
  }

  get agentId(): string | undefined {
    return this.data.agentId;
  }

  get notes(): string | undefined {
    return this.data.notes;
  }

  get preprationItems(): readonly string[] {
    return this.data.preprationItems;
  }

  get followUpRequired(): boolean {
    return this.data.followUpRequired;
  }

  get customerConfirmed(): boolean {
    return this.data.customerConfirmed;
  }

  get reminderSent(): boolean {
    return this.data.reminderSent;
  }

  get rating(): number | undefined {
    return this.data.rating;
  }

  get feedback(): string | undefined {
    return this.data.feedback;
  }

  get nextSteps(): readonly string[] {
    return this.data.nextSteps;
  }

  get cancellationReason(): string | undefined {
    return this.data.cancellationReason;
  }

  get createdAt(): Date {
    return this.data.createdAt;
  }

  get updatedAt(): Date {
    return this.data.updatedAt;
  }

  isActive(): boolean {
    return !['completed', 'cancelled', 'no_show'].includes(this.data.status);
  }

  isToday(): boolean {
    const today = new Date();
    const appointmentDate = this.data.scheduledDate;

    return today.getDate() === appointmentDate.getDate() &&
           today.getMonth() === appointmentDate.getMonth() &&
           today.getFullYear() === appointmentDate.getFullYear();
  }

  isUpcoming(): boolean {
    return this.data.scheduledDate > new Date() && this.isActive();
  }

  isPast(): boolean {
    return this.data.scheduledDate < new Date();
  }

  getActualDuration(): number | null {
    if (!this.data.actualStartTime || !this.data.actualEndTime) {
      return null;
    }

    const diffMs = this.data.actualEndTime.getTime() - this.data.actualStartTime.getTime();
    return Math.floor(diffMs / (1000 * 60)); // Convert to minutes
  }

  getEstimatedEndTime(): Date {
    const endTime = new Date(this.data.scheduledDate);
    endTime.setMinutes(endTime.getMinutes() + this.data.estimatedDuration);
    return endTime;
  }

  hoursUntilAppointment(): number {
    const now = new Date();
    const diffMs = this.data.scheduledDate.getTime() - now.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60));
  }

  needsReminder(): boolean {
    const hoursUntil = this.hoursUntilAppointment();
    return !this.data.reminderSent &&
           this.isActive() &&
           hoursUntil <= 24 &&
           hoursUntil > 0;
  }

  confirm(): Appointment {
    const updatedData = {
      ...this.data,
      status: 'confirmed' as const,
      customerConfirmed: true,
      updatedAt: new Date()
    };

    return new Appointment(updatedData, this._location);
  }

  start(): Appointment {
    const updatedData = {
      ...this.data,
      status: 'in_progress' as const,
      actualStartTime: new Date(),
      updatedAt: new Date()
    };

    return new Appointment(updatedData, this._location);
  }

  complete(rating?: number, feedback?: string, nextSteps: string[] = []): Appointment {
    const updatedData = {
      ...this.data,
      status: 'completed' as const,
      actualEndTime: new Date(),
      rating,
      feedback,
      nextSteps,
      updatedAt: new Date()
    };

    return new Appointment(updatedData, this._location);
  }

  cancel(reason: string): Appointment {
    const updatedData = {
      ...this.data,
      status: 'cancelled' as const,
      cancellationReason: reason,
      updatedAt: new Date()
    };

    return new Appointment(updatedData, this._location);
  }

  markAsNoShow(): Appointment {
    const updatedData = {
      ...this.data,
      status: 'no_show' as const,
      updatedAt: new Date()
    };

    return new Appointment(updatedData, this._location);
  }

  markReminderSent(): Appointment {
    const updatedData = {
      ...this.data,
      reminderSent: true,
      updatedAt: new Date()
    };

    return new Appointment(updatedData, this._location);
  }

  reschedule(newDate: Date): Appointment {
    const updatedData = {
      ...this.data,
      scheduledDate: newDate,
      status: 'scheduled' as const,
      customerConfirmed: false,
      reminderSent: false,
      updatedAt: new Date()
    };

    return new Appointment(updatedData, this._location);
  }

  addNotes(notes: string): Appointment {
    const existingNotes = this.data.notes || '';
    const timestamp = new Date().toISOString();
    const newNotes = existingNotes ?
      `${existingNotes}\n\n[${timestamp}] ${notes}` :
      `[${timestamp}] ${notes}`;

    const updatedData = {
      ...this.data,
      notes: newNotes,
      updatedAt: new Date()
    };

    return new Appointment(updatedData, this._location);
  }

  toJSON(): AppointmentData {
    return {
      ...this.data,
      location: this._location.toJSON()
    };
  }
}