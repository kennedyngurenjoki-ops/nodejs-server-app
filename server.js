const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Import middleware
const authMiddleware = require('./src/middleware/auth');
const rateLimitMiddleware = require('./src/middleware/rateLimit');
const config = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Apply rate limiting
app.use(rateLimitMiddleware);

// Health check endpoint (public)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Metrics endpoint (public)
app.get('/metrics', (req, res) => {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  res.status(200).json({
    uptime: `${Math.floor(uptime)}s`,
    memory: {
      used: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    },
    timestamp: new Date().toISOString()
  });
});

// API routes with authentication
app.use('/api', authMiddleware.authenticate);

// Example protected API endpoints
app.get('/api/user/profile', (req, res) => {
  res.json({
    message: 'User profile data',
    user: {
      id: req.user.id,
      roles: req.user.roles
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/admin/users', authMiddleware.requireRole(['admin']), (req, res) => {
  res.json({
    message: 'Admin users list',
    data: [
      { id: 1, name: 'John Doe', role: 'user' },
      { id: 2, name: 'Jane Smith', role: 'admin' }
    ],
    requestedBy: req.user.id,
    timestamp: new Date().toISOString()
  });
});

// Auth endpoints (public paths defined in middleware)
app.post('/api/v1/auth/login', (req, res) => {
  // Mock login endpoint
  const { email, password } = req.body;
  
  // This is a mock implementation - replace with real authentication
  if (email && password) {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: 1, email, roles: ['user'] },
      config.auth.jwtSecret || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: { id: 1, email, roles: ['user'] }
    });
  } else {
    res.status(400).json({
      error: 'Email and password required'
    });
  }
});

app.post('/api/v1/auth/register', (req, res) => {
  // Mock registration endpoint
  const { email, password, name } = req.body;
  
  if (email && password && name) {
    res.status(201).json({
      message: 'User registered successfully',
      user: { id: Date.now(), email, name, roles: ['user'] }
    });
  } else {
    res.status(400).json({
      error: 'Email, password, and name required'
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📈 Metrics: http://localhost:${PORT}/metrics`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
});