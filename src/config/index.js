require('dotenv').config();

const config = {
  environment: process.env.NODE_ENV || 'development',

  server: {
    port: parseInt(process.env.PORT || '3000'),
    bodyLimit: process.env.BODY_LIMIT || '10mb',
    host: process.env.HOST || '0.0.0.0'
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    jwtExpiration: process.env.JWT_EXPIRATION || '24h',
    refreshTokenExpiration: process.env.REFRESH_TOKEN_EXPIRATION || '7d',
    saltRounds: parseInt(process.env.SALT_ROUNDS || '12'),
    apiKeys: [
      {
        key: process.env.API_KEY_1 || 'dev-api-key-1',
        name: 'Development Key',
        active: true,
        permissions: ['read', 'write']
      }
    ]
  },

  database: {
    enabled: process.env.DATABASE_ENABLED === 'true',
    url: process.env.DATABASE_URL || 'mongodb://localhost:27017/nodejs-server-app',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
  },

  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0')
  },

  rateLimit: {
    global: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000 // limit each IP to 1000 requests per windowMs
    },
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes  
      max: 5 // limit each IP to 5 auth attempts per windowMs
    },
    perUser: 500 // limit each user to 500 requests per 15 minutes
  },

  cors: {
    allowedOrigins: process.env.CORS_ORIGINS ? 
      process.env.CORS_ORIGINS.split(',') : 
      ['http://localhost:3000', 'http://localhost:3001']
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    requestFormat: process.env.NODE_ENV === 'production' ? 'combined' : 'dev',
    file: {
      enabled: process.env.FILE_LOGGING === 'true',
      directory: process.env.LOG_DIRECTORY || 'logs',
      filename: process.env.LOG_FILENAME || 'app-%DATE%.log',
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d'
    }
  },

  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false',
    title: 'Node.js Server API',
    version: '1.0.0',
    description: 'A comprehensive Node.js server with authentication and rate limiting'
  },

  services: {
    userService: {
      rateLimit: {
        windowMs: 5 * 60 * 1000, // 5 minutes
        max: 100 // limit each user to 100 requests per 5 minutes
      }
    },
    adminService: {
      rateLimit: {
        windowMs: 5 * 60 * 1000,
        max: 50
      }
    }
  },

  security: {
    bcryptRounds: 12,
    sessionSecret: process.env.SESSION_SECRET || 'your-session-secret-change-this',
    cookieMaxAge: 24 * 60 * 60 * 1000, // 24 hours
    csrfEnabled: process.env.CSRF_ENABLED === 'true'
  },

  upload: {
    directory: process.env.UPLOAD_DIRECTORY || 'uploads',
    maxSize: parseInt(process.env.MAX_UPLOAD_SIZE || '5242880'), // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
  }
};

// Environment-specific overrides
if (config.environment === 'production') {
  config.logging.level = 'warn';
  config.logging.file.enabled = true;
}

if (config.environment === 'test') {
  config.database.url = process.env.TEST_DATABASE_URL || 'mongodb://localhost:27017/nodejs-server-app-test';
  config.logging.level = 'error';
}

module.exports = config;