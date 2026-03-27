const express = require("express");
const {
  registerUser,
  getUsers,
  updateUserSuspend,
  getUser,
  updateUser,
  updateUserAvailability,
  uploadUserAvatar,
  uploadUserResume,
  getInvitations,
  getInterests,
} = require("../controllers/userController");
const { jwtAuth } = require("../middleware/auth");
const { uploadAvatar, uploadResume } = require("../middleware/upload");

const router = express.Router();

// upload or replace avatar for authenticated user
router
  .route("/me/avatar")
  .put(jwtAuth, uploadAvatar.single("file"), uploadUserAvatar)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

// upload or replace resume for authenticated user
router
  .route("/me/resume")
  .put(jwtAuth, uploadResume.single("file"), uploadUserResume)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

// set the suspended status of a regular user
router
  .route("/:userId/suspended")
  .patch(jwtAuth, updateUserSuspend)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

// update availability status of user
router
  .route("/me/available")
  .patch(jwtAuth, updateUserAvailability)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

// retrieve a list of job invitations for the authenticated regular user.
// each invitation represents a job posting where a business has invited the user to express interest
router
  .route("/me/invitations")
  .get(jwtAuth, getInvitations)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

// retrieve a list of job postings that the authenticated regular user is currently interested in
router
  .route("/me/interests")
  .get(jwtAuth, getInterests)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

// retrieve the authenticated users account profile
router
  .route("/me")
  .get(jwtAuth, getUser)
  .patch(jwtAuth, updateUser)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

// register a new regular user account
// retrieve a list of regular users
router
  .route("/")
  .post(registerUser)
  .get(jwtAuth, getUsers)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

module.exports = router;
