"use strict";

const { z } = require("zod");

// register a new regular user
const registerUserSchema = z
  .object({
    first_name: z.string().min(1, "first name is required").max(100),
    last_name: z.string().min(1, "last name is required").max(100),
    email: z.string().max(255).email("invalid email format"),
    password: z.string().max(128),
    phone_number: z.string().max(20).optional(),
    postal_address: z.string().max(500).optional(),
    birthday: z.string().max(20).optional(),
  })
  .strict();

// update own profile
const updateUserSchema = z
  .object({
    first_name: z.string().min(1).max(100).optional(),
    last_name: z.string().min(1).max(100).optional(),
    phone_number: z.string().max(20).optional(),
    postal_address: z.string().max(500).optional(),
    birthday: z.string().max(20).optional(),
    avatar: z.string().max(500).optional(),
    biography: z.string().max(2000).optional(),
  })
  .strict();

// admin: suspend / unsuspend a user
const updateSuspendSchema = z
  .object({
    suspended: z.union([z.boolean(), z.enum(["true", "false"])]),
  })
  .strict();

// toggle availability
const updateAvailabilitySchema = z
  .object({
    available: z.union([z.boolean(), z.enum(["true", "false"])]),
  })
  .strict();

module.exports = {
  registerUserSchema,
  updateUserSchema,
  updateSuspendSchema,
  updateAvailabilitySchema,
};
