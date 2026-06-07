const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const ValidationService = require('../utils/validation');
const { createServiceLimit } = require('../middleware/rateLimit');
const { ErrorHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Apply authentication and admin role requirement to all routes
router.use(authMiddleware.authenticate);
router.use(authMiddleware.requireRole(['admin']));
router.use(createServiceLimit('adminService'));

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   get:
 *     summary: Get user by ID (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/users/:id',
  ValidationService.validateParams(Joi.object({
    id: ValidationService.schemas.objectId.required()
  })),
  ErrorHandler.asyncHandler(async (req, res) => {
    const user = await User.findById(req.validatedParams.id);

    if (!user) {
      throw ErrorHandler.createError('User not found', 404);
    }

    res.json({
      success: true,
      data: { user }
    });
  })
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/role:
 *   put:
 *     summary: Update user role (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.put('/users/:id/role',
  ValidationService.validateParams(Joi.object({
    id: ValidationService.schemas.objectId.required()
  })),
  ValidationService.validateBody(Joi.object({
    role: Joi.string().valid('user', 'admin', 'moderator').required()
  })),
  ErrorHandler.asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const { role } = req.validatedBody;

    // Prevent admin from changing their own role
    if (id === req.user.id) {
      throw ErrorHandler.createError('Cannot change your own role', 400);
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw ErrorHandler.createError('User not found', 404);
    }

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: { user }
    });
  })
);

/**
 * @swagger
 * /api/v1/admin/stats:
 *   get:
 *     summary: Get system statistics (admin only)
 *     tags: [Admin]
 */
router.get('/stats',
  ErrorHandler.asyncHandler(async (req, res) => {
    const [
      totalUsers,
      activeUsers,
      adminUsers,
      recentUsers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ 
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
    ]);

    const systemStats = {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform
    };

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          admins: adminUsers,
          recent: recentUsers
        },
        system: systemStats
      }
    });
  })
);

module.exports = router;