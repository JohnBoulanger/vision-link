const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { isValidEmail, isValidPassword, parseBoolean } = require("../helpers/validation");
const encodePassword = require("../helpers/encodePassword");
const { jobStartWindow } = require("../config/system");

class BusinessService {
  static async registerBusiness(data) {
    const { business_name, owner_name, email, password, phone_number, postal_address, location } =
      data;

    // validate inputs
    if (
      !business_name ||
      !owner_name ||
      !email ||
      !password ||
      !phone_number ||
      !postal_address ||
      !location
    ) {
      throw { type: "validation", message: "Bad Request" };
    }

    // check if lat lon in range
    if (typeof location.lat !== "number" || typeof location.lon !== "number") {
      throw { type: "validation", message: "Invalid Location" };
    }
    if (location.lat < -90 || location.lat > 90 || location.lon < -180 || location.lon > 180) {
      throw { type: "validation", message: "Invalid Location" };
    }
    if (!isValidEmail(email)) {
      throw { type: "validation", message: "Invalid Email" };
    }
    if (!isValidPassword(password)) {
      throw { type: "validation", message: "Invalid Password" };
    }

    // check if a business already exists
    const existingBusiness = await prisma.account.findUnique({ where: { email } });

    if (existingBusiness) {
      throw { type: "conflict", message: "Business Already Exists" };
    }

    const encPass = await encodePassword(password);

    // create the new account
    const account = await prisma.account.create({
      data: {
        email,
        password: encPass,
        role: "business",
        activated: false,
        business: {
          create: {
            business_name,
            owner_name,
            phone_number,
            postal_address,
            lat: location.lat,
            lon: location.lon,
          },
        },
      },
      include: { business: true },
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // create the reset token, used to prove that the business controls the email tied to this account. Used for activation
    const reset = await prisma.resetToken.create({
      data: {
        accountId: account.id,
        expiresAt,
      },
    });

    return {
      id: account.id,
      business_name: account.business.business_name,
      owner_name: account.business.owner_name,
      email: account.email,
      activated: account.activated,
      verified: account.business.verified,
      role: account.role,
      phone_number: account.business.phone_number ?? "",
      postal_address: account.business.postal_address ?? "",
      location: {
        lon: account.business.lon,
        lat: account.business.lat,
      },
      createdAt: account.createdAt,
      resetToken: reset.token,
      expiresAt: reset.expiresAt,
    };
  }

  static async verifyBusiness(data, businessId, requesterRole) {
    const business = await prisma.business.findUnique({
      where: { accountId: businessId },
    });

    if (!business) {
      throw { type: "not_found" };
    }

    if (requesterRole !== "admin") {
      throw { type: "forbidden" };
    }

    const verified = parseBoolean(data.verified);

    const updated = await prisma.business.update({
      where: { accountId: businessId },
      data: { verified },
      include: { account: true },
    });

    return {
      id: updated.accountId,
      business_name: updated.business_name,
      owner_name: updated.owner_name,
      email: updated.account.email,
      activated: updated.account.activated,
      verified: updated.verified,
      role: updated.account.role,
      phone_number: updated.phone_number,
      postal_address: updated.postal_address,
    };
  }

  static async getBusiness(businessId, requesterRole) {
    const business = await prisma.business.findUnique({
      where: { accountId: businessId },
      include: { account: true },
    });

    if (!business) {
      throw { type: "not_found" };
    }

    const response = {
      id: business.accountId,
      business_name: business.business_name,
      email: business.account.email,
      role: business.account.role,
      phone_number: business.phone_number,
      postal_address: business.postal_address,
      location: {
        lon: business.lon,
        lat: business.lat,
      },
      avatar: business.avatar,
      biography: business.biography,
    };

    if (requesterRole === "admin") {
      response.owner_name = business.owner_name;
      response.activated = business.account.activated;
      response.verified = business.verified;
      response.createdAt = business.account.createdAt;
    }

    return response;
  }

  static async getBusinesses(data, requesterRole) {
    const { keyword, sort, order } = data;
    const activated = parseBoolean(data.activated);
    const verified = parseBoolean(data.verified);
    const page = parseInt(data.page) || 1;
    const limit = parseInt(data.limit) || 10;
    const skip = (page - 1) * limit;

    // construct where clause for businesses
    // check if keyword is contained within the following fields
    const where = {};
    if (keyword) {
      where.OR = [
        { business_name: { contains: keyword } },
        { account: { email: { contains: keyword } } },
        { phone_number: { contains: keyword } },
        { postal_address: { contains: keyword } },
      ];
      if (requesterRole === "admin") {
        where.OR.push({ owner_name: { contains: keyword } });
      }
    }
    // handle admin only filters
    if (requesterRole !== "admin" && (activated !== undefined || verified !== undefined)) {
      throw { type: "validation" };
    }
    if (activated !== undefined) {
      where.account = { ...(where.account || {}), activated };
    }
    if (verified !== undefined) {
      where.verified = verified;
    }

    // validate sort and orderBy inputs
    let orderBy;

    if (sort) {
      const sortValues = ["business_name", "email"];
      if (requesterRole === "admin") sortValues.push("owner_name");

      if (!sortValues.includes(sort)) {
        throw { type: "validation" };
      }

      const orderValue = order || "asc";
      const orderValues = ["asc", "desc"];
      if (!orderValues.includes(orderValue)) {
        throw { type: "validation" };
      }

      if (sort === "email") {
        orderBy = { account: { email: orderValue } };
      } else {
        orderBy = { [sort]: orderValue };
      }
    }

    // compute filtered count of businesses
    const count = await prisma.business.count({ where });

    const businesses = await prisma.business.findMany({
      where,
      take: limit,
      skip: skip,
      include: { account: true },
      orderBy,
    });

    // construct return value
    const results = businesses.map((b) => {
      const businessObj = {
        id: b.accountId,
        business_name: b.business_name,
        email: b.account.email,
        role: b.account.role,
        phone_number: b.phone_number,
        postal_address: b.postal_address,
      };

      if (requesterRole === "admin") {
        businessObj.owner_name = b.owner_name;
        businessObj.verified = b.verified;
        businessObj.activated = b.account.activated;
      }

      return businessObj;
    });

    return {
      count,
      results,
    };
  }

  static async getMyBusiness(businessId, requesterRole) {
    // admin only
    if (requesterRole !== "business") {
      throw { type: "forbidden" };
    }

    // get authenticated business
    const business = await prisma.business.findUnique({
      where: { accountId: businessId },
      include: { account: true },
    });

    if (!business) {
      throw { type: "not_found" };
    }

    // must be a business user
    if (requesterRole !== "business") {
      throw { type: "forbidden" };
    }

    return {
      id: business.accountId,
      business_name: business.business_name,
      owner_name: business.owner_name,
      email: business.account.email,
      role: business.account.role,
      phone_number: business.phone_number ?? "",
      postal_address: business.postal_address ?? "",
      location: {
        lon: business.lon,
        lat: business.lat,
      },
      avatar: business.avatar,
      biography: business.biography,
      activated: business.account.activated,
      verified: business.verified,
      createdAt: business.account.createdAt,
    };
  }

  static async updateMyBusiness(data, businessId) {
    const { business_name, owner_name, phone_number, postal_address, location, avatar, biography } =
      data;

    if (
      !business_name &&
      !owner_name &&
      !phone_number &&
      !postal_address &&
      !location &&
      !avatar &&
      !biography
    ) {
      throw { type: "validation" };
    }

    // get authenticated business
    const business = await prisma.business.findUnique({
      where: { accountId: businessId },
      include: { account: true },
    });

    if (!business) {
      throw { type: "not_found" };
    }

    const update = {};
    const response = { id: businessId };
    if ("business_name" in data) {
      update.business_name = business_name;
      response.business_name = business_name;
    }
    if ("owner_name" in data) {
      update.owner_name = owner_name;
      response.owner_name = owner_name;
    }
    if ("phone_number" in data) {
      update.phone_number = phone_number;
      response.phone_number = phone_number;
    }
    if ("postal_address" in data) {
      update.postal_address = postal_address;
      response.postal_address = postal_address;
    }
    if ("location" in data) {
      if (!location || typeof location.lon !== "number" || typeof location.lat !== "number") {
        throw { type: "validation" };
      }

      update.lon = location.lon;
      update.lat = location.lat;

      response.location = {
        lon: location.lon,
        lat: location.lat,
      };
    }
    if ("avatar" in data) {
      update.avatar = avatar;
      response.avatar = avatar;
    }
    if ("biography" in data) {
      update.biography = biography;
      response.biography = biography;
    }

    // update the business
    await prisma.business.update({
      where: { accountId: businessId },
      data: update,
    });

    return response;
  }

  static async uploadBusinessAvatar(avatarUrl, businessId, requesterRole) {
    if (!avatarUrl) {
      throw { type: "validation" };
    }

    // must be a business user
    if (requesterRole !== "business") {
      throw { type: "forbidden" };
    }

    // get authenticated business
    const business = await prisma.business.findUnique({
      where: { accountId: businessId },
      include: { account: true },
    });

    if (!business) {
      throw { type: "not_found" };
    }

    // update the business avatar
    await prisma.business.update({
      where: { accountId: businessId },
      data: { avatar: avatarUrl },
    });

    return { avatar: avatarUrl };
  }

  static async createJob(data, businessId, requesterRole) {
    // must be a business user
    if (requesterRole !== "business") {
      throw { type: "forbidden" };
    }
    // data validation
    const now = new Date();
    const { start_time, end_time, note } = data;
    const position_type_id = parseInt(data.position_type_id);
    const salary_min = parseInt(data.salary_min);
    const salary_max = parseInt(data.salary_max);
    // type validation
    if (
      !start_time ||
      !end_time ||
      isNaN(position_type_id) ||
      isNaN(salary_min) ||
      isNaN(salary_max)
    ) {
      throw { type: "validation" };
    }
    const start = new Date(start_time);
    const end = new Date(end_time);

    // value validation
    if (
      isNaN(start.getTime()) ||
      isNaN(end.getTime()) ||
      end <= start ||
      salary_min < 0 ||
      salary_max < salary_min ||
      start < now ||
      end < now
    ) {
      throw { type: "validation" };
    }

    // start window validation
    const maxStart = new Date(now.getTime() + jobStartWindow * 24 * 60 * 60 * 1000);
    if (start > maxStart) {
      throw { type: "validation" };
    }

    // find business and position type
    const business = await prisma.business.findUnique({
      where: { accountId: businessId },
    });

    const positionType = await prisma.positionType.findUnique({
      where: { id: position_type_id },
    });

    if (!business || !positionType) {
      throw { type: "not_found" };
    }

    // not allowed to create jobs
    if (!business.verified) {
      throw { type: "forbidden" };
    }

    // link job to existing business and positionType
    const job = await prisma.job.create({
      data: {
        businessId: businessId,
        positionTypeId: position_type_id,
        salary_min,
        salary_max,
        start_time: start,
        end_time: end,
        note,
      },
      include: {
        business: true,
        positionType: true,
      },
    });

    return {
      id: job.id,
      status: job.status,
      position_type: {
        id: job.positionType.id,
        name: job.positionType.name,
      },
      business: {
        id: job.business.accountId,
        business_name: job.business.business_name,
      },
      worker: null,
      note: job.note,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      start_time: job.start_time,
      end_time: job.end_time,
      updatedAt: job.updatedAt,
    };
  }

  static async getJobs(data, businessId) {
    const { start_time, end_time, status } = data;
    const position_type_id = parseInt(data.position_type_id);
    const salary_min = parseInt(data.salary_min);
    const salary_max = parseInt(data.salary_max);
    const page = parseInt(data.page) || 1;
    const limit = parseInt(data.limit) || 10;
    const skip = (page - 1) * limit;

    // if start and end times are provided, check that they are valid
    const start = start_time ? new Date(start_time) : undefined;
    const end = end_time ? new Date(end_time) : undefined;
    if ((start && isNaN(start.getTime())) || (end && isNaN(end.getTime()))) {
      throw { type: "validation" };
    }

    // default statuses
    let statuses = ["open", "filled"];
    if (status) {
      if (Array.isArray(status)) {
        statuses = status;
      } else {
        statuses = [status];
      }
    }

    // create where clause
    const where = {
      businessId: businessId,
      status: { in: statuses },
    };
    if (!isNaN(position_type_id)) {
      where.positionTypeId = position_type_id;
    }
    if (!isNaN(salary_min)) {
      where.salary_min = { gte: salary_min };
    }
    if (!isNaN(salary_max)) {
      where.salary_max = { gte: salary_max };
    }
    if (start) {
      where.start_time = { gte: start };
    }
    if (end) {
      where.end_time = { lte: end };
    }

    const count = await prisma.job.count({ where });

    const jobs = await prisma.job.findMany({
      where,
      take: limit,
      skip,
      include: {
        positionType: true,
        worker: true,
      },
    });

    const results = jobs.map((job) => ({
      id: job.id,
      status: job.status,
      position_type: {
        id: job.positionType.id,
        name: job.positionType.name,
      },
      business_id: businessId,
      worker: job.worker
        ? {
            id: job.worker.accountId,
            first_name: job.worker.first_name,
            last_name: job.worker.last_name,
          }
        : null,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      start_time: job.start_time,
      end_time: job.end_time,
      updatedAt: job.updatedAt,
    }));

    return {
      count,
      results,
    };
  }

  static async updateJob(data, businessId, jobId, requesterRole) {
    // must be a business user
    if (requesterRole !== "business") {
      throw { type: "forbidden" };
    }

    const now = new Date();
    const { start_time, end_time, note } = data;
    const salary_min = parseInt(data.salary_min);
    const salary_max = parseInt(data.salary_max);

    // if start and end times are provided, check that they are valid
    const start = start_time ? new Date(start_time) : undefined;
    const end = end_time ? new Date(end_time) : undefined;
    if ((start && isNaN(start.getTime())) || (end && isNaN(end.getTime()))) {
      throw { type: "validation" };
    }
    if (start < now || end < now) {
      throw { type: "validation" };
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    // check if job exists and is open and available and belongs to the business
    if (!job || job.businessId !== businessId) {
      throw { type: "not_found" };
    }
    if (job.status !== "open") {
      throw { type: "conflict" };
    }
    // validate salary values
    if (!isNaN(salary_min) && salary_min < 0) {
      throw { type: "validation" };
    }
    if (!isNaN(salary_max) && !isNaN(salary_min) && salary_max < salary_min) {
      throw { type: "validation" };
    }
    // validate time values
    if (start && end && end <= start) {
      throw { type: "validation" };
    }

    // build update
    const update = {};
    const response = {};

    if ("salary_min" in data) {
      update.salary_min = salary_min;
      response.salary_min = salary_min;
    }
    if ("salary_max" in data) {
      update.salary_max = salary_max;
      response.salary_max = salary_max;
    }
    if ("start_time" in data) {
      update.start_time = start;
      response.start_time = start;
    }
    if ("end_time" in data) {
      update.end_time = end;
      response.end_time = end;
    }
    if ("note" in data) {
      update.note = note;
      response.note = note;
    }

    const updated = await prisma.job.update({
      where: { id: jobId },
      data: update,
    });

    // format response
    response.id = updated.id;
    response.updatedAt = updated.updatedAt;

    return response;
  }

  static async deleteJob(businessId, jobId, requesterRole) {
    // must be a business user
    if (requesterRole !== "business") {
      throw { type: "forbidden" };
    }
    // find matching job
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    // count number of active negotiations
    const countNegotiations = await prisma.negotiation.count({
      where: {
        jobId,
      },
    });

    // check if job exists and is open and available and belongs to the business
    if (!job || job.businessId !== businessId) {
      throw { type: "not_found" };
    }
    if ((job.status !== "open" && job.status !== "expired") || countNegotiations > 0) {
      throw { type: "conflict" };
    }

    await prisma.job.delete({
      where: { id: jobId },
    });
  }
}

module.exports = { BusinessService };
