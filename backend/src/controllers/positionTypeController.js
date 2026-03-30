const { PositionTypeService } = require("../services/positionTypeService");

async function createPositionType(req, res) {
  try {
    const requesterRole = req.user ? req.user.role : null;
    const positionType = await PositionTypeService.createPositionType(req.body, requesterRole);
    return res.status(201).json(positionType);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Missing or invalid fields in request" });
    }
    if (error.type === "forbidden") {
      return res.status(403).json({ error: "Only administrators can create position types" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function getPositionTypes(req, res) {
  try {
    const requesterRole = req.user ? req.user.role : null;
    const positionTypes = await PositionTypeService.getPositionTypes(req.query, requesterRole);
    return res.status(200).json(positionTypes);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Invalid query parameters" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function updatePositionType(req, res) {
  try {
    const requesterRole = req.user ? req.user.role : null;
    const positionTypeId = parseInt(req.params.positionTypeId);
    if (isNaN(positionTypeId)) {
      return res.status(404).json({ error: "Position type not found" });
    }
    const response = await PositionTypeService.updatePositionType(
      req.body,
      positionTypeId,
      requesterRole
    );
    return res.status(200).json(response);
  } catch (error) {
    if (error.type === "validation") {
      return res.status(400).json({ error: "Missing or invalid fields in request" });
    }
    if (error.type === "forbidden") {
      return res.status(403).json({ error: "Only administrators can update position types" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Position type not found" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function deletePositionType(req, res) {
  try {
    const requesterRole = req.user ? req.user.role : null;
    const positionTypeId = parseInt(req.params.positionTypeId);
    if (isNaN(positionTypeId)) {
      return res.status(404).json({ error: "Position type not found" });
    }
    await PositionTypeService.deletePositionType(positionTypeId, requesterRole);
    return res.status(204).send();
  } catch (error) {
    if (error.type === "forbidden") {
      return res.status(403).json({ error: "Only administrators can delete position types" });
    }
    if (error.type === "not_found") {
      return res.status(404).json({ error: "Position type not found" });
    }
    if (error.type === "conflict") {
      return res
        .status(409)
        .json({ error: "Cannot delete: this position type has qualified users" });
    }
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

module.exports = { createPositionType, getPositionTypes, updatePositionType, deletePositionType };
