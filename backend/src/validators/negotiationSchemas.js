"use strict";

const { z } = require("zod");

// start a negotiation from a mutual interest
const createNegotiationSchema = z
  .object({
    interest_id: z.union([z.number().int().positive(), z.string().regex(/^\d+$/, "must be a positive integer")]),
  })
  .strict();

// accept or decline the active negotiation
const decisionSchema = z
  .object({
    negotiation_id: z.union([z.number().int().positive(), z.string().regex(/^\d+$/, "must be a positive integer")]),
    decision: z.enum(["accept", "decline"]),
  })
  .strict();

module.exports = { createNegotiationSchema, decisionSchema };
