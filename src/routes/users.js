const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const ValidationService = require('../utils/validation');
const { createServiceLimit } = require('../middleware/rateLimit');
const { ErrorHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Apply authentication to all user routes
router.use(authMiddleware.authenticate);

// Apply service-specific rate limiting
router.use(createServiceLimit('userService'));

/**
 * @swagger
 * /api/v1/users/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 */
router.get('/profile',
  ErrorHandler.asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        }
      }
    });
  })
);

/**
 * @swagger
 * /api/v1/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 */
router.put('/profile',
  ValidationService.validateBody(ValidationService.schemas.userUpdate),
  ErrorHandler.asyncHandler(async (req, res) => {
    const updates = req.validatedBody;

    // If email is being updated, check if it's unique
    if (updates.email) {
      const existingUser = await User.findOne({ 
        email: updates.email.toLowerCase(),
        _id: { $ne: req.user.id }
      });

      if (existingUser) {
        throw ErrorHandler.createError('Email already exists', 409);
      }

      updates.email = updates.email.toLowerCase();
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      }
    });
  })
);

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 */
router.get('/',
  authMiddleware.requireRole(['admin']),
  ValidationService.validateQuery(ValidationService.schemas.pagination),
  ErrorHandler.asyncHandler(async (req, res) => {
    const { page, limit, sort, order } = req.validatedQuery;
    const skip = (page - 1) * limit;

    const sortObj = {};
    sortObj[sort] = order === 'desc' ? -1 : 1;

    const users = await User.find({})
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .select('-password');

    const total = await User.countDocuments();

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  })
);

module.exports = router;