"use strict";

const { z } = require("zod");

// body schema for interest / invitation endpoints
const interestBodySchema = z
  .object({
    interested: z.union([z.boolean(), z.enum(["true", "false"])]),
  })
  .strict();

module.exports = { interestBodySchema };
