const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class QualificationService {
  static async createQualification(data, userId, requesterRole) {
    const { position_type_id, note } = data;

    // admin or regular only
    if (requesterRole === "business") {
      throw { type: "forbidden" };
    }

    // validate that a position type id was provided
    if (!position_type_id) {
      throw { type: "validation" };
    }

    // find the non hidden position type and user
    const positionType = await prisma.positionType.findFirst({
      where: {
        id: position_type_id,
        hidden: false,
      },
    });
    const user = await prisma.regularUser.findUnique({
      where: { accountId: userId },
    });

    if (!positionType || !user) {
      throw { type: "not_found" };
    }

    // create the qualification
    // handle error if qualification already exists
    let qualification;
    try {
      qualification = await prisma.qualification.create({
        data: {
          userId: user.accountId,
          positionTypeId: positionType.id,
          status: "created",
          note: note || "",
        },
      });
    } catch (e) {
      if (e.code === "P2002") {
        throw { type: "conflict" };
      }
      throw e;
    }

    // format response
    return {
      id: qualification.id,
      status: qualification.status,
      note: qualification.note,
      document: qualification.document,
      user: {
        id: user.accountId,
        first_name: user.first_name,
        last_name: user.last_name,
      },
      position_type: {
        id: positionType.id,
        name: positionType.name,
      },
      updatedAt: qualification.updatedAt,
    };
  }

  static async getQualifications(data, requesterRole) {
    const { keyword } = data;
    const page = parseInt(data.page) || 1;
    const limit = parseInt(data.limit) || 10;
    const skip = (page - 1) * limit;

    // admin only
    if (requesterRole !== "admin") {
      throw { type: "forbidden" };
    }

    const where = {};

    // construct where clause for qualifications
    // check if keyword is contained within the following fields
    if (keyword) {
      where.user = {
        OR: [
          { first_name: { contains: keyword } },
          { last_name: { contains: keyword } },
          { account: { email: { contains: keyword } } },
          { phone_number: { contains: keyword } },
        ],
      };
    }

    // collect all qualifications
    const count = await prisma.qualification.count({ where });
    const qualifications = await prisma.qualification.findMany({
      where,
      take: limit,
      skip: skip,
      include: {
        user: true,
        position: true,
      },
    });

    // construct response
    const results = qualifications.map((q) => ({
      id: q.id,
      status: q.status,
      user: {
        id: q.user.accountId,
        first_name: q.user.first_name,
        last_name: q.user.last_name,
      },
      position_type: {
        id: q.position.id,
        name: q.position.name,
      },
      updatedAt: q.updatedAt,
    }));

    return {
      count,
      results,
    };
  }

  static async getQualification(qualificationId, requester) {
    // find the unique qualification
    const qualification = await prisma.qualification.findUnique({
      where: { id: qualificationId },
      include: {
        user: {
          include: {
            account: true,
          },
        },
        position: true,
      },
    });

    if (!qualification) {
      throw { type: "not_found" };
    }

    // regular users can only view their own
    if (requester.role === "regular" && qualification.user.accountId !== requester.id) {
      throw { type: "not_found" };
    }

    // businesses can only see approved qualifications
    if (requester.role === "business") {
      if (qualification.status !== "approved") {
        throw { type: "forbidden" };
      }

      // check interest between business and this user for same position type
      const interest = await prisma.interest.findFirst({
        where: {
          userId: qualification.user.accountId,
          job: {
            businessId: requester.id,
            positionTypeId: qualification.positionTypeId,
          },
        },
      });

      // no interest
      if (!interest) {
        throw { type: "forbidden" };
      }

      // must have interest from candidate
      if (interest.userInterested !== true) {
        throw { type: "forbidden" };
      }
    }

    // construct response
    const response = {
      id: qualification.id,
      document: qualification.document,
      note: qualification.note,
      position_type: {
        id: qualification.position.id,
        name: qualification.position.name,
        description: qualification.position.description,
      },
      updatedAt: qualification.updatedAt,
      user: {
        id: qualification.user.accountId,
        first_name: qualification.user.first_name,
        last_name: qualification.user.last_name,
        role: qualification.user.account.role,
        avatar: qualification.user.avatar,
        resume: qualification.user.resume,
        biography: qualification.user.biography,
      },
    };

    // only admin/regular can see sensitive fields
    if (requester.role !== "business") {
      response.user.email = qualification.user.account.email;
      response.user.phone_number = qualification.user.phone_number;
      response.user.postal_address = qualification.user.postal_address;
      response.user.birthday = qualification.user.birthday;
      response.user.activated = qualification.user.account.activated;
      response.user.suspended = qualification.user.suspended;
      response.user.createdAt = qualification.user.account.createdAt;
      response.status = qualification.status;
    }

    return response;
  }

  static async updateQualification(data, qualificationId, requester) {
    const { status, note } = data;

    // get unique qualification
    const qualification = await prisma.qualification.findUnique({
      where: { id: qualificationId },
      include: {
        user: true,
        position: true,
      },
    });

    if (!qualification) {
      throw { type: "not_found" };
    }

    // regular or admin only
    if (requester.role === "business") {
      throw { type: "forbidden" };
    }

    // regular users cannot update other user's qualification
    if (requester.role === "regular" && qualification.user.accountId !== requester.id) {
      throw { type: "forbidden" };
    }

    let newStatus = qualification.status;

    // verify correct status transition depending on the role of the user
    if (status) {
      // admin rules
      if (requester.role === "admin") {
        if (
          !["submitted", "revised"].includes(qualification.status) ||
          !["approved", "rejected"].includes(status)
        ) {
          throw { type: "forbidden", message: "Invalid status transition" };
        }
        newStatus = status;
      }

      // regular rules
      else if (requester.role === "regular") {
        const validTransition =
          (qualification.status === "created" && status === "submitted") ||
          (["approved", "rejected"].includes(qualification.status) && status === "revised");

        if (!validTransition) {
          throw { type: "forbidden", message: "Invalid status transition" };
        }

        newStatus = status;
      }
    }

    // update the qualification and updatedAt field
    const updated = await prisma.qualification.update({
      where: { id: qualificationId },
      data: {
        status: newStatus,
        note: note ?? qualification.note,
        updatedAt: new Date(),
      },
      include: {
        user: true,
        position: true,
      },
    });

    // format response
    return {
      id: updated.id,
      status: updated.status,
      document: updated.document,
      note: updated.note,
      user: {
        id: updated.user.accountId,
        first_name: updated.user.first_name,
        last_name: updated.user.last_name,
      },
      position_type: {
        id: updated.position.id,
        name: updated.position.name,
      },
      updatedAt: updated.updatedAt,
    };
  }

  static async uploadQualificationDocument(documentUrl, qualificationId, userId) {
    if (!documentUrl) {
      throw { type: "validation", message: "required" };
    }

    // find qualification
    const qualification = await prisma.qualification.findUnique({
      where: { id: qualificationId },
      include: { user: true },
    });

    if (!qualification) {
      throw { type: "not_found" };
    }

    // check that it matches the authenticated user
    if (qualification.user.accountId !== userId) {
      throw { type: "forbidden" };
    }

    // update document
    await prisma.qualification.update({
      where: { id: qualificationId },
      data: { document: documentUrl },
    });

    // return new document url
    return { document: documentUrl };
  }
}

module.exports = { QualificationService };
