"use strict";

const { z } = require("zod");

// admin: create a new position type
const createPositionTypeSchema = z
  .object({
    name: z.string().min(1, "name is required").max(200),
    description: z.string().min(1, "description is required").max(2000),
    hidden: z.union([z.boolean(), z.enum(["true", "false"])]).optional(),
  })
  .strict();

// admin: update a position type
const updatePositionTypeSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    hidden: z.union([z.boolean(), z.enum(["true", "false"])]).optional(),
  })
  .strict();

module.exports = { createPositionTypeSchema, updatePositionTypeSchema };
