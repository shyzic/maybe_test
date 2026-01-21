import express, { Application, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
// import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { connectDatabase } from './config/database';
import { closeRedisConnection } from './config/redis';
import env from './config/env';
import logger from './utils/logger';
import { initializeWebSocket } from './websocket/server';
import { startWorkers, stopWorkers } from './jobs';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

class App {
  public app: Application;
  private httpServer: any;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.initializeMiddlewares();
    // this.initializeSwagger();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'ws:', 'wss:'],
          },
        },
      })
    );

    this.app.use(cors({
      origin: '*',
      credentials: true,
    }));

    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    this.app.use(express.static(path.join(__dirname, '../public')));

    this.app.use((req: Request, res: Response, next: NextFunction) => {
      logger.debug(`${req.method} ${req.path}`);
      next();
    });
  }

  // private initializeSwagger(): void {
  //   const swaggerUiOptions = {
  //     customCss: `
  //       .swagger-ui .topbar { display: none }
  //       .swagger-ui { background: #fafafa; }
  //     `,
  //     customSiteTitle: 'Auction API Documentation',
  //     swaggerOptions: {
  //       persistAuthorization: true,
  //       displayRequestDuration: true,
  //       filter: true,
  //     },
  //   };

  //   this.app.get('/api-docs.json', (req: Request, res: Response) => {
  //     res.setHeader('Content-Type', 'application/json');
  //     res.send(swaggerSpec);
  //   });

  //   this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  // }

  private initializeRoutes(): void {
    this.app.use('/api', routes);

    this.app.get('/', (req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        message: 'Auction Backend API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
          api: '/api',
          docs: '/api-docs',
          demo: '/index.html',
          health: '/api/health',
        },
      });
    });

    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      await connectDatabase();

      initializeWebSocket(this.httpServer);
      logger.info('WebSocket server initialized');

      startWorkers();
      logger.info('Workers and schedulers started');

      this.httpServer.listen(env.port, () => {
        logger.info(`Server is running on port ${env.port}`);
        logger.info(`Environment: ${env.nodeEnv}`);
        logger.info(`API: http://localhost:${env.port}/api`);
        logger.info(`Docs: http://localhost:${env.port}/api-docs`);
        logger.info(`Demo: http://localhost:${env.port}`);
        logger.info(`WebSocket: ws://localhost:${env.port}`);
      });

      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    logger.info('Shutting down gracefully...');

    try {
      await stopWorkers();
      logger.info('Workers stopped');
    } catch (error) {
      logger.error('Error stopping workers:', error);
    }

    try {
      await closeRedisConnection();
      logger.info('Redis disconnected');
    } catch (error) {
      logger.error('Error closing Redis:', error);
    }

    this.httpServer.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  }
}

const application = new App();
application.start();

export default application.app;