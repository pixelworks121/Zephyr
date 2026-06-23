const { z } = require('zod');
const { formatDate } = require('@zephyr/shared');
const prisma = require('../utils/prismaClient');
const apiResponse = require('../utils/apiResponse');

const createFollowUpSchema = z.object({
  leadId: z.string().uuid('Invalid lead ID'),
  scheduledAt: z.string().datetime('Invalid date format'),
  note: z.string().max(500, 'Note must be under 500 characters').optional(),
});

const updateFollowUpSchema = z.object({
  scheduledAt: z.string().datetime('Invalid date format').optional(),
  note: z.string().max(500, 'Note must be under 500 characters').optional(),
});

const followUpInclude = {
  lead: { select: { id: true, companyName: true, status: true } },
  user: { select: { id: true, name: true } },
};

async function checkLeadAccess(leadId, user) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { error: apiResponse.error(null, 'Lead not found', 404) };
  if (user.role === 'EMPLOYEE' && lead.assignedToId !== user.id) {
    return { error: apiResponse.error(null, 'Access denied', 403) };
  }
  return { lead };
}

async function buildSummary(whereBase) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);

  const [total, doneCount, overdueCount, dueTodayCount] = await Promise.all([
    prisma.followUp.count({ where: whereBase }),
    prisma.followUp.count({ where: { ...whereBase, done: true } }),
    prisma.followUp.count({
      where: { ...whereBase, done: false, scheduledAt: { lt: now } },
    }),
    prisma.followUp.count({
      where: {
        ...whereBase,
        done: false,
        scheduledAt: { gte: startOfToday, lte: endOfToday },
      },
    }),
  ]);

  return {
    total,
    pending: total - doneCount,
    overdue: overdueCount,
    done: doneCount,
    dueToday: dueTodayCount,
  };
}

const followupController = {
  async createFollowUp(req, res, next) {
    try {
      const parsed = createFollowUpSchema.safeParse(req.body);
      if (!parsed.success) {
        return apiResponse.error(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors);
      }

      const { leadId, scheduledAt, note } = parsed.data;
      const scheduledDate = new Date(scheduledAt);

      if (scheduledDate <= new Date()) {
        return apiResponse.error(res, 'Scheduled date must be in the future', 400);
      }

      const { lead, error } = await checkLeadAccess(leadId, req.user);
      if (error) return error;

      const followUp = await prisma.followUp.create({
        data: {
          leadId,
          userId: req.user.id,
          scheduledAt: scheduledDate,
          note: note || null,
          done: false,
        },
        include: followUpInclude,
      });

      await prisma.activity.create({
        data: {
          leadId,
          userId: req.user.id,
          type: 'FOLLOW_UP',
          content: `Follow-up scheduled for ${formatDate(scheduledDate)}`,
        },
      });

      return apiResponse.success(res, followUp, 'Follow-up created', 201);
    } catch (err) {
      next(err);
    }
  },

  async getFollowUpsByLead(req, res, next) {
    try {
      const { leadId } = req.params;
      const { done, page = 1, limit = 20 } = req.query;

      const { lead, error } = await checkLeadAccess(leadId, req.user);
      if (error) return error;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const where = { leadId };
      if (done !== undefined) where.done = done === 'true';

      const [followUps, total] = await Promise.all([
        prisma.followUp.findMany({
          where,
          include: followUpInclude,
          orderBy: { scheduledAt: 'asc' },
          skip,
          take: limitNum,
        }),
        prisma.followUp.count({ where }),
      ]);

      return apiResponse.success(res, {
        data: followUps,
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

  async getMyFollowUps(req, res, next) {
    try {
      const { done, overdue, upcoming, startDate, endDate, page = 1, limit = 20 } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const skip = (pageNum - 1) * limitNum;
      const now = new Date();

      const where = { userId: req.user.id };

      if (done !== undefined) {
        where.done = done === 'true';
      } else {
        if (overdue === 'true') {
          where.done = false;
          where.scheduledAt = { lt: now };
        } else if (upcoming === 'true') {
          where.done = false;
          where.scheduledAt = { gte: now };
        }
      }

      if (startDate || endDate) {
        if (!where.scheduledAt) where.scheduledAt = {};
        if (startDate) where.scheduledAt.gte = new Date(startDate);
        if (endDate) where.scheduledAt.lte = new Date(endDate);
      }

      const baseWhere = { userId: req.user.id };

      const [followUps, total, summary] = await Promise.all([
        prisma.followUp.findMany({
          where,
          include: {
            lead: { select: { id: true, companyName: true, status: true } },
            user: { select: { id: true, name: true } },
          },
          orderBy: { scheduledAt: 'asc' },
          skip,
          take: limitNum,
        }),
        prisma.followUp.count({ where }),
        buildSummary(baseWhere),
      ]);

      return apiResponse.success(res, {
        data: followUps,
        summary,
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

  async getAllFollowUps(req, res, next) {
    try {
      const { done, overdue, userId, leadId, startDate, endDate, page = 1, limit = 30 } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
      const skip = (pageNum - 1) * limitNum;
      const now = new Date();

      const where = {};

      if (done !== undefined) {
        where.done = done === 'true';
      } else if (overdue === 'true') {
        where.done = false;
        where.scheduledAt = { lt: now };
      }

      if (userId) where.userId = userId;
      if (leadId) where.leadId = leadId;

      if (startDate || endDate) {
        if (!where.scheduledAt) where.scheduledAt = {};
        if (startDate) where.scheduledAt.gte = new Date(startDate);
        if (endDate) where.scheduledAt.lte = new Date(endDate);
      }

      const [followUps, total, summary] = await Promise.all([
        prisma.followUp.findMany({
          where,
          include: {
            lead: { select: { id: true, companyName: true, status: true } },
            user: { select: { id: true, name: true } },
          },
          orderBy: { scheduledAt: 'asc' },
          skip,
          take: limitNum,
        }),
        prisma.followUp.count({ where }),
        buildSummary({}),
      ]);

      return apiResponse.success(res, {
        data: followUps,
        summary,
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

  async markFollowUpDone(req, res, next) {
    try {
      const { id } = req.params;

      const followUp = await prisma.followUp.findUnique({ where: { id } });
      if (!followUp) {
        return apiResponse.error(res, 'Follow-up not found', 404);
      }

      if (req.user.role !== 'ADMIN' && followUp.userId !== req.user.id) {
        return apiResponse.error(res, 'Access denied', 403);
      }

      const updated = await prisma.followUp.update({
        where: { id },
        data: { done: true },
        include: followUpInclude,
      });

      const noteText = followUp.note ? `: ${followUp.note}` : '';
      await prisma.activity.create({
        data: {
          leadId: followUp.leadId,
          userId: req.user.id,
          type: 'FOLLOW_UP',
          content: `Follow-up completed${noteText}`,
        },
      });

      return apiResponse.success(res, updated, 'Follow-up marked as done');
    } catch (err) {
      next(err);
    }
  },

  async updateFollowUp(req, res, next) {
    try {
      const { id } = req.params;

      const followUp = await prisma.followUp.findUnique({ where: { id } });
      if (!followUp) {
        return apiResponse.error(res, 'Follow-up not found', 404);
      }

      if (req.user.role !== 'ADMIN' && followUp.userId !== req.user.id) {
        return apiResponse.error(res, 'Access denied', 403);
      }

      if (followUp.done) {
        return apiResponse.error(res, 'Cannot update a completed follow-up', 400);
      }

      const parsed = updateFollowUpSchema.safeParse(req.body);
      if (!parsed.success) {
        return apiResponse.error(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors);
      }

      const data = {};
      if (parsed.data.note !== undefined) data.note = parsed.data.note || null;
      if (parsed.data.scheduledAt) {
        const newDate = new Date(parsed.data.scheduledAt);
        if (newDate <= new Date()) {
          return apiResponse.error(res, 'Scheduled date must be in the future', 400);
        }
        data.scheduledAt = newDate;
      }

      const updated = await prisma.followUp.update({
        where: { id },
        data,
        include: followUpInclude,
      });

      return apiResponse.success(res, updated, 'Follow-up updated');
    } catch (err) {
      next(err);
    }
  },

  async deleteFollowUp(req, res, next) {
    try {
      const { id } = req.params;

      const followUp = await prisma.followUp.findUnique({ where: { id } });
      if (!followUp) {
        return apiResponse.error(res, 'Follow-up not found', 404);
      }

      await prisma.followUp.delete({ where: { id } });

      return apiResponse.success(res, null, 'Follow-up deleted');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = followupController;
