const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const config = require("../config/env");

const SECRET_KEY = config.jwtSecret;

const jwtAuth = (req, res, next) => {
  // extract token from request header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  // check if a token was provided
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // verify the tokens signature and expiration using the secret key
  jwt.verify(token, SECRET_KEY, async (error, userData) => {
    // verification failed
    if (error) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // find the user with associated with the token
    try {
      const user = await prisma.account.findUnique({
        where: { id: userData.accountId },
      });

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // attach the authenticated user to the associated request
      req.user = user;
      // continue processing next request
      next();
    } catch (error) {
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  // no token should continue without user
  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, SECRET_KEY, async (error, userData) => {
    // invalid token should ignore auth, continue
    if (error) {
      req.user = null;
      return next();
    }

    try {
      const user = await prisma.account.findUnique({
        where: { id: userData.accountId },
      });

      if (!user) {
        req.user = null;
        return next();
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });
};

module.exports = { jwtAuth, optionalAuth };
