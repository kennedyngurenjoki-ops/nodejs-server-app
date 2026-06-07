const logger = require('../utils/logger');
const config = require('../config');

class ErrorHandler {
  // Main error handling middleware
  static handle(err, req, res, next) {
    let error = { ...err };
    error.message = err.message;

    // Log error
    logger.error('Error occurred:', {
      requestId: req.id,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      request: {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        userId: req.user?.id
      }
    });

    // Handle specific error types
    if (error.name === 'CastError') {
      error = ErrorHandler.handleCastError(error);
    }

    if (error.code === 11000) {
      error = ErrorHandler.handleDuplicateKeyError(error);
    }

    if (error.name === 'ValidationError') {
      error = ErrorHandler.handleValidationError(error);
    }

    if (error.name === 'JsonWebTokenError') {
      error = ErrorHandler.handleJWTError(error);
    }

    if (error.name === 'TokenExpiredError') {
      error = ErrorHandler.handleJWTExpiredError(error);
    }

    if (error.name === 'MulterError') {
      error = ErrorHandler.handleMulterError(error);
    }

    // Send error response
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Internal Server Error',
      ...(config.environment === 'development' && {
        stack: err.stack,
        details: error
      }),
      timestamp: new Date().toISOString(),
      requestId: req.id
    });
  }

  // Handle MongoDB CastError
  static handleCastError(err) {
    const message = `Invalid ${err.path}: ${err.value}`;
    return {
      message,
      statusCode: 400,
      name: 'CastError'
    };
  }

  // Handle MongoDB duplicate key error
  static handleDuplicateKeyError(err) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `${field} '${value}' already exists`;

    return {
      message,
      statusCode: 400,
      name: 'DuplicateKeyError'
    };
  }

  // Handle MongoDB validation error
  static handleValidationError(err) {
    const errors = Object.values(err.errors).map(val => ({
      field: val.path,
      message: val.message,
      value: val.value
    }));

    return {
      message: 'Validation failed',
      statusCode: 400,
      name: 'ValidationError',
      details: errors
    };
  }

  // Handle JWT errors
  static handleJWTError(err) {
    return {
      message: 'Invalid authentication token',
      statusCode: 401,
      name: 'JsonWebTokenError'
    };
  }

  static handleJWTExpiredError(err) {
    return {
      message: 'Authentication token expired',
      statusCode: 401,
      name: 'TokenExpiredError'
    };
  }

  // Handle Multer upload errors
  static handleMulterError(err) {
    let message = 'File upload error';

    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size too large';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected file field';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files';
    }

    return {
      message,
      statusCode: 400,
      name: 'MulterError'
    };
  }

  // Async error wrapper
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // Custom error class
  static createError(message, statusCode = 500) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  // Not found handler
  static notFound(req, res, next) {
    const error = new Error(`Route ${req.originalUrl} not found`);
    error.statusCode = 404;
    next(error);
  }
}

module.exports = ErrorHandler.handle;
module.exports.ErrorHandler = ErrorHandler;