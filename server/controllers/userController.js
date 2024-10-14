const { catchAsync, sendError } = require('./../utils/catchAsync');
const User = require('./../model/userModel');

exports.updateProfile = catchAsync(async (req, res) => {
  const { firstName, lastName, photo } = req.body;
  if (!firstName || !lastName) {
    return sendError('Please provide your first and last name', res, 400);
  }

  const currentUser = await User.findByIdAndUpdate(
    req.user._id,
    { firstName, lastName, photo },
    { new: true, runValidators: true }
  );

  return res.status(200).json({ status: 'success', data: currentUser });
});

exports.getUserProfile = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const links = await User.find({ _id: userId });
  return res.status(200).json({ status: 'success', data: { user: links } });
});

exports.getUserProfileOffline = catchAsync(async (req, res) => {
  const userId = req.query.id;
  const users = await User.find({ _id: userId });
  return res.status(200).json({ status: 'success', data: { user: users } });
});
