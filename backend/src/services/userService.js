const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { isValidEmail, isValidPassword, parseBoolean } = require("../helpers/validation");
const encodePassword = require("../helpers/encodePassword");
const system = require("../config/system");

class UserService {
  static async registerUser(data) {
    const { first_name, last_name, email, password, phone_number, postal_address, birthday } = data;

    // validate inputs
    if (!first_name || !last_name || !email || !password) {
      throw { type: "validation", message: "Bad Request" };
    }

    if (!isValidEmail(email)) {
      throw { type: "validation", message: "Invalid Email" };
    }

    if (!isValidPassword(password)) {
      throw { type: "validation", message: "Invalid Password" };
    }

    let parsedBirthday;
    if (birthday !== undefined) {
      // must be string in YYYY-MM-DD format
      if (typeof birthday !== "string") {
        throw { type: "validation" };
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

      if (!dateRegex.test(birthday)) {
        throw { type: "validation" };
      }

      parsedBirthday = new Date(birthday);

      if (isNaN(parsedBirthday.getTime())) {
        throw { type: "validation" };
      }
    }

    // check if a user already exists
    const existingUser = await prisma.account.findUnique({ where: { email } });

    if (existingUser) {
      throw { type: "conflict", message: "User Already Exists" };
    }

    const encPass = await encodePassword(password);

    // create the new account
    const account = await prisma.account.create({
      data: {
        email,
        password: encPass,
        role: "regular",
        activated: false,
        user: {
          create: {
            first_name,
            last_name,
            phone_number,
            postal_address,
            birthday: parsedBirthday ?? new Date("1970-01-01"),
          },
        },
      },
      include: { user: true },
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // create the reset token, used to prove that the user controls the email tied to this account. Used for activation
    const reset = await prisma.resetToken.create({
      data: {
        accountId: account.id,
        expiresAt,
      },
    });

    return {
      id: account.id,
      first_name: account.user.first_name,
      last_name: account.user.last_name,
      email: account.email,
      activated: account.activated,
      role: account.role,
      phone_number: account.user.phone_number ?? "",
      postal_address: account.user.postal_address ?? "",
      birthday: account.user.birthday,
      createdAt: account.createdAt,
      resetToken: reset.token,
      expiresAt: reset.expiresAt,
    };
  }

  static async getUser(userId) {
    const now = Date.now();
    // get authenticated user
    const user = await prisma.regularUser.findUnique({
      where: { accountId: userId },
      include: { account: true },
    });

    if (!user) {
      throw { type: "not_found" };
    }

    // check activity status
    let available = false;
    if (user.available && user.lastActiveAt) {
      const lastActive = new Date(user.lastActiveAt).getTime();
      const elapsedSeconds = (now - lastActive) / 1000;
      available = elapsedSeconds <= system.availabilityTimeout;
    }
    return {
      id: user.accountId,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.account.email,
      activated: user.account.activated,
      suspended: user.suspended,
      available,
      role: user.account.role,
      phone_number: user.phone_number ?? "",
      postal_address: user.postal_address ?? "",
      birthday: user.birthday,
      createdAt: user.account.createdAt,
      avatar: user.avatar,
      resume: user.resume,
      biography: user.biography,
    };
  }

  static async updateUser(data, userId) {
    const { first_name, last_name, phone_number, postal_address, birthday, avatar, biography } =
      data;

    if (
      !first_name &&
      !last_name &&
      !phone_number &&
      !postal_address &&
      !birthday &&
      !avatar &&
      !biography
    ) {
      throw { type: "validation" };
    }

    // get authenticated user
    const user = await prisma.regularUser.findUnique({
      where: { accountId: userId },
    });

    if (!user) {
      throw { type: "not_found" };
    }

    const update = {};

    // build update field
    // allow update if user is providing something
    if ("first_name" in data) update.first_name = first_name;
    if ("last_name" in data) update.last_name = last_name;
    if ("phone_number" in data) update.phone_number = phone_number;
    if ("postal_address" in data) update.postal_address = postal_address;
    if ("birthday" in data) update.birthday = birthday;
    if ("avatar" in data) update.avatar = avatar;
    if ("biography" in data) update.biography = biography;

    // update the user
    await prisma.regularUser.update({
      where: { accountId: userId },
      data: update,
    });

    return {
      id: userId,
      ...update,
    };
  }

  static async getUsers(data, requesterRole) {
    // admins only
    if (requesterRole !== "admin") {
      throw { type: "forbidden" };
    }
    const { keyword } = data;
    const activated = parseBoolean(data.activated);
    const suspended = parseBoolean(data.suspended);
    const page = parseInt(data.page) || 1;
    const limit = parseInt(data.limit) || 10;
    const skip = (page - 1) * limit;

    // construct where clause for regular users
    // check if keyword is contained within the following fields
    const where = {};
    if (keyword) {
      where.OR = [
        { first_name: { contains: keyword } },
        { last_name: { contains: keyword } },
        { account: { email: { contains: keyword } } },
        { phone_number: { contains: keyword } },
        { postal_address: { contains: keyword } },
      ];
    }
    // add activated and suspended to clause if provided
    if (activated !== undefined) {
      where.account = { ...(where.account || {}), activated };
    }
    if (suspended !== undefined) {
      where.suspended = suspended;
    }

    // compute filtered count of regularUsers
    const count = await prisma.regularUser.count({ where });

    const users = await prisma.regularUser.findMany({
      where,
      take: limit,
      skip: skip,
      include: { account: true },
    });

    const results = users.map((u) => ({
      id: u.accountId,
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.account.email,
      activated: u.account.activated,
      suspended: u.suspended,
      role: u.account.role,
      phone_number: u.phone_number,
      postal_address: u.postal_address,
    }));

    return {
      count,
      results,
    };
  }

  static async updateUserAvailability(data, userId) {
    const available = parseBoolean(data.available);

    // get authenticated user
    const user = await prisma.regularUser.findUnique({
      where: { accountId: userId },
    });

    if (!user) {
      throw { type: "not_found" };
    }

    // if suspended or has no approved qualifications when setting to true, bad request
    const approvedQualifications = await prisma.qualification.count({
      where: {
        userId: userId,
        status: "approved",
      },
    });
    if (available && (user.suspended || approvedQualifications === 0)) {
      throw { type: "validation" };
    }

    // update the user
    await prisma.regularUser.update({
      where: { accountId: userId },
      data: { available },
    });

    return { available };
  }

  static async updateUserSuspend(data, userId, requesterRole) {
    // admins only
    if (requesterRole !== "admin") {
      throw { type: "forbidden" };
    }
    // parse suspended variable
    const suspended = parseBoolean(data.suspended);
    if (suspended === undefined) {
      throw { type: "validation" };
    }

    const user = await prisma.regularUser.findUnique({
      where: { accountId: userId },
    });

    if (!user) {
      throw { type: "not_found" };
    }

    const updated = await prisma.regularUser.update({
      where: { accountId: userId },
      data: { suspended },
      include: { account: true },
    });

    return {
      id: updated.accountId,
      first_name: updated.first_name,
      last_name: updated.last_name,
      email: updated.account.email,
      activated: updated.account.activated,
      suspended: updated.suspended,
      role: updated.account.role,
      phone_number: updated.phone_number ?? "",
      postal_address: updated.postal_address ?? "",
    };
  }

  static async uploadUserAvatar(avatarUrl, userId) {
    if (!avatarUrl) {
      throw { type: "validation" };
    }

    // get authenticated user
    const user = await prisma.regularUser.findUnique({
      where: { accountId: userId },
    });

    if (!user) {
      throw { type: "not_found" };
    }

    // update the user
    await prisma.regularUser.update({
      where: { accountId: userId },
      data: { avatar: avatarUrl },
    });

    return { avatar: avatarUrl };
  }

  static async uploadUserResume(resumeUrl, userId) {
    if (!resumeUrl) {
      throw { type: "validation" };
    }

    // get authenticated user
    const user = await prisma.regularUser.findUnique({
      where: { accountId: userId },
    });

    if (!user) {
      throw { type: "not_found" };
    }

    // update the user
    await prisma.regularUser.update({
      where: { accountId: userId },
      data: { resume: resumeUrl },
    });

    return { resume: resumeUrl };
  }

  static async getInvitations(data, userId, requesterRole) {
    const page = parseInt(data.page) || 1;
    const limit = parseInt(data.limit) || 10;
    const skip = (page - 1) * limit;

    // must be a regular
    if (requesterRole === "business") {
      throw { type: "forbidden" };
    }

    // find jobs where business is interested in the user
    const interests = await prisma.interest.findMany({
      where: {
        userId: userId,
        businessInterested: true,
        userInterested: null,
      },
      include: {
        job: {
          include: {
            positionType: true,
            business: true,
          },
        },
      },
      skip,
      take: limit,
    });

    // get total jobs listed
    const count = await prisma.interest.count({
      where: {
        userId: userId,
        businessInterested: true,
        userInterested: null,
      },
    });

    // format response
    const results = interests.map((interest) => ({
      id: interest.job.id,
      status: interest.job.status,
      position_type: {
        id: interest.job.positionType.id,
        name: interest.job.positionType.name,
      },
      business: {
        id: interest.job.business.accountId,
        business_name: interest.job.business.business_name,
      },
      salary_min: interest.job.salary_min,
      salary_max: interest.job.salary_max,
      start_time: interest.job.start_time,
      end_time: interest.job.end_time,
      updatedAt: interest.job.updatedAt,
    }));

    return { count, results };
  }

  static async getInterests(data, userId, requesterRole) {
    const page = parseInt(data.page) || 1;
    const limit = parseInt(data.limit) || 10;
    const skip = (page - 1) * limit;

    // must be a regular
    if (requesterRole === "business") {
      throw { type: "forbidden" };
    }

    // get total number of jobs where the user is interested
    const count = await prisma.interest.count({
      where: {
        userId: userId,
        userInterested: true,
      },
    });

    // find jobs where the user has expressed interest
    const interests = await prisma.interest.findMany({
      where: {
        userId: userId,
        userInterested: true,
      },
      include: {
        job: {
          include: {
            positionType: true,
            business: true,
          },
        },
      },
      orderBy: {
        id: "asc",
      },
      skip,
      take: limit,
    });

    // format response
    const results = interests.map((interest) => ({
      interest_id: interest.id,
      mutual: interest.userInterested && interest.businessInterested ? true : false,
      job: {
        id: interest.job.id,
        status: interest.job.status,
        position_type: {
          id: interest.job.positionType.id,
          name: interest.job.positionType.name,
        },
        business: {
          id: interest.job.business.accountId,
          business_name: interest.job.business.business_name,
        },
        salary_min: interest.job.salary_min,
        salary_max: interest.job.salary_max,
        start_time: interest.job.start_time,
        end_time: interest.job.end_time,
        updatedAt: interest.job.updatedAt,
      },
    }));

    return { count, results };
  }
}

module.exports = { UserService };
