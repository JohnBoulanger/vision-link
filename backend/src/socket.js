"use strict";

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const config = require("./config/env");

const SECRET_KEY = config.jwtSecret;

let io;
function attach_sockets(server) {
  io = new Server(server, { cors: { origin: config.frontendUrl } });

  io.on("connection", (socket) => {
    // get the jwt token provided by the client
    const token = socket.handshake.auth.token;
    // disconnect if it doesnt exist
    if (!token) {
      socket.disconnect();
      return;
    }
    // associate socket with user and join the room
    let userData;
    try {
      // verify the token and store id and role and join a room
      userData = jwt.verify(token, SECRET_KEY);
      socket.userId = userData.accountId;
      socket.role = userData.role;
      socket.join(`account:${userData.accountId}`);
    } catch (error) {
      // invalid or expired token
      socket.disconnect();
      return;
    }

    // auto-rejoin active negotiation room on reconnect (e.g. page refresh)
    prisma.negotiation
      .findFirst({
        where: {
          status: "active",
          OR: [{ userId: userData.accountId }, { businessId: userData.accountId }],
        },
      })
      .then((activeNeg) => {
        if (activeNeg) {
          socket.join(`negotiation:${activeNeg.id}`);
        }
      })
      .catch(() => {
        // non-fatal — socket still works, just won't receive room messages
      });

    // per-socket message rate limiting — 30 messages per minute
    const socketRateLimit = { count: 0, resetAt: Date.now() + 60000 };
    const SOCKET_MAX_MESSAGES = 30;

    // handle incoming negotiation message from client
    socket.on("negotiation:message", async (data) => {
      // check authentication
      if (!socket.userId) {
        socket.emit("negotiation:error", {
          error: "Not authenticated",
          message: "Socket not authenticated",
        });
        return;
      }

      // check socket rate limit
      const now = Date.now();
      if (now > socketRateLimit.resetAt) {
        socketRateLimit.count = 0;
        socketRateLimit.resetAt = now + 60000;
      }
      socketRateLimit.count++;
      if (socketRateLimit.count > SOCKET_MAX_MESSAGES) {
        socket.emit("negotiation:error", {
          error: "Rate limit exceeded",
          message: "Too many messages. Please wait before sending more.",
        });
        return;
      }

      const negotiationId = data.negotiation_id;
      const text = data.text;

      // validate message input
      if (!text || typeof text !== "string" || text.length === 0 || text.length > 2000) {
        socket.emit("negotiation:error", {
          error: "Invalid message",
          message: "Message text must be between 1 and 2000 characters",
        });
        return;
      }
      if (!negotiationId || typeof negotiationId !== "number") {
        socket.emit("negotiation:error", {
          error: "Invalid message",
          message: "A valid negotiation_id is required",
        });
        return;
      }
      // get the current negotiation
      const negotiation = await prisma.negotiation.findUnique({
        where: { id: negotiationId },
      });
      // does negotiation exist or isnt active
      if (!negotiation || negotiation.status !== "active") {
        socket.emit("negotiation:error", {
          error: "Negotiation not found",
          message: "Negotiation not found",
        });
        return;
      }
      // emit error if user not in current negotiation
      if (socket.userId !== negotiation.userId && socket.userId !== negotiation.businessId) {
        socket.emit("negotiation:error", {
          error: "Not part of this negotiation",
          message: "Not part of this negotiation",
        });
        return;
      }
      // negotiation mismatch
      const activeNegotiation = await prisma.negotiation.findFirst({
        where: {
          status: "active",
          OR: [{ userId: socket.userId }, { businessId: socket.userId }],
        },
      });
      if (!activeNegotiation || activeNegotiation.id !== negotiationId) {
        socket.emit("negotiation:error", {
          error: "Negotiation Mismatch",
          message: "User not part of this negotiation",
        });
        return;
      }

      const response = {
        negotiation_id: negotiationId,
        sender: {
          role: socket.role,
          id: socket.userId,
        },
        text: text,
        createdAt: new Date(),
      };
      io.to(`negotiation:${negotiationId}`).emit("negotiation:message", response);
    });

    // handle disconnect
    socket.on("disconnect", () => {
      console.log("disconnected:", socket.id);
    });
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = { attach_sockets, getIO };
