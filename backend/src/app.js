"use strict";

const path = require("path");
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

  // trust reverse proxy (railway, nginx) so rate limiting uses real client ip
  app.set("trust proxy", 1);

  // Set up cors to allow requests from frontend
  app.use(
    cors({
      origin: FRONTEND_URL,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  );

  // security headers — relax CSP so leaflet map tiles and styles load
  // allow cross-origin resource loading so frontend can display uploaded files
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
          imgSrc: [
            "'self'",
            "data:",
            "blob:",
            "https://*.basemaps.cartocdn.com",
            "https://*.tile.openstreetmap.org",
          ],
          connectSrc: ["'self'", "ws:", "wss:", "https://nominatim.openstreetmap.org"],
          fontSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  // parse json with size limit to prevent oversized payloads
  app.use(express.json({ limit: "1mb" }));

  // global rate limit fallback — all routes
  app.use(globalLimiter);

  // all api routes live under /api so they don't collide with frontend spa routes
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/businesses", businessRoutes);
  app.use("/api/position-types", positionTypeRoutes);
  app.use("/api/jobs", jobRoutes);
  app.use("/api/qualifications", qualificationRoutes);
  app.use("/api/system", systemsRoutes);
  app.use("/api/negotiations", negotiationRoutes);

  // handle multer file size errors
  app.use((err, req, res, next) => {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "File too large" });
    }
    next(err);
  });

  // serve uploaded files (avatars, resumes, qualification docs)
  app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

  // serve frontend static build in production (single-service deploy)
  const frontendDist = path.join(__dirname, "../../frontend/dist");
  app.use(express.static(frontendDist));

  // spa fallback — send index.html for non-api GET requests so react router works
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/uploads") && !req.path.startsWith("/api")) {
      return res.sendFile(path.join(frontendDist, "index.html"), (err) => {
        if (err) next();
      });
    }
    next();
  });

  // route has no matches
  app.use((req, res) => {
    res.status(404).json({ error: "Not Found" });
  });

  return app;
}

module.exports = { create_app };
