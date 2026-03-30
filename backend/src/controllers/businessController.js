const { BusinessService } = require("../services/businessService");

async function registerBusiness(req, res) {
  try {
    const business = await BusinessService.registerBusiness(req.body);
    return res.status(201).json(business);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Missing or invalid fields in registration request" });
    }
    if (error.type === "conflict") {
      return res.status(409).json({ error: "An account with this email address already exists" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function verifyBusiness(req, res) {
  try {
    const businessId = parseInt(req.params.businessId);
    if (isNaN(businessId)) {
      return res.status(404).json({ error: "Business not found" });
    }
    const requesterRole = req.user ? req.user.role : null;
    const response = await BusinessService.verifyBusiness(req.body, businessId, requesterRole);
    return res.status(200).json(response);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Missing or invalid verified value" });
    }
    if (error.type === "forbidden") {
      return res.status(403).json({ error: "Only administrators can verify businesses" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Business not found" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function getBusiness(req, res) {
  try {
    const businessId = parseInt(req.params.businessId);
    if (isNaN(businessId)) {
      return res.status(404).json({ error: "Business not found" });
    }
    const requesterRole = req.user ? req.user.role : null;
    const response = await BusinessService.getBusiness(businessId, requesterRole);
    return res.status(200).json(response);
  } catch (error) {
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Business not found" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function getBusinesses(req, res) {
  try {
    const requesterRole = req.user ? req.user.role : null;
    const response = await BusinessService.getBusinesses(req.query, requesterRole);
    return res.status(200).json(response);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Invalid query parameters" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Business not found" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function getMyBusiness(req, res) {
  try {
    const requesterRole = req.user ? req.user.role : null;
    const businessId = req.user ? req.user.id : null;
    const response = await BusinessService.getMyBusiness(businessId, requesterRole);
    return res.status(200).json(response);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Invalid query parameters" });
    }
    if (error.type === "forbidden") {
      return res.status(403).json({ error: "You do not have permission to view this business" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Business not found" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function updateMyBusiness(req, res) {
  try {
    const businessId = req.user ? req.user.id : null;
    const response = await BusinessService.updateMyBusiness(req.body, businessId);
    return res.status(200).json(response);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Missing or invalid fields in request" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Business not found" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function uploadBusinessAvatar(req, res) {
  try {
    const requesterRole = req.user ? req.user.role : null;
    const businessId = req.user ? req.user.id : null;
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const avatarUrl = `/uploads/users/${businessId}/${req.file.filename}`;
    const response = await BusinessService.uploadBusinessAvatar(
      avatarUrl,
      businessId,
      requesterRole
    );
    return res.status(200).json(response);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Invalid avatar upload" });
    }
    if (error.type === "forbidden") {
      return res.status(403).json({ error: "You do not have permission to upload this avatar" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Business not found" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function createJob(req, res) {
  try {
    const requesterRole = req.user ? req.user.role : null;
    const businessId = req.user ? req.user.id : null;
    const job = await BusinessService.createJob(req.body, businessId, requesterRole);
    return res.status(201).json(job);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Missing or invalid fields in job posting" });
    }
    if (error.type === "forbidden") {
      return res
        .status(403)
        .json({ error: "Your business must be verified to create job postings" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Business not found" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function getJobs(req, res) {
  try {
    const businessId = req.user ? req.user.id : null;
    const jobs = await BusinessService.getJobs(req.query, businessId);
    return res.status(200).json(jobs);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Invalid query parameters" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Job not found" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function updateJob(req, res) {
  try {
    const requesterRole = req.user ? req.user.role : null;
    const businessId = req.user ? req.user.id : null;
    const jobId = parseInt(req.params.jobId);
    if (isNaN(jobId)) {
      return res.status(404).json({ error: "Job not found" });
    }
    const response = await BusinessService.updateJob(req.body, businessId, jobId, requesterRole);
    return res.status(200).json(response);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Missing or invalid fields in job update" });
    }
    if (error.type === "forbidden") {
      return res.status(403).json({ error: "You can only modify your own job postings" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Job not found" });
    }
    if (error.type === "conflict") {
      return res.status(409).json({ error: "This job is no longer open and cannot be modified" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function deleteJob(req, res) {
  try {
    const requesterRole = req.user ? req.user.role : null;
    const businessId = req.user ? req.user.id : null;
    const jobId = parseInt(req.params.jobId);
    if (isNaN(jobId)) {
      return res.status(404).json({ error: "Job not found" });
    }
    const response = await BusinessService.deleteJob(businessId, jobId, requesterRole);
    return res.status(204).send();
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Invalid request" });
    }
    if (error.type === "forbidden") {
      return res.status(403).json({ error: "You can only delete your own job postings" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Job not found" });
    }
    if (error.type === "conflict") {
      return res
        .status(409)
        .json({ error: "Cannot delete a job with an active negotiation in progress" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

module.exports = {
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
};
