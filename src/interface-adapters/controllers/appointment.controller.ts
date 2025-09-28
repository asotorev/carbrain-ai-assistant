// Appointment HTTP endpoints controller for Interface Adapters layer
// Manages scheduling operations and calendar management workflows

import { Request, Response } from 'express';
import { AppointmentService } from '@application/services/appointment.service';

export class AppointmentController {
  constructor(private appointmentService: AppointmentService) {}

  async getAllAppointments(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const type = req.query.type as string;
      const customerId = req.query.customerId as string;
      const assignedAgent = req.query.assignedAgent as string;
      const vehicleId = req.query.vehicleId as string;

      const filters = {
        ...(status && { status: status as any }),
        ...(type && { type: type as any }),
        ...(customerId && { customerId }),
        ...(assignedAgent && { assignedAgent }),
        ...(vehicleId && { vehicleId })
      };

      const result = await this.appointmentService.searchAppointments(filters, page, limit);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Appointments retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve appointments'
      });
    }
  }

  async getAppointmentById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const appointment = await this.appointmentService.getAppointmentById(id!);

      if (!appointment) {
        res.status(404).json({
          success: false,
          error: 'Appointment not found',
          message: 'Appointment not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: appointment,
        message: 'Appointment retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve appointment'
      });
    }
  }

  async createAppointment(req: Request, res: Response): Promise<void> {
    try {
      const appointmentData = req.body;
      const appointment = await this.appointmentService.createAppointment(appointmentData);

      res.status(201).json({
        success: true,
        data: appointment,
        message: 'Appointment created successfully'
      });
    } catch (error) {
      if (error instanceof Error && (
        error.message.includes('required') ||
        error.message.includes('conflict') ||
        error.message.includes('past') ||
        error.message.includes('hours')
      )) {
        res.status(400).json({
          success: false,
          error: error.message,
          message: 'Invalid appointment data provided'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          message: 'Failed to create appointment'
        });
      }
    }
  }

  async updateAppointment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      const appointment = await this.appointmentService.updateAppointment(id!, updates);

      res.status(200).json({
        success: true,
        data: appointment,
        message: 'Appointment updated successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Appointment not found') {
        res.status(404).json({
          success: false,
          error: error.message,
          message: 'Appointment not found'
        });
      } else if (error instanceof Error && (
        error.message.includes('required') ||
        error.message.includes('conflict') ||
        error.message.includes('past')
      )) {
        res.status(400).json({
          success: false,
          error: error.message,
          message: 'Invalid update data provided'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          message: 'Failed to update appointment'
        });
      }
    }
  }

  async deleteAppointment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.appointmentService.deleteAppointment(id!);

      res.status(200).json({
        success: true,
        message: 'Appointment deleted successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Appointment not found') {
        res.status(404).json({
          success: false,
          error: error.message,
          message: 'Appointment not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          message: 'Failed to delete appointment'
        });
      }
    }
  }

  async getAppointmentsByCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      const appointments = await this.appointmentService.getAppointmentsByCustomer(customerId!);

      res.status(200).json({
        success: true,
        data: appointments,
        message: 'Customer appointments retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve customer appointments'
      });
    }
  }

  async getAppointmentsByAgent(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      const appointments = await this.appointmentService.getAppointmentsByAgent(agentId!);

      res.status(200).json({
        success: true,
        data: appointments,
        message: 'Agent appointments retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve agent appointments'
      });
    }
  }

  async getAppointmentsByDateRange(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Both startDate and endDate are required',
          message: 'Invalid date range parameters'
        });
        return;
      }

      const appointments = await this.appointmentService.getAppointmentsByDateRange(
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.status(200).json({
        success: true,
        data: appointments,
        message: 'Appointments in date range retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve appointments in date range'
      });
    }
  }

  async getTodaysAppointments(req: Request, res: Response): Promise<void> {
    try {
      const appointments = await this.appointmentService.getTodaysAppointments();

      res.status(200).json({
        success: true,
        data: appointments,
        message: "Today's appointments retrieved successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: "Failed to retrieve today's appointments"
      });
    }
  }

  async getUpcomingAppointments(req: Request, res: Response): Promise<void> {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 7;
      const appointments = await this.appointmentService.getUpcomingAppointments(days);

      res.status(200).json({
        success: true,
        data: appointments,
        message: `Upcoming appointments for next ${days} days retrieved successfully`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve upcoming appointments'
      });
    }
  }

  async getAppointmentsByStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.params;
      const appointments = await this.appointmentService.getAppointmentsByStatus(status!);

      res.status(200).json({
        success: true,
        data: appointments,
        message: `Appointments with ${status} status retrieved successfully`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve appointments by status'
      });
    }
  }

  async getAppointmentsByType(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const appointments = await this.appointmentService.getAppointmentsByType(type!);

      res.status(200).json({
        success: true,
        data: appointments,
        message: `Appointments of type ${type} retrieved successfully`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve appointments by type'
      });
    }
  }

  async confirmAppointment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const appointment = await this.appointmentService.confirmAppointment(id!);

      res.status(200).json({
        success: true,
        data: appointment,
        message: 'Appointment confirmed successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Appointment not found') {
        res.status(404).json({
          success: false,
          error: error.message,
          message: 'Appointment not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          message: 'Failed to confirm appointment'
        });
      }
    }
  }

  async cancelAppointment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const appointment = await this.appointmentService.cancelAppointment(id!, reason);

      res.status(200).json({
        success: true,
        data: appointment,
        message: 'Appointment cancelled successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Appointment not found') {
        res.status(404).json({
          success: false,
          error: error.message,
          message: 'Appointment not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          message: 'Failed to cancel appointment'
        });
      }
    }
  }

  async rescheduleAppointment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { newDateTime } = req.body;

      if (!newDateTime) {
        res.status(400).json({
          success: false,
          error: 'New date and time is required',
          message: 'Invalid reschedule parameters'
        });
        return;
      }

      const appointment = await this.appointmentService.rescheduleAppointment(
        id!,
        new Date(newDateTime!)
      );

      res.status(200).json({
        success: true,
        data: appointment,
        message: 'Appointment rescheduled successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Appointment not found') {
        res.status(404).json({
          success: false,
          error: error.message,
          message: 'Appointment not found'
        });
      } else if (error instanceof Error && (
        error.message.includes('conflict') ||
        error.message.includes('past') ||
        error.message.includes('hours')
      )) {
        res.status(400).json({
          success: false,
          error: error.message,
          message: 'Invalid reschedule data provided'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          message: 'Failed to reschedule appointment'
        });
      }
    }
  }

  async markAppointmentCompleted(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const appointment = await this.appointmentService.markAppointmentCompleted(id!, notes);

      res.status(200).json({
        success: true,
        data: appointment,
        message: 'Appointment marked as completed successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Appointment not found') {
        res.status(404).json({
          success: false,
          error: error.message,
          message: 'Appointment not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          message: 'Failed to mark appointment as completed'
        });
      }
    }
  }

  async checkAgentAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      const { date, startTime, endTime } = req.query;

      if (!date || !startTime || !endTime) {
        res.status(400).json({
          success: false,
          error: 'Date, startTime, and endTime are required',
          message: 'Invalid availability check parameters'
        });
        return;
      }

      const isAvailable = await this.appointmentService.checkAgentAvailability(
        agentId!,
        new Date(date as string),
        startTime as string,
        endTime as string
      );

      res.status(200).json({
        success: true,
        data: { isAvailable },
        message: `Agent availability checked successfully`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to check agent availability'
      });
    }
  }

  async getAgentSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Both startDate and endDate are required',
          message: 'Invalid schedule parameters'
        });
        return;
      }

      const schedule = await this.appointmentService.getAgentSchedule(
        agentId!,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.status(200).json({
        success: true,
        data: schedule,
        message: 'Agent schedule retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve agent schedule'
      });
    }
  }
}