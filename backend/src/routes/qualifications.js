const express = require("express");
const router = express.Router();
const {
  createQualification,
  getQualifications,
  getQualification,
  updateQualification,
  uploadQualificationDocument,
  getUserQualifications,
} = require("../controllers/qualificationController");
const { jwtAuth } = require("../middleware/auth");
const { uploadDocument } = require("../middleware/upload");
const { uploadLimiter } = require("../middleware/rateLimit");
const { validate } = require("../middleware/validate");
const { createQualificationSchema, updateQualificationSchema } = require("../validators/qualificationSchemas");

// list the authenticated regular user's own qualifications
// must come before /:qualificationId to avoid "me" being treated as an id
router
  .route("/me")
  .get(jwtAuth, getUserQualifications)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

// upload or replace document for authenticated user
router
  .route("/:qualificationId/document")
  .put(jwtAuth, uploadLimiter, uploadDocument.single("file"), uploadQualificationDocument)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

// retrieve a single qualification request
// update a qualification request
router
  .route("/:qualificationId")
  .get(jwtAuth, getQualification)
  .patch(jwtAuth, validate(updateQualificationSchema), updateQualification)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

// retrieve a list of qualifications that need admin attention
// create a new qualification for a position type
router
  .route("/")
  .get(jwtAuth, getQualifications)
  .post(jwtAuth, validate(createQualificationSchema), createQualification)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

module.exports = router;
