module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0'
  },

  // Authentication configuration
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
    apiKeys: [
      {
        key: process.env.API_KEY_1 || 'demo-api-key-1',
        name: 'Service 1',
        active: true
      },
      {
        key: process.env.API_KEY_2 || 'demo-api-key-2', 
        name: 'Service 2',
        active: true
      }
    ]
  },

  // Redis configuration for rate limiting
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true' || false,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB) || 0
  },

  // Rate limiting configuration
  rateLimit: {
    global: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000
    },
    perUser: parseInt(process.env.RATE_LIMIT_PER_USER) || 1000
  },

  // Service-specific configurations
  services: {
    userService: {
      rateLimit: {
        windowMs: 5 * 60 * 1000, // 5 minutes
        max: 100
      }
    },
    adminService: {
      rateLimit: {
        windowMs: 5 * 60 * 1000, // 5 minutes
        max: 50
      }
    }
  },

  // Environment-specific settings
  environment: process.env.NODE_ENV || 'development',
  
  // CORS settings
  cors: {
    origins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000']
  }
};