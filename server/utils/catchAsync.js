module.exports = {
  catchAsync: (fn) => {
    return (req, res, next) => {
      fn(req, res, next).catch((err) => {
        return next(err);
      });
    };
  },

  sendError: (message, res, statusCode = 500) => {
    return res.status(statusCode).json({ status: 'error', message });
  },
};
