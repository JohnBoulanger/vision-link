const express = require("express");
const {
  getJobs,
  getJob,
  setNoShow,
  setInterest,
  getCandidates,
  getUserCandidates,
  updateInterestInCandidate,
  getInterests,
} = require("../controllers/jobController");
const { jwtAuth } = require("../middleware/auth");

const router = express.Router();

// list all discoverable qualified regular users for this job, and whether each has been invited by the business for this job.
router
  .route("/:jobId/candidates")
  .get(jwtAuth, getCandidates)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

// retrieve summary details about a regular user and their qualification for a given job.
router
  .route("/:jobId/candidates/:userId")
  .get(jwtAuth, getUserCandidates)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

// invite (or withdraw an invitation for) a regular user to express interest in this job posting.
router
  .route("/:jobId/candidates/:userId/interested")
  .patch(jwtAuth, updateInterestInCandidate)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

// retrieve a list of regular users who are currently interested in this job posting.
router
  .route("/:jobId/interests")
  .get(jwtAuth, getInterests)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

// express interest in a job posting
router
  .route("/:jobId/interested")
  .patch(jwtAuth, setInterest)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

// declare that the regular user did not show up to the job
router
  .route("/:jobId/no-show")
  .patch(jwtAuth, setNoShow)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

// see detail of a job
router
  .route("/:jobId(\\d+)")
  .get(jwtAuth, getJob)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

// retrieve a paginated list of open job postings
router
  .route("/")
  .get(jwtAuth, getJobs)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

module.exports = router;
