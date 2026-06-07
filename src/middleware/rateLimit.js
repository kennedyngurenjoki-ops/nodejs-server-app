const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger');

class RateLimitConfig {
  constructor() {
    this.redisClient = this.setupRedis();
    this.store = this.setupStore();
  }

  setupRedis() {
    if (!config.redis.enabled) {
      return null;
    }

    try {
      const redis = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3
      });

      redis.on('error', (err) => {
        logger.error('Redis connection error:', err);
      });

      redis.on('connect', () => {
        logger.info('Connected to Redis for rate limiting');
      });

      return redis;
      
    } catch (error) {
      logger.error('Failed to setup Redis:', error);
      return null;
    }
  }

  setupStore() {
    if (this.redisClient) {
      return new RedisStore({
        sendCommand: (...args) => this.redisClient.call(...args),
        prefix: 'rl:'
      });
    }
    
    return undefined; // Use memory store as fallback
  }

  // Global rate limiting
  createGlobalLimit() {
    return rateLimit({
      store: this.store,
      windowMs: config.rateLimit.global.windowMs || 15 * 60 * 1000, // 15 minutes
      max: config.rateLimit.global.max || 1000,
      message: {
        error: 'Too many requests from this IP',
        retryAfter: Math.ceil((config.rateLimit.global.windowMs || 15 * 60 * 1000) / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise use IP
        return req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
      },
      skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health' || req.path === '/metrics';
      },
      onLimitReached: (req, res, options) => {
        const identifier = req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
        logger.warn(`Rate limit exceeded for ${identifier}`, {
          path: req.path,
          method: req.method,
          userAgent: req.headers['user-agent']
        });
      }
    });
  }

  // Service-specific rate limiting
  createServiceLimit(serviceName) {
    const serviceConfig = config.services[serviceName]?.rateLimit || {};
    
    return rateLimit({
      store: this.store,
      windowMs: serviceConfig.windowMs || 5 * 60 * 1000, // 5 minutes
      max: serviceConfig.max || 100,
      message: {
        error: `Too many requests to ${serviceName} service`,
        service: serviceName,
        retryAfter: Math.ceil((serviceConfig.windowMs || 5 * 60 * 1000) / 1000)
      },
      keyGenerator: (req) => {
        const userKey = req.user ? req.user.id : req.ip;
        return `service:${serviceName}:${userKey}`;
      },
      onLimitReached: (req, res, options) => {
        logger.warn(`Service rate limit exceeded`, {
          service: serviceName,
          user: req.user?.id,
          ip: req.ip,
          path: req.path
        });
      }
    });
  }

  // API endpoint specific rate limiting
  createEndpointLimit(endpoint, options = {}) {
    return rateLimit({
      store: this.store,
      windowMs: options.windowMs || 1 * 60 * 1000, // 1 minute
      max: options.max || 10,
      message: {
        error: `Too many requests to ${endpoint}`,
        endpoint,
        retryAfter: Math.ceil((options.windowMs || 1 * 60 * 1000) / 1000)
      },
      keyGenerator: (req) => {
        const userKey = req.user ? req.user.id : req.ip;
        return `endpoint:${endpoint}:${userKey}`;
      }
    });
  }

  // Adaptive rate limiting based on system load
  createAdaptiveLimit() {
    return (req, res, next) => {
      // Get current system metrics
      const cpuUsage = process.cpuUsage();
      const memUsage = process.memoryUsage();
      
      // Calculate adaptive limits based on system resources
      const memoryUsagePercent = memUsage.heapUsed / memUsage.heapTotal;
      const isHighLoad = memoryUsagePercent > 0.8;
      
      // Adjust rate limits based on load
      const dynamicMax = isHighLoad ? 
        Math.floor(config.rateLimit.global.max * 0.5) : 
        config.rateLimit.global.max;
      
      // Apply dynamic rate limit
      const dynamicLimit = rateLimit({
        store: this.store,
        windowMs: config.rateLimit.global.windowMs,
        max: dynamicMax,
        message: {
          error: 'System under high load, temporarily reduced rate limits',
          currentLoad: {
            memory: `${(memoryUsagePercent * 100).toFixed(2)}%`,
            adaptive: true
          }
        },
        keyGenerator: (req) => req.user ? `user:${req.user.id}` : `ip:${req.ip}`
      });

      dynamicLimit(req, res, next);
    };
  }

  // Rate limiting for authentication endpoints
  createAuthLimit() {
    return rateLimit({
      store: this.store,
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per 15 minutes
      message: {
        error: 'Too many authentication attempts',
        retryAfter: 900 // 15 minutes in seconds
      },
      keyGenerator: (req) => `auth:${req.ip}`,
      skipSuccessfulRequests: true,
      onLimitReached: (req, res, options) => {
        logger.warn('Authentication rate limit exceeded', {
          ip: req.ip,
          path: req.path,
          userAgent: req.headers['user-agent']
        });
      }
    });
  }
}

const rateLimitConfig = new RateLimitConfig();

module.exports = rateLimitConfig.createGlobalLimit();
module.exports.createServiceLimit = rateLimitConfig.createServiceLimit.bind(rateLimitConfig);
module.exports.createEndpointLimit = rateLimitConfig.createEndpointLimit.bind(rateLimitConfig);
module.exports.createAuthLimit = rateLimitConfig.createAuthLimit.bind(rateLimitConfig);
module.exports.createAdaptiveLimit = rateLimitConfig.createAdaptiveLimit.bind(rateLimitConfig);