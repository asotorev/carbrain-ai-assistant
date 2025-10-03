// Session middleware for generating and validating session IDs
// Ensures each conversation has a unique session identifier

import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      sessionId?: string;
    }
  }
}

export function sessionMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Check for session ID in header or body
  const sessionId = req.headers['x-session-id'] as string || req.body?.sessionId;

  if (sessionId) {
    req.sessionId = sessionId;
  } else {
    // Generate new session ID if not provided
    req.sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  // Add session ID to response headers
  if (req.sessionId) {
    res.setHeader('X-Session-ID', req.sessionId);
  }

  next();
}

export function requireSessionId(req: Request, res: Response, next: NextFunction): void {
  if (!req.sessionId && !req.body?.sessionId) {
    res.status(400).json({
      error: 'Session ID is required. Provide X-Session-ID header or sessionId in request body.'
    });
    return;
  }

  next();
}
