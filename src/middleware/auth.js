const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

class AuthMiddleware {
  constructor() {
    this.publicPaths = new Set([
      '/health',
      '/metrics',
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/api/v1/auth/refresh'
    ]);
  }

  // Main authentication middleware
  authenticate = async (req, res, next) => {
    try {
      // Skip auth for public paths
      if (this.isPublicPath(req.path)) {
        return next();
      }

      const token = this.extractToken(req);
      if (!token) {
        return this.unauthorizedResponse(res, 'Authentication token required');
      }

      const decoded = await this.verifyToken(token);
      req.user = decoded;

      // Add user context to logger
      req.logger = req.logger || {};
      req.logger.userId = decoded.id;
      req.logger.userRoles = decoded.roles;

      next();
      
    } catch (error) {
      logger.error('Authentication error:', error);
      return this.unauthorizedResponse(res, 'Invalid authentication token');
    }
  };

  // Extract JWT token from request
  extractToken(req) {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check cookies
    const cookieToken = req.cookies?.accessToken;
    if (cookieToken) {
      return cookieToken;
    }

    // Check query parameter (less secure, use with caution)
    const queryToken = req.query.token;
    if (queryToken) {
      return queryToken;
    }

    return null;
  }

  // Verify JWT token
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, config.auth.jwtSecret);
      
      // Check token expiration
      if (decoded.exp < Date.now() / 1000) {
        throw new Error('Token expired');
      }

      // Additional validation can be added here
      // e.g., check against blacklist, validate user still exists, etc.

      return decoded;
      
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  // Check if path is public
  isPublicPath(path) {
    // Exact match
    if (this.publicPaths.has(path)) {
      return true;
    }

    // Pattern matching for public routes
    const publicPatterns = [
      /^\/docs\//,
      /^\/static\//,
      /^\/favicon\.ico$/
    ];

    return publicPatterns.some(pattern => pattern.test(path));
  }

  // Role-based authorization middleware
  requireRole = (requiredRoles) => {
    return (req, res, next) => {
      if (!req.user) {
        return this.unauthorizedResponse(res, 'Authentication required');
      }

      const userRoles = req.user.roles || [];
      const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

      if (!hasRequiredRole) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: requiredRoles,
          current: userRoles
        });
      }

      next();
    };
  };

  // Service-specific auth middleware
  requireAuth = (authRequired = true) => {
    return (req, res, next) => {
      if (!authRequired) {
        return next();
      }

      return this.authenticate(req, res, next);
    };
  };

  // API key authentication for service-to-service communication
  authenticateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return this.unauthorizedResponse(res, 'API key required');
    }

    // Verify API key (implement your logic here)
    const validKeys = config.auth.apiKeys || [];
    const isValidKey = validKeys.some(key => key.key === apiKey && key.active);

    if (!isValidKey) {
      return this.unauthorizedResponse(res, 'Invalid API key');
    }

    // Add API key context
    req.apiKey = validKeys.find(key => key.key === apiKey);
    next();
  };

  // Unauthorized response helper
  unauthorizedResponse(res, message) {
    return res.status(401).json({
      error: 'Unauthorized',
      message,
      timestamp: new Date().toISOString()
    });
  }

  // Optional: Rate limiting per user
  createUserRateLimit = () => {
    const rateLimit = require('express-rate-limit');
    
    return rateLimit({
      keyGenerator: (req) => {
        return req.user ? req.user.id : req.ip;
      },
      max: config.rateLimit.perUser || 1000,
      windowMs: 15 * 60 * 1000, // 15 minutes
      message: {
        error: 'Too many requests from this user',
        retryAfter: '15 minutes'
      }
    });
  };
}

module.exports = new AuthMiddleware();