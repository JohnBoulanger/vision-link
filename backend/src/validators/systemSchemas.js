"use strict";

const { z } = require("zod");

// admin: update reset cooldown (seconds)
const resetCooldownSchema = z
  .object({
    reset_cooldown: z.union([z.number().int().min(0), z.string().regex(/^\d+$/, "must be a non-negative integer")]),
  })
  .strict();

// admin: update negotiation window (milliseconds)
const negotiationWindowSchema = z
  .object({
    negotiation_window: z.union([
      z.number().int().positive(),
      z.string().regex(/^\d+$/, "must be a positive integer"),
    ]),
  })
  .strict();

// admin: update job start window (days)
const jobStartWindowSchema = z
  .object({
    job_start_window: z.union([
      z.number().int().positive(),
      z.string().regex(/^\d+$/, "must be a positive integer"),
    ]),
  })
  .strict();

// admin: update availability timeout (seconds)
const availabilityTimeoutSchema = z
  .object({
    availability_timeout: z.union([
      z.number().int().positive(),
      z.string().regex(/^\d+$/, "must be a positive integer"),
    ]),
  })
  .strict();

module.exports = {
  resetCooldownSchema,
  negotiationWindowSchema,
  jobStartWindowSchema,
  availabilityTimeoutSchema,
};
