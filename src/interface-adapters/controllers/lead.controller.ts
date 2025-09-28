// Lead HTTP endpoints controller for Interface Adapters layer
// Manages sales pipeline operations and lead lifecycle workflows

import { Request, Response } from 'express';
import { LeadService } from '@application/services/lead.service';

export class LeadController {
  constructor(private leadService: LeadService) {}

  async getAllLeads(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const stage = req.query.stage as string;
      const priority = req.query.priority as string;
      const assignedAgent = req.query.assignedAgent as string;
      const customerId = req.query.customerId as string;
      const vehicleId = req.query.vehicleId as string;
      const isActive = req.query.isActive === 'true';

      const filters = {
        ...(stage && { stage: stage as any }),
        ...(priority && { priority: priority as any }),
        ...(assignedAgent && { assignedAgent }),
        ...(customerId && { customerId }),
        ...(vehicleId && { vehicleId }),
        ...(req.query.isActive && { isActive })
      };

      const result = await this.leadService.searchLeads(filters, page, limit);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Leads retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve leads'
      });
    }
  }

  async getLeadById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const lead = await this.leadService.getLeadById(id!);

      if (!lead) {
        res.status(404).json({
          success: false,
          error: 'Lead not found',
          message: 'Lead not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: lead,
        message: 'Lead retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve lead'
      });
    }
  }

  async createLead(req: Request, res: Response): Promise<void> {
    try {
      const leadData = req.body;
      const lead = await this.leadService.createLead(leadData);

      res.status(201).json({
        success: true,
        data: lead,
        message: 'Lead created successfully'
      });
    } catch (error) {
      if (error instanceof Error && (
        error.message.includes('required') ||
        error.message.includes('Priority must be')
      )) {
        res.status(400).json({
          success: false,
          error: error.message,
          message: 'Invalid lead data provided'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          message: 'Failed to create lead'
        });
      }
    }
  }

  async updateLead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      const lead = await this.leadService.updateLead(id!, updates);

      res.status(200).json({
        success: true,
        data: lead,
        message: 'Lead updated successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Lead not found') {
        res.status(404).json({
          success: false,
          error: error.message,
          message: 'Lead not found'
        });
      } else if (error instanceof Error && error.message.includes('required')) {
        res.status(400).json({
          success: false,
          error: error.message,
          message: 'Invalid update data provided'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          message: 'Failed to update lead'
        });
      }
    }
  }

  async deleteLead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.leadService.deleteLead(id!);

      res.status(200).json({
        success: true,
        message: 'Lead deleted successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Lead not found') {
        res.status(404).json({
          success: false,
          error: error.message,
          message: 'Lead not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          message: 'Failed to delete lead'
        });
      }
    }
  }

  async getLeadsByCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      const leads = await this.leadService.getLeadsByCustomer(customerId!);

      res.status(200).json({
        success: true,
        data: leads,
        message: 'Customer leads retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve customer leads'
      });
    }
  }

  async getLeadsByVehicle(req: Request, res: Response): Promise<void> {
    try {
      const { vehicleId } = req.params;
      const leads = await this.leadService.getLeadsByVehicle(vehicleId!);

      res.status(200).json({
        success: true,
        data: leads,
        message: 'Vehicle leads retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve vehicle leads'
      });
    }
  }

  async getLeadsByStage(req: Request, res: Response): Promise<void> {
    try {
      const { stage } = req.params;
      const leads = await this.leadService.getLeadsByStage(stage!);

      res.status(200).json({
        success: true,
        data: leads,
        message: `Leads in ${stage} stage retrieved successfully`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve leads by stage'
      });
    }
  }

  async getLeadsByAgent(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      const leads = await this.leadService.getLeadsByAgent(agentId!);

      res.status(200).json({
        success: true,
        data: leads,
        message: 'Agent leads retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve agent leads'
      });
    }
  }

  async getActiveLeads(req: Request, res: Response): Promise<void> {
    try {
      const leads = await this.leadService.getActiveLeads();

      res.status(200).json({
        success: true,
        data: leads,
        message: 'Active leads retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve active leads'
      });
    }
  }

  async getLeadsInPriceRange(req: Request, res: Response): Promise<void> {
    try {
      const { minValue, maxValue } = req.query;

      if (!minValue || !maxValue) {
        res.status(400).json({
          success: false,
          error: 'Both minValue and maxValue are required',
          message: 'Invalid price range parameters'
        });
        return;
      }

      const leads = await this.leadService.getLeadsInPriceRange(
        parseFloat(minValue as string),
        parseFloat(maxValue as string)
      );

      res.status(200).json({
        success: true,
        data: leads,
        message: 'Leads in price range retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve leads in price range'
      });
    }
  }

  async getRecentLeads(req: Request, res: Response): Promise<void> {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      const leads = await this.leadService.getRecentLeads(days);

      res.status(200).json({
        success: true,
        data: leads,
        message: `Recent leads from last ${days} days retrieved successfully`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve recent leads'
      });
    }
  }

  async progressLeadStage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { stage } = req.body;

      if (!stage) {
        res.status(400).json({
          success: false,
          error: 'Stage is required',
          message: 'Invalid stage parameter'
        });
        return;
      }

      const lead = await this.leadService.progressLeadStage(id!, stage!);

      res.status(200).json({
        success: true,
        data: lead,
        message: 'Lead stage updated successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Lead not found') {
        res.status(404).json({
          success: false,
          error: error.message,
          message: 'Lead not found'
        });
      } else if (error instanceof Error && error.message.includes('Invalid stage')) {
        res.status(400).json({
          success: false,
          error: error.message,
          message: 'Invalid stage provided'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          message: 'Failed to update lead stage'
        });
      }
    }
  }

  async convertLead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const lead = await this.leadService.convertLead(id!);

      res.status(200).json({
        success: true,
        data: lead,
        message: 'Lead converted successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Lead not found') {
        res.status(404).json({
          success: false,
          error: error.message,
          message: 'Lead not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          message: 'Failed to convert lead'
        });
      }
    }
  }

  async markLeadAsLost(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        res.status(400).json({
          success: false,
          error: 'Loss reason is required',
          message: 'Invalid loss reason parameter'
        });
        return;
      }

      const lead = await this.leadService.markLeadAsLost(id!, reason!);

      res.status(200).json({
        success: true,
        data: lead,
        message: 'Lead marked as lost successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Lead not found') {
        res.status(404).json({
          success: false,
          error: error.message,
          message: 'Lead not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          message: 'Failed to mark lead as lost'
        });
      }
    }
  }

  async assignLeadToAgent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { agentId } = req.body;

      if (!agentId) {
        res.status(400).json({
          success: false,
          error: 'Agent ID is required',
          message: 'Invalid agent ID parameter'
        });
        return;
      }

      const lead = await this.leadService.assignLeadToAgent(id!, agentId!);

      res.status(200).json({
        success: true,
        data: lead,
        message: 'Lead assigned to agent successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Lead not found') {
        res.status(404).json({
          success: false,
          error: error.message,
          message: 'Lead not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          message: 'Failed to assign lead to agent'
        });
      }
    }
  }
}