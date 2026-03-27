"use strict";

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const SECRET_KEY = process.env.JWT_SECRET || "test_secret";

let io;
function attach_sockets(server) {
  io = new Server(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    // get the jwt token provided by the client
    const token = socket.handshake.auth.token;
    // disconnect if it doesnt exist
    if (!token) {
      socket.disconnect();
      return;
    }
    // associate socket with user and join the room
    try {
      // verify the token and store id and role and join a room
      const userData = jwt.verify(token, SECRET_KEY);
      socket.userId = userData.accountId;
      socket.role = userData.role;
      socket.join(`account:${userData.accountId}`);
    } catch (error) {
      // invalid or expired token
      socket.disconnect();
      return;
    }

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
      const negotiationId = data.negotiation_id;
      const text = data.text;
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
