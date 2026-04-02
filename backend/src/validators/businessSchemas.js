"use strict";

const { z } = require("zod");

// reusable location sub-schema
const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

// register a new business
const registerBusinessSchema = z
  .object({
    business_name: z.string().min(1, "business name is required").max(200),
    owner_name: z.string().min(1, "owner name is required").max(100),
    email: z.string().max(255).email("invalid email format"),
    password: z.string().max(128),
    phone_number: z.string().min(1, "phone number is required").max(20),
    postal_address: z.string().min(1, "postal address is required").max(500),
    location: locationSchema,
  })
  .strict();

// update own business profile
const updateBusinessSchema = z
  .object({
    business_name: z.string().min(1).max(200).optional(),
    owner_name: z.string().min(1).max(100).optional(),
    phone_number: z.string().max(20).optional(),
    postal_address: z.string().max(500).optional(),
    location: locationSchema.optional(),
    avatar: z.string().max(500).optional(),
    biography: z.string().max(2000).optional(),
  })
  .strict();

// admin: verify / unverify a business
const verifyBusinessSchema = z
  .object({
    verified: z.union([z.boolean(), z.enum(["true", "false"])]),
  })
  .strict();

// create a new job posting — allows string or number for numeric fields
// because frontend may send either
const createJobSchema = z
  .object({
    position_type_id: z.union([z.number().int().positive(), z.string().regex(/^\d+$/, "must be a positive integer")]),
    salary_min: z.union([z.number().min(0), z.string().regex(/^\d+(\.\d+)?$/, "must be a non-negative number")]),
    salary_max: z.union([z.number().min(0), z.string().regex(/^\d+(\.\d+)?$/, "must be a non-negative number")]),
    start_time: z.string().max(50),
    end_time: z.string().max(50),
    note: z.string().max(1000).optional(),
  })
  .strict();

// update an existing job posting
const updateJobSchema = z
  .object({
    salary_min: z.union([z.number().min(0), z.string().regex(/^\d+(\.\d+)?$/)]).optional(),
    salary_max: z.union([z.number().min(0), z.string().regex(/^\d+(\.\d+)?$/)]).optional(),
    start_time: z.string().max(50).optional(),
    end_time: z.string().max(50).optional(),
    note: z.string().max(1000).optional(),
  })
  .strict();

module.exports = {
  registerBusinessSchema,
  updateBusinessSchema,
  verifyBusinessSchema,
  createJobSchema,
  updateJobSchema,
};
