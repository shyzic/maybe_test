import express, { Application, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import { connectDatabase } from './config/database';
import env from './config/env';
import logger from './utils/logger';
import { initializeWebSocket } from './websocket/server';
import { startWorkers, stopWorkers } from './jobs';

class App {
  public app: Application;
  private httpServer: any;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security - modified for Frontend
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.socket.io"],
            imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
            connectSrc: ["'self'", 'ws:', 'wss:'],
            fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
          },
        },
      })
    );
    this.app.use(cors());

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      logger.debug(`${req.method} ${req.path}`);
      next();
    });
  }

  private initializeRoutes(): void {
    // API routes FIRST
    const routes = require('./routes').default;
    this.app.use('/api', routes);

    // Root health check
    this.app.get('/', (req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        message: 'Auction Backend API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
          demo: '/demo',
          api: '/api',
          health: '/api/health'
        }
      });
    });

    // Demo page route - serves the frontend
    this.app.get('/demo', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, '../public/demo.html'));
    });

    // Serve static files
    this.app.use(express.static(path.join(__dirname, '../public'), {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript');
        } else if (filePath.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css');
        } else if (filePath.endsWith('.html')) {
          res.setHeader('Content-Type', 'text/html');
        }
      }
    }));
  }

  private initializeErrorHandling(): void {
    const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
    
    // 404 handler
    this.app.use(notFoundHandler);
    
    // Global error handler
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Подключение к базе данных
      await connectDatabase();

      // Инициализация WebSocket
      initializeWebSocket(this.httpServer);
      logger.info('WebSocket server initialized');

      // Запуск workers и планировщиков (опционально)
      // startWorkers();
      // logger.info('Workers and schedulers started');

      // Запуск сервера
      this.httpServer.listen(env.port, () => {
        logger.info(`Server is running on port ${env.port}`);
        logger.info(`Environment: ${env.nodeEnv}`);
        logger.info(`API available at http://localhost:${env.port}/api`);
        logger.info(`Demo UI at http://localhost:${env.port}/demo`);
        logger.info(`WebSocket available at ws://localhost:${env.port}`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    logger.info('Shutting down gracefully...');
    
    // Остановка workers
    await stopWorkers();
    
    // Закрытие Redis
    const { closeRedisConnection } = require('./config/redis');
    await closeRedisConnection();
    
    // Закрытие HTTP сервера
    this.httpServer.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
    
    // Принудительное завершение через 10 секунд
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  }
}

// Запуск приложения
const application = new App();
application.start();

export default application.app;
