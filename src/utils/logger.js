const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const config = require('../config');
const path = require('path');

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}] ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create transports array
const transports = [];

// Console transport
transports.push(
  new winston.transports.Console({
    level: config.logging.level,
    format: config.environment === 'production' ? logFormat : consoleFormat
  })
);

// File transport (if enabled)
if (config.logging.file.enabled) {
  // Ensure logs directory exists
  const fs = require('fs');
  const logsDir = config.logging.file.directory;
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Daily rotate file transport
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, config.logging.file.filename),
      datePattern: 'YYYY-MM-DD',
      maxSize: config.logging.file.maxSize,
      maxFiles: config.logging.file.maxFiles,
      format: logFormat,
      level: config.logging.level
    })
  );

  // Error-specific log file
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: config.logging.file.maxSize,
      maxFiles: config.logging.file.maxFiles,
      format: logFormat,
      level: 'error'
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false
});

// Add request ID to child logger
logger.child = (defaultMeta) => {
  return logger.createLogger({
    defaultMeta,
    transports: logger.transports
  });
};

// Request logger middleware
logger.requestLogger = (req, res, next) => {
  req.logger = logger.child({
    requestId: req.id,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  next();
};

module.exports = logger;