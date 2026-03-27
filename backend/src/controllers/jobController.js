const { JobService } = require("../services/jobService");
const { getUser } = require("./userController");

async function getJobs(req, res) {
  try {
    const requesterRole = req.user ? req.user.role : null;
    const jobs = await JobService.getJobs(req.query, requesterRole);
    return res.status(200).json(jobs);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Bad Request" });
    }
    if (error.type === "forbidden") {
      return res.status(403).json({ error: "Forbidden" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function getJob(req, res) {
  try {
    const jobId = parseInt(req.params.jobId);
    if (isNaN(jobId)) {
      return res.status(404).json({ error: "Not Found" });
    }
    const user = req.user;
    const job = await JobService.getJob(req.query, jobId, user);
    return res.status(200).json(job);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Bad Request" });
    }
    if (error.type === "forbidden") {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Not Found" });
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
      return res.status(404).json({ error: "Not Found" });
    }
    const response = await JobService.setNoShow(jobId, businessId, requesterRole);
    return res.status(200).json(response);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Bad Request" });
    }
    if (error.type === "forbidden") {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Not Found" });
    }
    if (error.type === "conflict") {
      return res.status(409).json({ error: "Conflict" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function setInterest(req, res) {
  try {
    const jobId = parseInt(req.params.jobId);
    const userId = req.user ? req.user.id : null;
    if (isNaN(jobId)) {
      return res.status(404).json({ error: "Not Found" });
    }
    const response = await JobService.setInterest(req.body, jobId, userId);
    return res.status(200).json(response);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Bad Request" });
    }
    if (error.type === "forbidden") {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Not Found" });
    }
    if (error.type === "conflict") {
      return res.status(409).json({ error: "Conflict" });
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
      return res.status(404).json({ error: "Not Found" });
    }
    const candidates = await JobService.getCandidates(req.query, jobId, businessId, requesterRole);
    return res.status(200).json(candidates);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Bad Request" });
    }
    if (error.type === "forbidden") {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Not Found" });
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
      return res.status(404).json({ error: "Not Found" });
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
      return res.status(400).json({ error: "Bad Request" });
    }
    if (error.type === "forbidden") {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Not Found" });
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
      return res.status(404).json({ error: "Not Found" });
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
      return res.status(400).json({ error: "Bad Request" });
    }
    if (error.type === "forbidden") {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Not Found" });
    }
    if (error.type === "conflict") {
      return res.status(409).json({ error: "Conflict" });
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
      return res.status(404).json({ error: "Not Found" });
    }
    const interests = await JobService.getInterests(req.query, jobId, businessId, requesterRole);
    return res.status(200).json(interests);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Bad Request" });
    }
    if (error.type === "forbidden") {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Not Found" });
    }
    if (error.type === "conflict") {
      return res.status(409).json({ error: "Conflict" });
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
