const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const config = require('./config');
const logger = require('./utils/logger');
const authMiddleware = require('./middleware/auth');
const rateLimitMiddleware = require('./middleware/rateLimit');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');
const database = require('./utils/database');
const swaggerSetup = require('./utils/swagger');

class Server {
  constructor() {
    this.app = express();
    this.port = config.server.port || 3000;
    this.environment = config.environment;
  }

  async initialize() {
    try {
      // Connect to database
      await this.connectDatabase();

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Setup error handling
      this.setupErrorHandling();

      // Setup Swagger documentation
      this.setupSwagger();

      // Start server
      this.start();

    } catch (error) {
      logger.error('Failed to initialize server:', error);
      process.exit(1);
    }
  }

  async connectDatabase() {
    if (config.database.enabled) {
      await database.connect();
    }
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet());

    // CORS configuration
    this.app.use(cors({
      origin: config.cors.allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: config.server.bodyLimit }));
    this.app.use(express.urlencoded({ extended: true, limit: config.server.bodyLimit }));

    // Cookie parsing
    this.app.use(cookieParser());

    // Request logging
    this.app.use(morgan(config.logging.requestFormat, {
      stream: { write: (message) => logger.info(message.trim()) }
    }));

    // Global rate limiting
    this.app.use(rateLimitMiddleware);

    // Request ID middleware
    this.app.use((req, res, next) => {
      req.id = require('uuid').v4();
      res.setHeader('X-Request-ID', req.id);
      next();
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: this.environment,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: require('../package.json').version
      });
    });

    // Metrics endpoint
    this.app.get('/metrics', (req, res) => {
      res.status(200).json({
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    });

    // API routes
    this.app.use('/api', routes);

    // Serve static files
    this.app.use('/static', express.static('public'));

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
      });
    });
  }

  setupErrorHandling() {
    this.app.use(errorHandler);

    // Global unhandled promise rejection handler
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Promise Rejection:', { reason, promise });
    });

    // Global uncaught exception handler
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      this.shutdown();
    });
  }

  setupSwagger() {
    if (config.swagger.enabled) {
      swaggerSetup(this.app);
    }
  }

  start() {
    this.server = this.app.listen(this.port, () => {
      logger.info(`🚀 Server running on port ${this.port}`);
      logger.info(`📝 Environment: ${this.environment}`);
      logger.info(`🔗 Health check: http://localhost:${this.port}/health`);
      if (config.swagger.enabled) {
        logger.info(`📚 Swagger docs: http://localhost:${this.port}/api-docs`);
      }
    });
  }

  async shutdown() {
    logger.info('🔄 Starting graceful shutdown...');

    if (this.server) {
      this.server.close(() => {
        logger.info('✅ HTTP server closed');
      });
    }

    if (config.database.enabled) {
      await database.disconnect();
    }

    logger.info('✅ Server shutdown complete');
    process.exit(0);
  }
}

// Initialize and start server
const server = new Server();
server.initialize().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

module.exports = server;