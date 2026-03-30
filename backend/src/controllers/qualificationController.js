const { QualificationService } = require("../services/qualificationService");
const fs = require("fs");
const path = require("path");

async function createQualification(req, res) {
  try {
    const userId = req.user ? req.user.id : null;
    const requesterRole = req.user ? req.user.role : null;
    const response = await QualificationService.createQualification(
      req.body,
      userId,
      requesterRole
    );
    return res.status(201).json(response);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Missing or invalid fields in request" });
    }
    if (error.type === "forbidden") {
      return res
        .status(403)
        .json({ error: "You do not have permission to create this qualification" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Position type not found" });
    }
    if (error.type === "conflict") {
      return res
        .status(409)
        .json({ error: "A qualification for this position type already exists" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function getQualifications(req, res) {
  try {
    const requesterRole = req.user ? req.user.role : null;
    const response = await QualificationService.getQualifications(req.query, requesterRole);
    return res.status(200).json(response);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Invalid query parameters" });
    }
    if (error.type === "forbidden") {
      return res.status(403).json({
        error: "Businesses can only view approved qualifications for their job candidates",
      });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Qualification not found" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function getQualification(req, res) {
  try {
    const requester = req.user;
    const qualificationId = parseInt(req.params.qualificationId);
    if (isNaN(qualificationId)) {
      return res.status(404).json({ error: "Qualification not found" });
    }
    const response = await QualificationService.getQualification(qualificationId, requester);
    return res.status(200).json(response);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Invalid request" });
    }
    if (error.type === "forbidden") {
      return res
        .status(403)
        .json({ error: "You do not have permission to view this qualification" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Qualification not found" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function updateQualification(req, res) {
  try {
    const requester = req.user;
    const qualificationId = parseInt(req.params.qualificationId);
    if (isNaN(qualificationId)) {
      return res.status(404).json({ error: "Qualification not found" });
    }
    const response = await QualificationService.updateQualification(
      req.body,
      qualificationId,
      requester
    );
    return res.status(200).json(response);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Missing or invalid fields in request" });
    }
    if (error.type === "forbidden") {
      return res.status(403).json({ error: "This status change is not permitted for your role" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Qualification not found" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function uploadQualificationDocument(req, res) {
  try {
    const userId = req.user ? req.user.id : null;
    const qualificationId = parseInt(req.params.qualificationId);
    if (isNaN(qualificationId)) {
      return res.status(404).json({ error: "Qualification not found" });
    }
    if (!req.file) {
      return res
        .status(400)
        .json({ error: "A file is required to upload a qualification document" });
    }
    // create folder uploads/qualifications/:id if it doesnt exist
    const folder = path.join("uploads", "qualifications", String(qualificationId));
    fs.mkdirSync(folder, { recursive: true });
    // name the document uploaded document.pdf as required exactly by assignment spec for some reason
    const newPath = path.join(folder, "document.pdf");
    fs.renameSync(req.file.path, newPath);
    const documentUrl = `/uploads/qualifications/${qualificationId}/document.pdf`;
    const response = await QualificationService.uploadQualificationDocument(
      documentUrl,
      qualificationId,
      userId
    );
    return res.status(200).json(response);
  } catch (error) {
    if (error.type === "validation") {
      return res
        .status(400)
        .json({ error: "A file is required to upload a qualification document" });
    }
    if (error.type === "forbidden") {
      return res
        .status(403)
        .json({ error: "You do not have permission to upload a document for this qualification" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Qualification not found" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

module.exports = {
  createQualification,
  getQualification,
  updateQualification,
  getQualifications,
  uploadQualificationDocument,
};
