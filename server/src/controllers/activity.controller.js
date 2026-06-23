const { z } = require('zod');
const prisma = require('../utils/prismaClient');
const apiResponse = require('../utils/apiResponse');

const activityTypeValues = ['NOTE', 'CALL', 'EMAIL', 'MEETING', 'STATUS_CHANGE', 'FOLLOW_UP'];

const createActivitySchema = z.object({
  leadId: z.string().uuid('Invalid lead ID'),
  type: z.enum(activityTypeValues),
  content: z.string().min(1, 'Content is required').max(2000, 'Content must be under 2000 characters'),
});

const activityInclude = {
  user: { select: { id: true, name: true } },
  lead: { select: { id: true, companyName: true } },
};

async function checkLeadAccess(leadId, user) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { error: apiResponse.error(null, 'Lead not found', 404) };
  if (user.role === 'EMPLOYEE' && lead.assignedToId !== user.id) {
    return { error: apiResponse.error(null, 'Access denied', 403) };
  }
  return { lead };
}

const activityController = {
  async createActivity(req, res, next) {
    try {
      const parsed = createActivitySchema.safeParse(req.body);
      if (!parsed.success) {
        return apiResponse.error(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors);
      }

      const { leadId, type, content } = parsed.data;

      const { lead, error } = await checkLeadAccess(leadId, req.user);
      if (error) return error;

      const activity = await prisma.activity.create({
        data: {
          leadId,
          userId: req.user.id,
          type,
          content,
        },
        include: activityInclude,
      });

      return apiResponse.success(res, activity, 'Activity created', 201);
    } catch (err) {
      next(err);
    }
  },

  async getActivitiesByLead(req, res, next) {
    try {
      const { leadId } = req.params;
      const { type, page = 1, limit = 20 } = req.query;

      const { lead, error } = await checkLeadAccess(leadId, req.user);
      if (error) return error;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const where = { leadId };
      if (type) where.type = type;

      const [activities, total] = await Promise.all([
        prisma.activity.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, email: true } },
            lead: { select: { id: true, companyName: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.activity.count({ where }),
      ]);

      return apiResponse.success(res, {
        data: activities,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async getMyActivities(req, res, next) {
    try {
      const { type, leadId, startDate, endDate, page = 1, limit = 20 } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const where = { userId: req.user.id };
      if (type) where.type = type;
      if (leadId) where.leadId = leadId;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      const [activities, total] = await Promise.all([
        prisma.activity.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, email: true } },
            lead: { select: { id: true, companyName: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.activity.count({ where }),
      ]);

      return apiResponse.success(res, {
        data: activities,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async getAllActivities(req, res, next) {
    try {
      const { type, userId, leadId, startDate, endDate, page = 1, limit = 30 } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
      const skip = (pageNum - 1) * limitNum;

      const where = {};
      if (type) where.type = type;
      if (userId) where.userId = userId;
      if (leadId) where.leadId = leadId;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      const [activities, total, typeCounts] = await Promise.all([
        prisma.activity.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, email: true } },
            lead: { select: { id: true, companyName: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.activity.count({ where }),
        ...activityTypeValues.map((t) =>
          prisma.activity.count({ where: { ...where, type: t } })
        ),
      ]);

      const totalByType = {};
      activityTypeValues.forEach((t, i) => {
        totalByType[t] = typeCounts[i];
      });

      return apiResponse.success(res, {
        data: activities,
        summary: { totalByType },
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteActivity(req, res, next) {
    try {
      const { id } = req.params;

      const activity = await prisma.activity.findUnique({ where: { id } });
      if (!activity) {
        return apiResponse.error(res, 'Activity not found', 404);
      }

      if (activity.type === 'STATUS_CHANGE') {
        return apiResponse.error(res, 'Cannot delete system-generated STATUS_CHANGE activities', 400);
      }

      if (req.user.role !== 'ADMIN' && activity.userId !== req.user.id) {
        return apiResponse.error(res, 'Access denied', 403);
      }

      await prisma.activity.delete({ where: { id } });

      return apiResponse.success(res, null, 'Activity deleted');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = activityController;
