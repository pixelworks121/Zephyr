const { z } = require('zod');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prismaClient');
const apiResponse = require('../utils/apiResponse');

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['ADMIN', 'EMPLOYEE']).optional().default('EMPLOYEE'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function sanitizeUser(user) {
  const { password, ...rest } = user;
  return rest;
}

const authController = {
  async register(req, res, next) {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return apiResponse.error(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors);
      }

      const { name, email, password, role } = parsed.data;

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return apiResponse.error(res, 'Email already in use', 409);
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: { name, email, password: hashedPassword, role },
      });

      const token = generateToken(user);

      return apiResponse.success(res, { user: sanitizeUser(user), token }, 'Registration successful', 201);
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return apiResponse.error(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors);
      }

      const { email, password } = parsed.data;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return apiResponse.error(res, 'Invalid email or password', 401);
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return apiResponse.error(res, 'Invalid email or password', 401);
      }

      const token = generateToken(user);

      return apiResponse.success(res, { user: sanitizeUser(user), token }, 'Login successful');
    } catch (err) {
      next(err);
    }
  },

  async getMe(req, res, next) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
      });

      if (!user) {
        return apiResponse.error(res, 'User not found', 404);
      }

      return apiResponse.success(res, user);
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req, res, next) {
    try {
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return apiResponse.error(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors);
      }

      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: { name: parsed.data.name },
        select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
      });

      return apiResponse.success(res, user, 'Profile updated');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = authController;
