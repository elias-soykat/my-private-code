module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => {
      console.log(`catchAsync.js:4 err ==>>`, err)
      return next(err);
    });
  };
};
