const express = require("express");
const { jwtAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { createNegotiationSchema, decisionSchema } = require("../validators/negotiationSchemas");

const {
  createNegotiation,
  getNegotiations,
  setDecision,
} = require("../controllers/negotiationController");

const router = express.Router();

// start a negotiation for a job
router
  .route("/")
  .post(jwtAuth, validate(createNegotiationSchema), createNegotiation)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

// retrieve the authenticated users' current negotiation
router
  .route("/me")
  .get(jwtAuth, getNegotiations)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

// set the authenticated party's decision for an active negotiation
router
  .route("/me/decision")
  .patch(jwtAuth, validate(decisionSchema), setDecision)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

module.exports = router;
