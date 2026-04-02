"use strict";

const express = require("express");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const businessRoutes = require("./routes/businesses");
const positionTypeRoutes = require("./routes/positionTypes");
const jobRoutes = require("./routes/jobs");
const qualificationRoutes = require("./routes/qualifications");
const systemsRoutes = require("./routes/system");
const negotiationRoutes = require("./routes/negotiations");
const cors = require("cors");
const helmet = require("helmet");
const config = require("./config/env");
const { globalLimiter } = require("./middleware/rateLimit");

const FRONTEND_URL = config.frontendUrl;

function create_app() {
  const app = express();

  // Set up cors to allow requests from frontend
  app.use(
    cors({
      origin: FRONTEND_URL,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  );

  // security headers
  app.use(helmet());

  // parse json with size limit to prevent oversized payloads
  app.use(express.json({ limit: "1mb" }));

  // global rate limit fallback — all routes
  app.use(globalLimiter);

  app.use("/auth", authRoutes);
  app.use("/users", userRoutes);
  app.use("/businesses", businessRoutes);
  app.use("/position-types", positionTypeRoutes);
  app.use("/jobs", jobRoutes);
  app.use("/qualifications", qualificationRoutes);
  app.use("/system", systemsRoutes);
  app.use("/negotiations", negotiationRoutes);

  // handle multer file size errors
  app.use((err, req, res, next) => {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "File too large" });
    }
    next(err);
  });

  // route has no matches
  app.use((req, res) => {
    res.status(404).json({ error: "Not Found" });
  });

  return app;
}

module.exports = { create_app };
