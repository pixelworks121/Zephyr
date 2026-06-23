const apiResponse = {
  success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      data,
      message,
    });
  },

  error(res, message = 'An error occurred', statusCode = 400, errors = null) {
    const body = {
      success: false,
      message,
    };
    if (errors) body.errors = errors;
    return res.status(statusCode).json(body);
  },
};

module.exports = apiResponse;
