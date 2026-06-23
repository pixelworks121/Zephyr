const jwt = require('jsonwebtoken');
const prisma = require('../utils/prismaClient');
const apiResponse = require('../utils/apiResponse');

async function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return apiResponse.error(res, 'No token provided', 401);
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    });

    if (!user) {
      return apiResponse.error(res, 'User not found', 401);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return apiResponse.error(res, 'Token expired', 401);
    }
    return apiResponse.error(res, 'Invalid token', 401);
  }
}

module.exports = verifyToken;
