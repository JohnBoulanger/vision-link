const { JobService } = require("../services/jobService");
const { getUser } = require("./userController");

async function getJobs(req, res) {
  try {
    const requesterRole = req.user ? req.user.role : null;
    const jobs = await JobService.getJobs(req.query, requesterRole);
    return res.status(200).json(jobs);
  } catch (error) {
    if (error.type === "validation") {
      return res
        .status(400)
        .json({ error: "Cannot sort by distance or ETA without providing lat and lon" });
    }
    if (error.type === "forbidden") {
      return res
        .status(403)
        .json({ error: "Businesses cannot provide location parameters when listing jobs" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function getJob(req, res) {
  try {
    const jobId = parseInt(req.params.jobId);
    if (isNaN(jobId)) {
      return res.status(404).json({ error: "Job not found" });
    }
    const user = req.user;
    const job = await JobService.getJob(req.query, jobId, user);
    return res.status(200).json(job);
  } catch (error) {
    if (error.type === "validation") {
      return res
        .status(400)
        .json({ error: "Businesses cannot provide location parameters when viewing a job" });
    }
    if (error.type === "forbidden") {
      return res.status(403).json({ error: "You do not have access to this job" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Job not found" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function setNoShow(req, res) {
  try {
    const requesterRole = req.user ? req.user.role : null;
    const jobId = parseInt(req.params.jobId);
    const businessId = req.user ? req.user.id : null;
    if (isNaN(jobId)) {
      return res.status(404).json({ error: "Job not found" });
    }
    const response = await JobService.setNoShow(jobId, businessId, requesterRole);
    return res.status(200).json(response);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Invalid request" });
    }
    if (error.type === "forbidden") {
      return res
        .status(403)
        .json({ error: "You do not have permission to report a no-show for this job" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Job not found" });
    }
    if (error.type === "conflict") {
      return res
        .status(409)
        .json({ error: "No-show can only be reported during the active work period" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function setInterest(req, res) {
  try {
    const jobId = parseInt(req.params.jobId);
    const userId = req.user ? req.user.id : null;
    if (isNaN(jobId)) {
      return res.status(404).json({ error: "Job not found" });
    }
    const response = await JobService.setInterest(req.body, jobId, userId);
    return res.status(200).json(response);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Missing or invalid interest value" });
    }
    if (error.type === "forbidden") {
      return res
        .status(403)
        .json({ error: "You do not have an approved qualification for this position type" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Job not found" });
    }
    if (error.type === "conflict") {
      return res.status(409).json({
        error: "This job is no longer available or you are currently in a negotiation for it",
      });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function getCandidates(req, res) {
  try {
    const requesterRole = req.user ? req.user.role : null;
    const jobId = parseInt(req.params.jobId);
    const businessId = req.user ? req.user.id : null;
    if (isNaN(jobId)) {
      return res.status(404).json({ error: "Job not found" });
    }
    const candidates = await JobService.getCandidates(req.query, jobId, businessId, requesterRole);
    return res.status(200).json(candidates);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Invalid query parameters" });
    }
    if (error.type === "forbidden") {
      return res
        .status(403)
        .json({ error: "You do not have permission to view candidates for this job" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Job not found" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function getUserCandidates(req, res) {
  try {
    const requesterRole = req.user ? req.user.role : null;
    const jobId = parseInt(req.params.jobId);
    const userId = parseInt(req.params.userId);
    const businessId = req.user ? req.user.id : null;
    if (isNaN(jobId) || isNaN(userId)) {
      return res.status(404).json({ error: "Job or user not found" });
    }
    const userCandidates = await JobService.getUserCandidates(
      req.query,
      jobId,
      userId,
      businessId,
      requesterRole
    );
    return res.status(200).json(userCandidates);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Invalid query parameters" });
    }
    if (error.type === "forbidden") {
      return res.status(403).json({ error: "You do not have permission to view this candidate" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Job or candidate not found" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function updateInterestInCandidate(req, res) {
  try {
    const requesterRole = req.user ? req.user.role : null;
    const jobId = parseInt(req.params.jobId);
    const userId = parseInt(req.params.userId);
    const businessId = req.user ? req.user.id : null;
    if (isNaN(jobId) || isNaN(userId)) {
      return res.status(404).json({ error: "Job or user not found" });
    }
    const response = await JobService.updateInterestInCandidate(
      req.body,
      jobId,
      userId,
      businessId,
      requesterRole
    );
    return res.status(200).json(response);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Missing or invalid interest value" });
    }
    if (error.type === "forbidden") {
      return res.status(403).json({ error: "You do not have permission to invite this candidate" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Job or candidate not found" });
    }
    if (error.type === "conflict") {
      return res
        .status(409)
        .json({ error: "This job is not currently open for candidate invitations" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function getInterests(req, res) {
  try {
    const requesterRole = req.user ? req.user.role : null;
    const jobId = parseInt(req.params.jobId);
    const businessId = req.user ? req.user.id : null;
    if (isNaN(jobId)) {
      return res.status(404).json({ error: "Job not found" });
    }
    const interests = await JobService.getInterests(req.query, jobId, businessId, requesterRole);
    return res.status(200).json(interests);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Invalid query parameters" });
    }
    if (error.type === "forbidden") {
      return res
        .status(403)
        .json({ error: "You do not have permission to view interests for this job" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Job not found" });
    }
    if (error.type === "conflict") {
      return res.status(409).json({ error: "This job is no longer available for viewing interests" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

module.exports = {
  getJobs,
  getJob,
  setInterest,
  setNoShow,
  getCandidates,
  getUserCandidates,
  updateInterestInCandidate,
  getInterests,
};
