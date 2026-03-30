const { PrismaClient } = require("@prisma/client");
const { negotiationWindow } = require("../config/system");
const { getIO } = require("../socket");
const prisma = new PrismaClient();

class NegotiationService {
  static async createNegotiation(data, user) {
    const interest_id = parseInt(data.interest_id);
    if (isNaN(interest_id)) {
      throw { type: "validation" };
    }

    // check if we have an existing negotiation under this id
    const existingNegotiation = await prisma.negotiation.findFirst({
      where: {
        interestId: interest_id,
        status: "active",
      },
    });

    // exit early and return the existing negotiation if we already have one
    if (existingNegotiation) {
      return {
        created: false,
        negotiation: existingNegotiation,
      };
    }

    // get interest between business and user
    const interest = await prisma.interest.findUnique({
      where: { id: interest_id },
      include: {
        user: {
          include: {
            account: true,
            jobs: true,
            negotiations: true,
          },
        },
        job: {
          include: {
            business: {
              include: { negotiations: true },
            },
            positionType: true,
          },
        },
      },
    });
    if (!interest) {
      throw { type: "not_found" };
    }

    // validate the interest exists and is associated with the authenticated user // todo
    if (user.role === "regular" && interest.userId !== user.id) {
      throw { type: "not_found" };
    }
    if (user.role === "business" && interest.job.businessId !== user.id) {
      throw { type: "not_found" };
    }

    // ensure mutual interest
    if (!(interest.businessInterested && interest.userInterested)) {
      throw { type: "forbidden" };
    }
    // check if user is discoverable
    const now = new Date();
    const conflict = interest.user.jobs.some(
      (j) =>
        j.status === "filled" &&
        j.start_time < interest.job.end_time &&
        j.end_time > interest.job.start_time
    );
    if (conflict && !(interest.job.workerId === interest.userId && now < interest.job.end_time)) {
      throw { type: "forbidden" };
    }

    // handle party is in active negotiation or job in state where negotiation cant be started
    const userActive = interest.user.negotiations.some((n) => n.status === "active");
    const businessActive = interest.job.business.negotiations.some((n) => n.status === "active");
    if (userActive || businessActive) {
      throw { type: "conflict" };
    }
    if (interest.job.status !== "open") {
      throw { type: "conflict" };
    }

    // calculate negotiation expiry window
    const expiresAt = new Date(now.getTime() + negotiationWindow);

    // create negotiation
    const negotiation = await prisma.negotiation.create({
      data: {
        jobId: interest.job.id,
        userId: interest.userId,
        businessId: interest.job.businessId,
        interestId: interest_id,
        status: "active",
        expiresAt: expiresAt,
        candidateDecision: null,
        businessDecision: null,
      },
    });

    // send messages to clients
    try {
      io = getIO();
    } catch (e) {
      io = null;
    }
    if (io) {
      const message = {
        negotiation_id: negotiation.id,
      };
      // emit a negotiation started message to the user and business
      io.in(`account:${interest.userId}`).emit("negotiation:started", message);
      io.in(`account:${interest.job.businessId}`).emit("negotiation:started", message);
      // move both user and business into the negotiation room
      io.in(`account:${interest.userId}`).socketsJoin(`negotiation:${negotiation.id}`);
      io.in(`account:${interest.job.businessId}`).socketsJoin(`negotiation:${negotiation.id}`);
    }
    // return formatted response
    return {
      created: true,
      negotiation: {
        id: negotiation.id,
        status: negotiation.status,
        createdAt: negotiation.createdAt,
        updatedAt: negotiation.updatedAt,
        expiresAt: negotiation.expiresAt,
        job: {
          id: interest.job.id,
          status: interest.job.status,
          position_type: {
            id: interest.job.positionType.id,
            name: interest.job.positionType.name,
          },
          business: {
            id: interest.job.businessId,
            business_name: interest.job.business.business_name,
          },
          salary_min: interest.job.salary_min,
          salary_max: interest.job.salary_max,
          start_time: interest.job.start_time,
          end_time: interest.job.end_time,
        },
        user: {
          id: interest.userId,
          first_name: interest.user.first_name,
          last_name: interest.user.last_name,
        },
        decisions: {
          candidate: null,
          business: null,
        },
      },
    };
  }

  static async getNegotiations(user) {
    // find the active negotiation involving this user
    const negotiation = await prisma.negotiation.findFirst({
      where: {
        status: "active",
        OR: [{ userId: user.id }, { businessId: user.id }],
      },
      include: {
        user: true,
        job: {
          include: {
            business: true,
            positionType: true,
          },
        },
      },
    });

    // user is not involved in an active negotiation
    if (!negotiation) {
      throw { type: "not_found" };
    }

    // construct response
    return {
      id: negotiation.id,
      status: negotiation.status,
      createdAt: negotiation.createdAt,
      expiresAt: negotiation.expiresAt,
      updatedAt: negotiation.updatedAt,
      job: {
        id: negotiation.job.id,
        status: negotiation.job.status,
        position_type: {
          id: negotiation.job.positionType.id,
          name: negotiation.job.positionType.name,
        },
        business: {
          id: negotiation.job.businessId,
          business_name: negotiation.job.business.business_name,
        },
        salary_min: negotiation.job.salary_min,
        salary_max: negotiation.job.salary_max,
        start_time: negotiation.job.start_time,
        end_time: negotiation.job.end_time,
        updatedAt: negotiation.job.updatedAt,
      },
      user: {
        id: negotiation.userId,
        first_name: negotiation.user.first_name,
        last_name: negotiation.user.last_name,
      },
      decisions: {
        candidate: negotiation.candidateDecision,
        business: negotiation.businessDecision,
      },
    };
  }

  static async setDecision(data, user) {
    const negotiation_id = parseInt(data.negotiation_id);
    const decision = data.decision;

    // validate input
    if (isNaN(negotiation_id) || !["accept", "decline"].includes(decision)) {
      throw { type: "validation" };
    }

    // find the negotiation
    const negotiation = await prisma.negotiation.findUnique({
      where: { id: negotiation_id },
      include: {
        job: true,
        interest: true,
      },
    });

    // negotiation not found or user not involved
    if (!negotiation || (negotiation.userId !== user.id && negotiation.businessId !== user.id)) {
      throw { type: "not_found" };
    }

    // negotiation must be active
    const now = new Date();
    if (negotiation.status !== "active" || now >= negotiation.expiresAt) {
      throw { type: "conflict" };
    }

    // ensure negotiation id matches the user's active negotiation
    if (negotiation.id !== negotiation_id) {
      throw { type: "conflict" };
    }
    // update the decision depending on who made it
    let updatedNegotiation;

    if (negotiation.userId === user.id) {
      updatedNegotiation = await prisma.negotiation.update({
        where: { id: negotiation_id },
        data: { candidateDecision: decision },
      });
    } else {
      updatedNegotiation = await prisma.negotiation.update({
        where: { id: negotiation_id },
        data: { businessDecision: decision },
      });
    }

    // refresh negotiation after decision
    const refreshed = await prisma.negotiation.findUnique({
      where: { id: negotiation_id },
    });

    // if either party declines, negotiation fails
    if (refreshed.candidateDecision === "decline" || refreshed.businessDecision === "decline") {
      await prisma.negotiation.update({
        where: { id: negotiation_id },
        data: { status: "failed" },
      });

      // reset interests
      await prisma.interest.update({
        where: {
          jobId_userId: {
            jobId: refreshed.jobId,
            userId: refreshed.userId,
          },
        },
        data: {
          userInterested: null,
          businessInterested: null,
        },
      });
    }

    // if both accept, negotiation succeeds
    if (refreshed.candidateDecision === "accept" && refreshed.businessDecision === "accept") {
      await prisma.negotiation.update({
        where: { id: negotiation_id },
        data: { status: "success" },
      });

      // mark job as filled
      await prisma.job.update({
        where: { id: refreshed.jobId },
        data: {
          status: "filled",
          workerId: refreshed.userId,
        },
      });
    }

    // return updated decision state
    const finalNegotiation = await prisma.negotiation.findUnique({
      where: { id: negotiation_id },
    });

    const result = {
      id: finalNegotiation.id,
      status: finalNegotiation.status,
      createdAt: finalNegotiation.createdAt,
      expiresAt: finalNegotiation.expiresAt,
      updatedAt: finalNegotiation.updatedAt,
      decisions: {
        candidate: finalNegotiation.candidateDecision,
        business: finalNegotiation.businessDecision,
      },
    };

    // notify both parties in the negotiation room so they see the decision immediately
    let io;
    try {
      io = getIO();
    } catch (e) {
      io = null;
    }
    if (io) {
      io.to(`negotiation:${negotiation_id}`).emit("negotiation:updated", result);
    }

    return result;
  }
}

module.exports = { NegotiationService };
