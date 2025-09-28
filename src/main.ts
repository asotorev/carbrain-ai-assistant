// Main application entry point
// Bootstraps the CarBrain AI Assistant API server

import { ExpressServer } from './infrastructure/server/express.server';
import { DependencyContainer } from './infrastructure/container/dependency-container';

async function bootstrap(): Promise<void> {
  try {
    console.log('Starting CarBrain AI Assistant API...');

    // Initialize dependency container
    const container = new DependencyContainer();
    await container.initialize();

    // Create and configure Express server
    const port = parseInt(process.env.PORT || '3000');
    const server = new ExpressServer(port);

    // Setup routes with injected dependencies
    server.setupRoutes(container.getControllers());

    // Start server
    await server.start();

    console.log('CarBrain AI Assistant API started successfully');

    // Graceful shutdown handling
    process.on('SIGINT', async () => {
      console.log('Received SIGINT, shutting down gracefully...');
      await container.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM, shutting down gracefully...');
      await container.shutdown();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start CarBrain AI Assistant API:', error);
    process.exit(1);
  }
}

bootstrap();