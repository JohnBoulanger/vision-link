const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { isValidPassword } = require("../helpers/validation");
const encodePassword = require("../helpers/encodePassword");
const prisma = new PrismaClient();
const system = require("../config/system");

const resetRequests = {};

class AuthService {
  static async authenticateAccount(email, password) {
    // find existing account
    const account = await prisma.account.findUnique({
      where: {
        email: email,
      },
    });

    // account not authorized or not activated yet
    if (!account) {
      throw { type: "unauthorized" };
    }

    if (!account.activated) {
      throw { type: "forbidden" };
    }

    const match = await bcrypt.compare(password, account.password);

    if (!match) {
      throw { type: "unauthorized" };
    }

    // generate jwt for the account (payload, secret, options)
    const token = jwt.sign(
      {
        accountId: account.id,
        role: account.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 1);

    return { token: token, expiresAt: expiryDate };
  }

  static async createResetToken(email, ip) {
    // handle rate limit
    const now = Date.now();

    if (resetRequests[ip]) {
      const diff = (now - resetRequests[ip]) / 1000;

      if (diff < system.resetCooldown) {
        throw { type: "rate_limit" };
      }
    }

    // find account associated with email
    const account = await prisma.account.findUnique({
      where: { email },
    });

    if (!account) {
      throw { type: "not_found" };
    }

    // create reset token that expires in 7 days
    // todo: rate limiting with reset cooldown
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const reset = await prisma.resetToken.create({
      data: {
        accountId: account.id,
        expiresAt,
      },
    });

    resetRequests[ip] = now;

    return {
      expiresAt,
      resetToken: reset.token,
    };
  }

  static async useResetToken(email, password, resetToken) {
    const reset = await prisma.resetToken.findUnique({
      where: { token: resetToken },
      include: { account: true },
    });

    // check if account exists, token matches, and token not expired
    if (!reset || reset.account.email !== email) {
      throw { type: "unauthorized" };
    }
    if (reset.used) {
      throw { type: "not_found" };
    }
    if (reset.expiresAt < new Date()) {
      throw { type: "gone" };
    }

    // if password is specified, reset the password
    let newPassword = reset.account.password;
    if (password) {
      if (!isValidPassword(password)) {
        throw { type: "validation" };
      }
      newPassword = await encodePassword(password);
    }

    const updated = await prisma.account.update({
      where: { id: reset.account.id },
      data: {
        activated: true,
        password: newPassword,
      },
    });

    await prisma.resetToken.update({
      where: { token: resetToken },
      data: { used: true },
    });

    // include reset cooldown
    return {
      ...updated,
      reset_cooldown: system.resetCooldown,
    };
  }
}

module.exports = { AuthService };
