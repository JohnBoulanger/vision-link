const express = require("express");
const {
  authenticateAccount,
  createResetToken,
  useResetToken,
} = require("../controllers/authController");
const { authLimiter } = require("../middleware/rateLimit");
const { validate } = require("../middleware/validate");
const { loginSchema, resetRequestSchema, resetUseSchema } = require("../validators/authSchemas");

const router = express.Router();

// authenticate the account holder and provide them with a jwt token they can use for future requests
router
  .route("/tokens")
  .post(authLimiter, validate(loginSchema), authenticateAccount)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

// request a reset token that can later be used to activate the users account or reset their password
router
  .route("/resets")
  .post(authLimiter, validate(resetRequestSchema), createResetToken)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

// use the reset token to activate their account or reset their password
router
  .route("/resets/:resetToken")
  .post(authLimiter, validate(resetUseSchema), useResetToken)
  .all((req, res) => {
    res.status(405).json({ error: "Method Not Allowed" });
  });

module.exports = router;
