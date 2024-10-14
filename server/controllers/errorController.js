const { sendError } = require('../utils/catchAsync');

module.exports = (err, req, res) => {
  let error = { ...err, name: err.name, message: err.message };
  if (error.name === 'CastError') {
    const message = `Invalid ${err.path}: ${err.value}`;
    return sendError(message, res, 400);
  }

  if (error.code === 11000) {
    const message = `This email is already registered. Please use a different email address.`;
    return sendError(message, res, 400);
  }

  if (error.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((el) => el.message);
    const message = ` ${errors.join('. ')}`;
    return sendError(message, res, 400);
  }

  if (error.name === 'JsonWebTokenError') {
    const message = `Invalid token. Please log in again!`;
    return sendError(message, res, 401);
  }

  if (error.name === 'TokenExpiredError') {
    const message = `Your token has expired! Please log in again.`;
    return sendError(message, res, 401);
  }

  return sendError(err.message, res, err.statusCode || 500);
};
