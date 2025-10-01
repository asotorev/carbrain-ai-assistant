// Request validation middleware for API endpoints
// Provides basic validation for common request patterns

import { Request, Response, NextFunction } from 'express';

export const validatePagination = (req: Request, res: Response, next: NextFunction): void => {
  const page = req.query.page;
  const limit = req.query.limit;

  if (page && (isNaN(Number(page)) || Number(page) < 1)) {
    res.status(400).json({
      success: false,
      error: 'Page must be a positive integer',
      message: 'Invalid pagination parameters'
    });
    return;
  }

  if (limit && (isNaN(Number(limit)) || Number(limit) < 1 || Number(limit) > 100)) {
    res.status(400).json({
      success: false,
      error: 'Limit must be between 1 and 100',
      message: 'Invalid pagination parameters'
    });
    return;
  }

  next();
};

export const validateIdParam = (req: Request, res: Response, next: NextFunction): void => {
  const { id } = req.params;

  if (!id || id.trim().length === 0) {
    res.status(400).json({
      success: false,
      error: 'ID parameter is required',
      message: 'Invalid ID parameter'
    });
    return;
  }

  next();
};

export const validateEmailParam = (req: Request, res: Response, next: NextFunction): void => {
  const { email } = req.params;

  if (!email || email.trim().length === 0) {
    res.status(400).json({
      success: false,
      error: 'Email parameter is required',
      message: 'Invalid email parameter'
    });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({
      success: false,
      error: 'Invalid email format',
      message: 'Invalid email parameter'
    });
    return;
  }

  next();
};

export const validatePriceRange = (req: Request, res: Response, next: NextFunction): void => {
  const { minPrice, maxPrice } = req.query;

  if (minPrice && (isNaN(Number(minPrice)) || Number(minPrice) < 0)) {
    res.status(400).json({
      success: false,
      error: 'Minimum price must be a non-negative number',
      message: 'Invalid price range parameters'
    });
    return;
  }

  if (maxPrice && (isNaN(Number(maxPrice)) || Number(maxPrice) < 0)) {
    res.status(400).json({
      success: false,
      error: 'Maximum price must be a non-negative number',
      message: 'Invalid price range parameters'
    });
    return;
  }

  if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
    res.status(400).json({
      success: false,
      error: 'Minimum price cannot be greater than maximum price',
      message: 'Invalid price range parameters'
    });
    return;
  }

  next();
};

export const validateDateRange = (req: Request, res: Response, next: NextFunction): void => {
  const { startDate, endDate } = req.query;

  if (startDate && isNaN(Date.parse(startDate as string))) {
    res.status(400).json({
      success: false,
      error: 'Invalid start date format',
      message: 'Invalid date range parameters'
    });
    return;
  }

  if (endDate && isNaN(Date.parse(endDate as string))) {
    res.status(400).json({
      success: false,
      error: 'Invalid end date format',
      message: 'Invalid date range parameters'
    });
    return;
  }

  if (startDate && endDate && new Date(startDate as string) > new Date(endDate as string)) {
    res.status(400).json({
      success: false,
      error: 'Start date cannot be after end date',
      message: 'Invalid date range parameters'
    });
    return;
  }

  next();
};

export const validateRequestBody = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'POST' || req.method === 'PUT') {
    if (!req.body || Object.keys(req.body).length === 0) {
      res.status(400).json({
        success: false,
        error: 'Request body is required',
        message: 'Invalid request body'
      });
      return;
    }
  }

  next();
};