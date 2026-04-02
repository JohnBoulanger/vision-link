"use strict";

const { z } = require("zod");

// login — email + password only
const loginSchema = z
  .object({
    email: z.string().max(255).email("invalid email format"),
    password: z.string().max(128),
  })
  .strict();

// request a password reset / activation token
const resetRequestSchema = z
  .object({
    email: z.string().max(255).email("invalid email format"),
  })
  .strict();

// use a reset token — email required, password optional (activation vs reset)
const resetUseSchema = z
  .object({
    email: z.string().max(255).email("invalid email format"),
    password: z.string().max(128).optional(),
  })
  .strict();

module.exports = { loginSchema, resetRequestSchema, resetUseSchema };
