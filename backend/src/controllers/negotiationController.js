const { NegotiationService } = require("../services/negotiationService");

async function createNegotiation(req, res) {
  try {
    const user = req.user;
    const result = await NegotiationService.createNegotiation(req.body, user);
    return res.status(result.created ? 201 : 200).json(result.negotiation);
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

async function getNegotiations(req, res) {
  try {
    const user = req.user;
    const negotiations = await NegotiationService.getNegotiations(user);
    return res.status(200).json(negotiations);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Bad Request" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Not Found" });
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
      return res.status(400).json({ error: "Bad Request" });
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

module.exports = { createNegotiation, getNegotiations, setDecision };
