const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Import middleware
const authMiddleware = require('./src/middleware/auth');
const rateLimit = require('./src/middleware/rateLimit');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'https://your-frontend-domain.com'],
  credentials: true
}));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate limiting middleware
app.use(rateLimit);

// Health check endpoint (public)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Metrics endpoint (public)
app.get('/metrics', (req, res) => {
  const memoryUsage = process.memoryUsage();
  res.status(200).json({
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Welcome endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to Node.js Server App',
    version: '1.0.0',
    description: 'Node.js server with authentication and rate limiting',
    endpoints: {
      health: '/health',
      metrics: '/metrics',
      auth: {
        login: '/api/v1/auth/login',
        register: '/api/v1/auth/register',
        refresh: '/api/v1/auth/refresh'
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Authentication routes (public)
app.post('/api/v1/auth/login', (req, res) => {
  // TODO: Implement login logic
  res.status(200).json({
    message: 'Login endpoint - implementation pending',
    body: req.body
  });
});

app.post('/api/v1/auth/register', (req, res) => {
  // TODO: Implement registration logic
  res.status(200).json({
    message: 'Registration endpoint - implementation pending',
    body: req.body
  });
});

app.post('/api/v1/auth/refresh', (req, res) => {
  // TODO: Implement token refresh logic
  res.status(200).json({
    message: 'Token refresh endpoint - implementation pending',
    body: req.body
  });
});

// Protected routes (require authentication)
app.get('/api/v1/user/profile', authMiddleware.authenticate, (req, res) => {
  res.status(200).json({
    message: 'User profile endpoint',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

// Admin routes (require admin role)
app.get('/api/v1/admin/users', 
  authMiddleware.authenticate,
  authMiddleware.requireRole(['admin']),
  (req, res) => {
    res.status(200).json({
      message: 'Admin users endpoint',
      user: req.user,
      timestamp: new Date().toISOString()
    });
  }
);

// API key protected route
app.get('/api/v1/service/status', authMiddleware.authenticateApiKey, (req, res) => {
  res.status(200).json({
    message: 'Service status endpoint',
    apiKey: req.apiKey,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📈 Metrics: http://localhost:${PORT}/metrics`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// For Vercel
module.exports = app;