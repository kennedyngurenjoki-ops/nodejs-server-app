const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');

const config = require('../config');
const User = require('../models/User');
const ValidationService = require('../utils/validation');
const { createAuthLimit } = require('../middleware/rateLimit');
const { ErrorHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Apply auth-specific rate limiting
router.use(createAuthLimit());

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists
 */
router.post('/register', 
  ValidationService.validateBody(ValidationService.schemas.userRegistration),
  ErrorHandler.asyncHandler(async (req, res) => {
    const { email, password, firstName, lastName, role } = req.validatedBody;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw ErrorHandler.createError('User already exists with this email', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, config.auth.saltRounds);

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      role: role || 'user'
    });

    // Generate token
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        roles: [user.role] 
      },
      config.auth.jwtSecret,
      { expiresIn: config.auth.jwtExpiration }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        token
      }
    });
  })
);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Authenticate user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login',
  ValidationService.validateBody(ValidationService.schemas.userLogin),
  ErrorHandler.asyncHandler(async (req, res) => {
    const { email, password } = req.validatedBody;

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      throw ErrorHandler.createError('Invalid email or password', 401);
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw ErrorHandler.createError('Invalid email or password', 401);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        roles: [user.role] 
      },
      config.auth.jwtSecret,
      { expiresIn: config.auth.jwtExpiration }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          lastLogin: user.lastLogin
        },
        token
      }
    });
  })
);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
 *       401:
 *         description: Unauthorized
 */
router.get('/me',
  require('../middleware/auth').authenticate,
  ErrorHandler.asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
      throw ErrorHandler.createError('User not found', 404);
    }

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

module.exports = router;