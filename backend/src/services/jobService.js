const { PrismaClient } = require("@prisma/client");
const haversineDistance = require("../helpers/haversineDistance");
const { parseBoolean } = require("../helpers/validation");
const system = require("../config/system");
const prisma = new PrismaClient();

class JobService {
  static async getJobs(data, requesterRole) {
    // must be a regular
    if (requesterRole !== "regular") {
      throw { type: "forbidden" };
    }
    const { sort, order } = data;
    const lat = parseFloat(data.lat);
    const lon = parseFloat(data.lon);
    const position_type_id = parseInt(data.position_type_id);
    const business_id = parseInt(data.business_id);
    const page = parseInt(data.page) || 1;
    const limit = parseInt(data.limit) || 10;
    const skip = (page - 1) * limit;

    // build orderBy
    let sortValue = "start_time";
    let orderValue = "asc";
    let orderBy = { [sortValue]: orderValue };
    if (sort) {
      const sortValues = ["updatedAt", "start_time", "salary_min", "salary_max", "distance", "eta"];

      // default sort is start time
      if (sortValues.includes(sort)) {
        sortValue = sort;
      }

      // default order value is asc
      const orderValues = ["asc", "desc"];
      if (orderValues.includes(order)) {
        orderValue = order;
      }

      if ((sortValue === "distance" || sortValue === "eta") && (isNaN(lat) || isNaN(lon))) {
        throw { type: "validation" };
      }
      if (sortValue !== "distance" && sortValue !== "eta") {
        orderBy = { [sortValue]: orderValue };
      } else {
        orderBy = undefined;
      }
    }

    // filter to open jobs, by business and/or position if specified
    const where = {};
    where.status = "open";
    if (!isNaN(business_id)) {
      where.businessId = business_id;
    }
    if (!isNaN(position_type_id)) {
      where.positionTypeId = position_type_id;
    }

    const count = await prisma.job.count({ where });

    const jobs = await prisma.job.findMany({
      where,
      orderBy,
      take: limit,
      skip,
      include: {
        business: true,
        positionType: true,
      },
    });

    // compute distance and eta if lat and lon were provided
    if (!isNaN(lat) && !isNaN(lon)) {
      for (const job of jobs) {
        const distance = haversineDistance(lat, lon, job.business.lat, job.business.lon);
        const eta = distance / 30;
        job.distance = distance;
        job.eta = eta;
      }
    }

    // sorting for computed fields since they cant be part of the job query
    if (sortValue === "distance" || sortValue === "eta") {
      jobs.sort((a, b) => {
        if (orderValue === "desc") {
          return b[sortValue] - a[sortValue];
        }
        return a[sortValue] - b[sortValue];
      });
    }

    // format results
    const results = jobs.map((job) => {
      const result = {
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
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        start_time: job.start_time,
        end_time: job.end_time,
        updatedAt: job.updatedAt,
      };
      // add distance and eta if lat and lon were specified
      if (job.distance !== undefined) {
        result.distance = job.distance;
        result.eta = job.eta;
      }
      return result;
    });

    return {
      count,
      results,
    };
  }

  static async getJob(data, jobId, user) {
    const lat = parseFloat(data.lat);
    const lon = parseFloat(data.lon);

    // must provide both coords
    if ((isNaN(lat) && !isNaN(lon)) || (!isNaN(lat) && isNaN(lon))) {
      throw { type: "validation" };
    }
    // must be valid lat lon
    if (!isNaN(lon) && !isNaN(lat) && (lat < -90 || lat > 90 || lon < -180 || lon > 180)) {
      throw { type: "validation", message: "Invalid Location" };
    }

    // find unique job
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        positionType: true,
        business: true,
        worker: true,
      },
    });

    if (!job) {
      throw { type: "not_found" };
    }

    // handle regular user cases
    if (user.role === "regular") {
      // check if they are qualified for the job
      const qualification = await prisma.qualification.findFirst({
        where: {
          userId: user.id,
          positionTypeId: job.positionTypeId,
          status: "approved",
        },
      });
      if (!qualification) {
        throw { type: "forbidden" };
      }
      // check if they have filled, cancelled, or completed a job or its open
      const allowed =
        job.status === "open" ||
        (job.workerId === user.id && ["filled", "cancelled", "completed"].includes(job.status));
      if (!allowed) {
        throw { type: "forbidden" };
      }
    }

    // handle business user cases
    if (user.role === "business") {
      // not allowed to provide lat or lon
      if (!isNaN(lat) && !isNaN(lon)) {
        throw { type: "validation" };
      }
      if (job.businessId !== user.id) {
        throw { type: "not_found" };
      }
    }

    // construct the result
    const result = {
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
      worker: job.worker ? { id: job.worker.accountId } : null,
      note: job.note,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      start_time: job.start_time,
      end_time: job.end_time,
      updatedAt: job.updatedAt,
    };

    // add distance and eta for regular user if lat and lon are provided
    if (user.role === "regular" && !isNaN(lat) && !isNaN(lon)) {
      const distance = haversineDistance(lat, lon, job.business.lat, job.business.lon);
      const eta = distance / 30;
      result.distance = distance;
      result.eta = eta;
    }

    return result;
  }

  static async setNoShow(jobId, businessId, requesterRole) {
    const now = new Date();

    // expire any open jobs that have passed their end time (lazy cleanup on non-GET)
    await prisma.job.updateMany({
      where: { status: "open", end_time: { lt: now } },
      data: { status: "expired" },
    });

    // must be a business
    if (requesterRole === "regular") {
      throw { type: "forbidden" };
    }

    // find unique job
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    // handle errors
    if (!job) {
      throw { type: "not_found" };
    }

    // job must be for the business that created the job
    if (job.businessId !== businessId) {
      throw { type: "forbidden" };
    }

    // conflicts
    if (now <= job.start_time || now >= job.end_time || job.status !== "filled") {
      throw { type: "conflict" };
    }

    // update worker to suspended
    if (job.workerId) {
      await prisma.regularUser.update({
        where: { accountId: job.workerId },
        data: {
          suspended: true,
        },
      });
    }

    // update job status to cancelled
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "cancelled",
      },
    });

    return {
      id: updatedJob.id,
      status: updatedJob.status,
      updatedAt: updatedJob.updatedAt,
    };
  }

  static async setInterest(data, jobId, userId) {
    const interested = parseBoolean(data.interested);
    const now = new Date();
    // find unique job
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    // handle errors
    if (!job) {
      throw { type: "not_found" };
    }
    if (job.status !== "open" || now >= job.start_time) {
      throw { type: "conflict" };
    }

    // user trying to withdraw interest from a job they havent expressed interest to
    const existingInterest = await prisma.interest.findFirst({
      where: {
        jobId: jobId,
        userId: userId,
      },
    });

    if (!interested && !existingInterest) {
      throw { type: "validation" };
    }

    // is user qualified
    const qualification = await prisma.qualification.findFirst({
      where: {
        userId: userId,
        positionTypeId: job.positionTypeId,
        status: "approved",
      },
    });

    if (!qualification) {
      throw { type: "forbidden" };
    }

    // conflict
    const negotiation = await prisma.negotiation.findFirst({
      where: {
        jobId: jobId,
        userId: userId,
      },
    });

    if (negotiation) {
      throw { type: "conflict" };
    }

    // create or update interest
    let interest;
    if (existingInterest) {
      interest = await prisma.interest.update({
        where: { id: existingInterest.id },
        data: { userInterested: interested },
      });
    } else {
      interest = await prisma.interest.create({
        data: {
          jobId: jobId,
          userId: userId,
          userInterested: interested,
        },
      });
    }

    return {
      id: interest.id,
      job_id: interest.jobId,
      candidate: {
        id: interest.userId,
        interested: interest.userInterested,
      },
      business: {
        id: job.businessId,
        interested: interest.businessInterested ?? null,
      },
    };
  }

  static async getCandidates(data, jobId, businessId, requesterRole) {
    const page = parseInt(data.page) || 1;
    const limit = parseInt(data.limit) || 10;
    const skip = (page - 1) * limit;
    // find the specific candidates who meet qualifications
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    // must be a business
    if (requesterRole === "regular") {
      throw { type: "forbidden" };
    }

    // job does not belong to authenticated business
    if (!job || job.businessId !== businessId) {
      throw { type: "not_found" };
    }
    // compute the cutoff for lastActiveAt based on system availability timeout (in seconds)
    const activityCutoff = new Date(Date.now() - system.availabilityTimeout * 1000);

    // find the qualified users for the job — must also be not suspended, available, and recently active
    const qualifiedUsers = await prisma.regularUser.findMany({
      where: {
        suspended: false,
        available: true,
        lastActiveAt: { gte: activityCutoff },
        qualifications: {
          some: {
            positionTypeId: job.positionTypeId,
            status: "approved",
          },
        },
      },
      include: {
        account: true,
        jobs: true,
      },
    });

    // determine which users dont have conflicting jobs with the job in question
    const discoverableUsers = qualifiedUsers.filter((user) => {
      const conflict = user.jobs.some(
        (j) => j.status === "filled" && j.start_time < job.end_time && j.end_time > job.start_time
      );
      return !conflict;
    });

    // get all associated interests where businesses are interested
    const interests = await prisma.interest.findMany({
      where: {
        jobId: jobId,
        businessInterested: true,
      },
    });

    // users invited for the job in question
    const invitedIds = new Set(interests.map((i) => i.userId));
    // format response
    const count = discoverableUsers.length;
    const paginatedUsers = discoverableUsers.slice(skip, skip + limit);
    const results = paginatedUsers.map((user) => ({
      id: user.accountId,
      first_name: user.first_name,
      last_name: user.last_name,
      invited: invitedIds.has(user.accountId),
    }));

    return { count, results };
  }

  static async getUserCandidates(data, jobId, userId, businessId, requesterRole) {
    // find the unique job
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        positionType: true,
      },
    });

    // must be a business
    if (requesterRole === "regular") {
      throw { type: "forbidden" };
    }

    // job does not belong to authenticated business
    if (!job || job.businessId !== businessId) {
      throw { type: "not_found" };
    }

    // find the candidate user
    const user = await prisma.regularUser.findUnique({
      where: { accountId: userId },
      include: {
        account: true,
        qualifications: true,
        jobs: true,
      },
    });

    // user does not exist
    if (!user) {
      throw { type: "not_found" };
    }

    // get the qualification for this jobs position type
    const qualification = user.qualifications.find(
      (q) => q.positionTypeId === job.positionTypeId && q.status === "approved"
    );

    // user is not qualified for this job
    if (!qualification) {
      throw { type: "forbidden" };
    }

    // determine if the user has conflicting jobs
    const conflict = user.jobs.some(
      (j) => j.status === "filled" && j.start_time < job.end_time && j.end_time > job.start_time
    );

    const now = new Date();

    // user is not discoverable unless they filled this job and it hasn't ended
    if (conflict && !(job.workerId === userId && now < job.end_time)) {
      throw { type: "forbidden" };
    }

    // construct user response object
    const userResponse = {
      id: user.accountId,
      first_name: user.first_name,
      last_name: user.last_name,
      avatar: user.avatar,
      resume: user.resume,
      biography: user.biography,
      qualification: {
        id: qualification.id,
        position_type_id: qualification.positionTypeId,
        document: qualification.document,
        note: qualification.note,
        updatedAt: qualification.updatedAt,
      },
    };

    // only include email and phone if the candidate filled this job
    if (job.workerId === userId) {
      userResponse.email = user.account.email;
      userResponse.phone_number = user.phone_number;
    }

    // construct job response object
    const jobResponse = {
      id: job.id,
      status: job.status,
      position_type: {
        id: job.positionType.id,
        name: job.positionType.name,
        description: job.positionType.description,
      },
      start_time: job.start_time,
      end_time: job.end_time,
    };

    return {
      user: userResponse,
      job: jobResponse,
    };
  }

  static async updateInterestInCandidate(data, jobId, userId, businessId, requesterRole) {
    const interested = parseBoolean(data.interested);
    const now = new Date();

    // expire any open jobs that have passed their end time (lazy cleanup on non-GET)
    await prisma.job.updateMany({
      where: { status: "open", end_time: { lt: now } },
      data: { status: "expired" },
    });

    // must be a business
    if (requesterRole === "regular") {
      throw { type: "forbidden" };
    }

    // find the unique job
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    // job does not belong to authenticated business or isnt open
    if (!job || job.businessId !== businessId) {
      throw { type: "not_found" };
    }
    if (
      job.status === "filled" ||
      job.status === "expired" ||
      job.status === "cancelled" ||
      job.status === "completed"
    ) {
      throw { type: "conflict" };
    }

    // find the candidate user
    const user = await prisma.regularUser.findUnique({
      where: { accountId: userId },
      include: {
        jobs: true,
      },
    });

    // user does not exist
    if (!user) {
      throw { type: "not_found" };
    }

    // determine if the user has conflicting jobs
    const conflict = user.jobs.some(
      (j) => j.status === "filled" && j.start_time < job.end_time && j.end_time > job.start_time
    );

    // user is no longer discoverable
    if (conflict) {
      throw { type: "forbidden" };
    }

    // find existing interest for this job/user
    const existingInterest = await prisma.interest.findFirst({
      where: {
        jobId: jobId,
        userId: userId,
      },
    });

    // withdrawing invitation when none exists
    if (!interested && (!existingInterest || !existingInterest.businessInterested)) {
      throw { type: "validation" };
    }

    // update existing interest
    let interest;
    if (existingInterest) {
      interest = await prisma.interest.update({
        where: { id: existingInterest.id },
        data: { businessInterested: interested },
      });
    }
    // create new interest record
    else {
      interest = await prisma.interest.create({
        data: {
          jobId: jobId,
          userId: userId,
          businessInterested: true,
          userInterested: null,
        },
      });
    }

    // format response
    return {
      id: interest.id,
      job_id: jobId,
      candidate: {
        id: userId,
        interested: interest.userInterested,
      },
      business: {
        id: businessId,
        interested: interest.businessInterested,
      },
    };
  }

  static async getInterests(data, jobId, businessId, requesterRole) {
    const page = parseInt(data.page) || 1;
    const limit = parseInt(data.limit) || 10;
    const skip = (page - 1) * limit;

    // must be a business
    if (requesterRole === "regular") {
      throw { type: "forbidden" };
    }

    // find the unique job
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    // job does not belong to authenticated business
    if (!job || job.businessId !== businessId) {
      throw { type: "not_found" };
    }

    // count total users interested in this job
    const count = await prisma.interest.count({
      where: {
        jobId: jobId,
        userInterested: true,
      },
    });

    // find users interested in this job
    const interests = await prisma.interest.findMany({
      where: {
        jobId: jobId,
        userInterested: true,
      },
      include: {
        user: {
          include: {
            account: true,
          },
        },
      },
      skip,
      take: limit,
    });

    // format response
    const results = interests.map((interest) => ({
      interest_id: interest.id,
      mutual: interest.businessInterested === true,
      user: {
        id: interest.userId,
        first_name: interest.user.first_name,
        last_name: interest.user.last_name,
      },
    }));

    return { count, results };
  }
}

module.exports = { JobService };
