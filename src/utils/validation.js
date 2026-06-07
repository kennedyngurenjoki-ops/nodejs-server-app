const Joi = require('joi');
const { validationResult } = require('express-validator');

class ValidationService {
  // Joi schemas for common validations
  static schemas = {
    // User schemas
    userRegistration: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]')).required(),
      firstName: Joi.string().min(1).max(50).required(),
      lastName: Joi.string().min(1).max(50).required(),
      role: Joi.string().valid('user', 'admin', 'moderator').default('user')
    }),

    userLogin: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required()
    }),

    userUpdate: Joi.object({
      firstName: Joi.string().min(1).max(50),
      lastName: Joi.string().min(1).max(50),
      email: Joi.string().email(),
      role: Joi.string().valid('user', 'admin', 'moderator')
    }),

    // General schemas
    pagination: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      sort: Joi.string().default('createdAt'),
      order: Joi.string().valid('asc', 'desc').default('desc')
    }),

    objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),

    // API schemas  
    apiKey: Joi.object({
      name: Joi.string().min(1).max(100).required(),
      permissions: Joi.array().items(Joi.string().valid('read', 'write', 'admin')).required(),
      expiresAt: Joi.date().greater('now')
    })
  };

  // Joi validation middleware
  static validateBody(schema) {
    return (req, res, next) => {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        return res.status(400).json({
          error: 'Validation failed',
          details: errors,
          timestamp: new Date().toISOString()
        });
      }

      req.validatedBody = value;
      next();
    };
  }

  static validateQuery(schema) {
    return (req, res, next) => {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        allowUnknown: true,
        stripUnknown: true
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        return res.status(400).json({
          error: 'Query validation failed',
          details: errors,
          timestamp: new Date().toISOString()
        });
      }

      req.validatedQuery = value;
      next();
    };
  }

  static validateParams(schema) {
    return (req, res, next) => {
      const { error, value } = schema.validate(req.params, {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        return res.status(400).json({
          error: 'Parameter validation failed',
          details: errors,
          timestamp: new Date().toISOString()
        });
      }

      req.validatedParams = value;
      next();
    };
  }

  // Express-validator result handler
  static handleValidationResult(req, res, next) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array().map(error => ({
          field: error.path,
          message: error.msg,
          value: error.value
        })),
        timestamp: new Date().toISOString()
      });
    }

    next();
  }

  // Custom validators
  static isValidObjectId(id) {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isStrongPassword(password) {
    // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
  }

  // Sanitization helpers
  static sanitizeInput(input) {
    if (typeof input === 'string') {
      return input.trim().replace(/[<>]/g, '');
    }
    return input;
  }

  static sanitizeObject(obj) {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = this.sanitizeInput(value);
    }
    return sanitized;
  }
}

module.exports = ValidationService;