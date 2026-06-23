const apiResponse = require('../utils/apiResponse');

function requireAdmin(req, res, next) {
  if (!req.user) {
    return apiResponse.error(res, 'Not authenticated', 401);
  }
  if (req.user.role !== 'ADMIN') {
    return apiResponse.error(res, 'Admin access required', 403);
  }
  next();
}

function requireEmployee(req, res, next) {
  if (!req.user) {
    return apiResponse.error(res, 'Not authenticated', 401);
  }
  if (req.user.role !== 'ADMIN' && req.user.role !== 'EMPLOYEE') {
    return apiResponse.error(res, 'Access denied', 403);
  }
  next();
}

module.exports = { requireAdmin, requireEmployee };
