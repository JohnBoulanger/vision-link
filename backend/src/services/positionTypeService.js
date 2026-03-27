const { PrismaClient } = require("@prisma/client");
const { parseBoolean } = require("../helpers/validation");
const prisma = new PrismaClient();

class PositionTypeService {
  static async createPositionType(data, requesterRole) {
    const { name, description } = data;

    if (!name || !description) {
      throw { type: "validation" };
    }

    if (requesterRole !== "admin") {
      throw { type: "forbidden" };
    }

    let hidden;
    if (data.hidden === undefined) {
      hidden = true;
    } else if (typeof data.hidden === "boolean") {
      hidden = data.hidden;
    } else {
      hidden = parseBoolean(data.hidden);
    }

    const positionType = await prisma.positionType.create({
      data: {
        name,
        description,
        hidden,
      },
    });

    const num_qualified = await prisma.qualification.count({
      where: {
        positionTypeId: positionType.id,
        status: "approved",
      },
    });

    return {
      id: positionType.id,
      name: positionType.name,
      description: positionType.description,
      hidden: positionType.hidden,
      num_qualified,
    };
  }

  static async getPositionTypes(data, requesterRole) {
    const { keyword, name, num_qualified } = data;

    const hidden = parseBoolean(data.hidden);

    const page = parseInt(data.page) || 1;
    const limit = parseInt(data.limit) || 10;
    const skip = (page - 1) * limit;

    // construct where clause for position types
    // check if keyword is contained within the following fields
    const where = {};
    if (keyword) {
      where.OR = [{ name: { contains: keyword } }, { description: { contains: keyword } }];
    }

    // handle admin only filters
    if (requesterRole !== "admin" && hidden !== undefined) {
      throw { type: "validation" };
    }

    // non-admins should never see hidden position types
    if (requesterRole !== "admin") {
      where.hidden = false;
    } else if (hidden !== undefined) {
      where.hidden = hidden;
    }

    // validate sorting inputs
    const orderValues = ["asc", "desc"];
    let orderBy = [];

    // name sorting
    const nameOrder = name || "asc";
    if (!orderValues.includes(nameOrder)) {
      throw { type: "validation" };
    }
    orderBy.push({ name: nameOrder });

    // admin only sort by num_qualified
    if (num_qualified !== undefined) {
      if (requesterRole !== "admin" || !orderValues.includes(num_qualified)) {
        throw { type: "validation" };
      }
    }

    // compute filtered count of position types and get list
    const count = await prisma.positionType.count({ where });

    const positionTypes = await prisma.positionType.findMany({
      where,
      take: limit,
      skip: skip,
      orderBy: orderBy.length ? orderBy : undefined,
    });

    // build return object
    const results = [];

    for (const p of positionTypes) {
      const positionTypeObj = {
        id: p.id,
        name: p.name,
        description: p.description,
      };

      if (requesterRole === "admin") {
        const numQualified = await prisma.qualification.count({
          where: {
            positionTypeId: p.id,
            status: "approved",
          },
        });
        positionTypeObj.hidden = p.hidden;
        positionTypeObj.num_qualified = numQualified;
      }

      results.push(positionTypeObj);
    }

    // sort by num_qualified if requested
    if (requesterRole === "admin" && num_qualified !== undefined) {
      results.sort((a, b) =>
        num_qualified === "asc"
          ? a.num_qualified - b.num_qualified
          : b.num_qualified - a.num_qualified
      );
    }

    return {
      count,
      results,
    };
  }

  static async updatePositionType(data, positionTypeId, requesterRole) {
    const { name, description } = data;
    const hidden = parseBoolean(data.hidden);

    if (requesterRole !== "admin") {
      throw { type: "forbidden" };
    }

    // find position type associated with id
    const positionType = await prisma.positionType.findUnique({
      where: { id: positionTypeId },
    });

    if (!positionType) {
      throw { type: "not_found" };
    }

    // construct update body
    const updateValues = {};
    if (name !== undefined) updateValues.name = name;
    if (description !== undefined) updateValues.description = description;
    if (hidden !== undefined) updateValues.hidden = hidden;

    const updated = await prisma.positionType.update({
      where: { id: positionTypeId },
      data: updateValues,
    });

    // return fields that were updated
    return {
      id: updated.id,
      ...updateValues,
    };
  }

  static async deletePositionType(positionTypeId, requesterRole) {
    if (requesterRole !== "admin") {
      throw { type: "forbidden" };
    }

    // find position type associated with id
    const positionType = await prisma.positionType.findUnique({
      where: { id: positionTypeId },
    });

    if (!positionType) {
      throw { type: "not_found" };
    }

    // check qualifications
    const qualificationCount = await prisma.qualification.count({
      where: { positionTypeId },
    });

    if (qualificationCount > 0) {
      throw { type: "conflict" };
    }

    // check jobs
    const jobCount = await prisma.job.count({
      where: { positionTypeId },
    });

    if (jobCount > 0) {
      throw { type: "conflict" };
    }

    await prisma.positionType.delete({
      where: { id: positionTypeId },
    });
  }
}

module.exports = { PositionTypeService };
