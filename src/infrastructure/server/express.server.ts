// Express server configuration with dependency injection
// Sets up HTTP server with all middleware and routes

import express from 'express';
import { createApiRoutes } from '../../interface-adapters/routes';
import { ApiControllers } from '../container/dependency-container';
import { corsHandler } from '../../interface-adapters/middleware/cors.middleware';
import { errorHandler, notFoundHandler } from '../../interface-adapters/middleware/error.middleware';

export class ExpressServer {
  private app: express.Application;
  private port: number;

  constructor(port: number = 3000) {
    this.app = express();
    this.port = port;
    this.setupMiddleware();
  }

  private setupMiddleware(): void {
    // Basic middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // CORS middleware
    this.app.use(corsHandler);

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  public setupRoutes(controllers: ApiControllers): void {
    // Mount API routes
    this.app.use('/api', createApiRoutes(controllers));

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'CarBrain AI Assistant API',
        version: '1.0.0',
        documentation: '/api/health'
      });
    });

    // Error handling middleware (must be last)
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        console.log(`CarBrain AI Assistant API server running on port ${this.port}`);
        console.log(`Health check: http://localhost:${this.port}/api/health`);
        console.log(`API documentation: http://localhost:${this.port}/api`);
        resolve();
      });
    });
  }

  public getApp(): express.Application {
    return this.app;
  }
}