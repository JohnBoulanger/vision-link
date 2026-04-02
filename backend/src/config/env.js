"use strict";

const crypto = require("crypto");
require("dotenv").config();

// validate and return a required environment variable
function requireEnv(name) {
  const value = process.env[name];
  if (value) return value;

  // in development, generate a random secret and warn
  if (process.env.NODE_ENV === "development" && name === "JWT_SECRET") {
    const generated = crypto.randomBytes(32).toString("hex");
    console.warn(`warning: ${name} not set — generated a random development secret`);
    return generated;
  }

  throw new Error(`required environment variable ${name} is not set`);
}

const config = Object.freeze({
  jwtSecret: requireEnv("JWT_SECRET"),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  nodeEnv: process.env.NODE_ENV || "development",
});

module.exports = config;
