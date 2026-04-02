"use strict";

const { ZodError } = require("zod");

// validate request data against a zod schema
// source can be "body", "query", or "params"
function validate(schema, source = "body") {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      // replace with parsed/stripped data
      req[source] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map((e) => e.message);
        return res.status(400).json({
          error: "Validation failed",
          details: messages,
        });
      }
      next(error);
    }
  };
}

module.exports = { validate };
