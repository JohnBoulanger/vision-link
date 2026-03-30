const { NegotiationService } = require("../services/negotiationService");

async function createNegotiation(req, res) {
  try {
    const user = req.user;
    const result = await NegotiationService.createNegotiation(req.body, user);
    return res.status(result.created ? 201 : 200).json(result.negotiation);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Missing required field: interest_id" });
    }
    if (error.type === "forbidden") {
      return res
        .status(403)
        .json({ error: "Both parties must express mutual interest before starting a negotiation" });
    }
    if (error.type === "not_found") {
      return res
        .status(404)
        .json({ error: "Interest record not found or you are not a party to it" });
    }
    if (error.type === "conflict") {
      return res.status(409).json({
        error:
          "One or both parties are already in an active negotiation, or this job is no longer negotiable",
      });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function getNegotiations(req, res) {
  try {
    const user = req.user;
    const negotiations = await NegotiationService.getNegotiations(user);
    return res.status(200).json(negotiations);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Invalid request" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "You are not currently in an active negotiation" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function setDecision(req, res) {
  try {
    const user = req.user;
    const response = await NegotiationService.setDecision(req.body, user);
    return res.status(200).json(response);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Missing or invalid decision value" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "You are not currently in an active negotiation" });
    }
    if (error.type === "conflict") {
      return res.status(409).json({
        error:
          "Negotiation ID does not match your active negotiation, or the negotiation is no longer active",
      });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

module.exports = { createNegotiation, getNegotiations, setDecision };
