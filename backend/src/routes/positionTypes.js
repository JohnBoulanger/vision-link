const express = require("express");
const {
  createPositionType,
  updatePositionType,
  deletePositionType,
  getPositionTypes,
} = require("../controllers/positionTypeController");
const { jwtAuth, optionalAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { createPositionTypeSchema, updatePositionTypeSchema } = require("../validators/positionTypeSchemas");

const router = express.Router();

// create a new position type
// retrieve a list of position types
router
  .route("/")
  .post(jwtAuth, validate(createPositionTypeSchema), createPositionType)
  .get(jwtAuth, getPositionTypes)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

// edit a position types details
// delete a position type
router
  .route("/:positionTypeId")
  .patch(jwtAuth, validate(updatePositionTypeSchema), updatePositionType)
  .delete(jwtAuth, deletePositionType)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

module.exports = router;
