const express = require('express');
const authRoutes = require('./auth');
const userRoutes = require('./users');
const adminRoutes = require('./admin');

const router = express.Router();

// Health check for API
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'API',
    timestamp: new Date().toISOString(),
    version: 'v1'
  });
});

// Mount route modules
router.use('/v1/auth', authRoutes);
router.use('/v1/users', userRoutes);
router.use('/v1/admin', adminRoutes);

// API info endpoint
router.get('/info', (req, res) => {
  res.status(200).json({
    name: 'Node.js Server API',
    version: '1.0.0',
    description: 'A comprehensive Node.js server with authentication and rate limiting',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users', 
      admin: '/api/v1/admin'
    },
    documentation: '/api-docs'
  });
});

module.exports = router;