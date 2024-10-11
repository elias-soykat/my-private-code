const express = require("express");
const linkController = require("./../controllers/linkController");
const { protected } = require("./../controllers/authController");
const router = express.Router();

const { addLink, getAllLinksPerUser, getAllLinksPerUserOffline } =
  linkController;

router.route("/").post(protected, addLink).get(protected, getAllLinksPerUser);

router.route("/offline-links").get(getAllLinksPerUserOffline);

module.exports = router;
