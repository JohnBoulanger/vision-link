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

function create_app() {
  const app = express();

  app.use(express.json());
  app.use("/auth", authRoutes);
  app.use("/users", userRoutes);
  app.use("/businesses", businessRoutes);
  app.use("/position-types", positionTypeRoutes);
  app.use("/jobs", jobRoutes);
  app.use("/qualifications", qualificationRoutes);
  app.use("/system", systemsRoutes);
  app.use("/negotiations", negotiationRoutes);

  // route has no matches
  app.use((req, res) => {
    res.status(404).json({ error: "Not Found" });
  });

  return app;
}

module.exports = { create_app };
