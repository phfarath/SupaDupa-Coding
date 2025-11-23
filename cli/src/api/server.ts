import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { planRouter, initializePlanRoute } from './routes/plan';
import { errorHandler } from './middleware/validation';
import { systemEvents, SystemEvent } from '../../shared/events/event-emitter';
import { llmClientFactory } from '../config/llm';

export interface ServerConfig {
  port?: number;
  host?: string;
  cors?: boolean;
  logRequests?: boolean;
}

export class sdApiServer {
  private app: Express;
  private config: ServerConfig;
  private server?: any;
  private isInitialized: boolean = false;

  constructor(config: ServerConfig = {}) {
    this.config = {
      port: config.port || parseInt(process.env.API_PORT || '3000'),
      host: config.host || process.env.API_HOST || '0.0.0.0',
      cors: config.cors !== false,
      logRequests: config.logRequests !== false,
    };

    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    if (this.config.cors) {
      this.app.use(cors({
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      }));
    }

    if (this.config.logRequests) {
      this.app.use((req: Request, res: Response, next) => {
        const start = Date.now();
        res.on('finish', () => {
          const duration = Date.now() - start;
          console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
        });
        next();
      });
    }
  }

  private setupRoutes(): void {
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        name: 'SupaDupa-Coding API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          plan: '/api/plan',
          health: '/api/plan/health',
          queue: '/api/plan/queue',
        },
        timestamp: new Date().toISOString(),
      });
    });

    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
      });
    });

    initializePlanRoute();
    this.app.use('/api/plan', planRouter);
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);

    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        timestamp: new Date().toISOString(),
      });
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await llmClientFactory.initialize();
      this.isInitialized = true;
      console.log('API Server initialized successfully');
    } catch (error) {
      console.error('Failed to initialize API server:', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, this.config.host, () => {
          console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║    SupaDupa-Coding API Server                            ║
║                                                           ║
║    Status:    Running                                     ║
║    Port:      ${String(this.config.port).padEnd(46)}║
║    Host:      ${(this.config.host || 'localhost').padEnd(46)}║
║                                                           ║
║    Endpoints:                                             ║
║    - POST   /api/plan          (Create execution plan)   ║
║    - GET    /api/plan/health   (Health check)            ║
║    - GET    /api/plan/queue    (Queue status)            ║
║    - GET    /health            (Server health)           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
          `);

          systemEvents.emit(SystemEvent.AGENT_INITIALIZED, {
            component: 'api-server',
            port: this.config.port,
            host: this.config.host,
          });

          resolve();
        });

        this.server.on('error', (error: Error) => {
          console.error('Server error:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve, reject) => {
        this.server.close((err?: Error) => {
          if (err) {
            reject(err);
          } else {
            console.log('API Server stopped');
            resolve();
          }
        });
      });
    }
  }

  getApp(): Express {
    return this.app;
  }

  getConfig(): ServerConfig {
    return this.config;
  }
}

export async function startApiServer(config?: ServerConfig): Promise<sdApiServer> {
  const server = new sdApiServer(config);
  await server.start();
  return server;
}
