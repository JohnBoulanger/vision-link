"use strict";

const { z } = require("zod");

// create a new qualification for a position type
const createQualificationSchema = z
  .object({
    position_type_id: z.union([z.number().int().positive(), z.string().regex(/^\d+$/, "must be a positive integer")]),
    note: z.string().max(1000).optional(),
  })
  .strict();

// update a qualification (admin status change or user note revision)
const updateQualificationSchema = z
  .object({
    status: z.enum(["submitted", "approved", "rejected", "revised"]).optional(),
    note: z.string().max(1000).optional(),
  })
  .strict();

module.exports = { createQualificationSchema, updateQualificationSchema };
