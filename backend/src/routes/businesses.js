const express = require("express");
const {
  registerBusiness,
  verifyBusiness,
  getBusiness,
  getBusinesses,
  getMyBusiness,
  updateMyBusiness,
  uploadBusinessAvatar,
  createJob,
  getJobs,
  updateJob,
  deleteJob,
} = require("../controllers/businessController");
const { jwtAuth, optionalAuth } = require("../middleware/auth");
const { uploadAvatar } = require("../middleware/upload");

const router = express.Router();

// edit an existing job
// delete an open or expired job posting
router
  .route("/me/jobs/:jobId")
  .patch(jwtAuth, updateJob)
  .delete(jwtAuth, deleteJob)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

// create a new job posting owned by the authenticated business
// get a paginated list of jobs created by the currently logged in business.
router
  .route("/me/jobs")
  .post(jwtAuth, createJob)
  .get(jwtAuth, getJobs)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

// upload or replace avatar for business
router
  .route("/me/avatar")
  .put(jwtAuth, uploadAvatar.single("file"), uploadBusinessAvatar)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

// retrieve the authenticated business profile
// update fields on the authenticated business profile
router
  .route("/me")
  .get(jwtAuth, getMyBusiness)
  .patch(jwtAuth, updateMyBusiness)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

// set the verified status of a business
router
  .route("/:businessId/verified")
  .patch(jwtAuth, verifyBusiness)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

// retrieve a specific business
router
  .route("/:businessId")
  .get(optionalAuth, getBusiness)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

// retrieve a list of businesses
// register a new business account
router
  .route("/")
  .get(optionalAuth, getBusinesses)
  .post(registerBusiness)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

module.exports = router;
