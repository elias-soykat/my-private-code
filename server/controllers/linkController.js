const Link = require('../model/linkModel');
const { catchAsync, sendError } = require('./../utils/catchAsync');
const User = require('../model/userModel');

exports.addLink = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId);

  const sentLinkIds = req.body.map((linkData) => {
    if (!linkData.link) {
      return sendError(`Full user link is required`, res, 400);
    }
    return linkData.id;
  });

  const linksToDeleteIds = user.links.filter(
    (linkId) => !sentLinkIds.includes(linkId)
  );

  user.links = user.links.filter((linkId) => sentLinkIds.includes(linkId));
  await Promise.all([
    user.save({ validateBeforeSave: false }),
    Link.deleteMany({ _id: { $in: linksToDeleteIds } }),
  ]);

  const createdLinks = [];
  for (const linkData of req.body) {
    const { id, name, link } = linkData;

    const newLink = await Link.create({ id, name, link });
    user.links.push(newLink);
    await user.save({ validateBeforeSave: false });
    createdLinks.push(newLink);
  }

  return res.status(201).json({ status: 'success', data: createdLinks });
});

exports.getAllLinksPerUser = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId).populate('links');
  return res
    .status(200)
    .json({ status: 'success', data: { links: user.links } });
});

exports.getAllLinksPerUserOffline = catchAsync(async (req, res) => {
  const userId = req.query.id;
  const links = await User.findById(userId).populate('links');
  return res.status(200).json({ status: 'success', data: { links } });
});
