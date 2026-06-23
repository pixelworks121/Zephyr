const apiResponse = require('../utils/apiResponse');

function errorHandler(err, req, res, _next) {
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    return apiResponse.error(res, `A record with this ${field} already exists`, 409);
  }

  if (err.code === 'P2025') {
    return apiResponse.error(res, 'Record not found', 404);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  return apiResponse.error(res, message, statusCode);
}

module.exports = errorHandler;
