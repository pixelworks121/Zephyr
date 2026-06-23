const { z } = require('zod');
const { LEAD_STATUSES, LEAD_STATUS_LABELS } = require('@zephyr/shared');
const prisma = require('../utils/prismaClient');
const apiResponse = require('../utils/apiResponse');

const leadStatusValues = Object.values(LEAD_STATUSES);
const businessSizeValues = ['SOLO', 'SMALL', 'MEDIUM', 'LARGE'];
const sourceValues = ['AI_DISCOVERED', 'MANUAL', 'CSV_IMPORT'];

const createLeadSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  website: z.string().url('Invalid URL format').optional().or(z.literal('')),
  industry: z.string().optional(),
  country: z.string().optional(),
  contactName: z.string().optional(),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().optional(),
  linkedinUrl: z.string().url('Invalid URL format').optional().or(z.literal('')),
  twitterUrl: z.string().url('Invalid URL format').optional().or(z.literal('')),
  businessSize: z.enum(businessSizeValues).optional(),
  source: z.enum(sourceValues).optional().default('MANUAL'),
  assignedToId: z.string().uuid().optional(),
});

const updateLeadSchema = z.object({
  companyName: z.string().min(1).optional(),
  website: z.string().url('Invalid URL format').optional().or(z.literal('')),
  industry: z.string().optional(),
  country: z.string().optional(),
  contactName: z.string().optional(),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().optional(),
  linkedinUrl: z.string().url('Invalid URL format').optional().or(z.literal('')),
  twitterUrl: z.string().url('Invalid URL format').optional().or(z.literal('')),
  businessSize: z.enum(businessSizeValues).optional(),
  status: z.enum(leadStatusValues).optional(),
  source: z.enum(sourceValues).optional(),
  assignedToId: z.string().uuid().optional().nullable(),
  aiScore: z.number().min(1).max(10).optional(),
  aiAnalysis: z.string().optional(),
  whyGoodProspect: z.string().optional(),
  recommendedServices: z.string().optional(),
  emailTemplate: z.string().optional(),
  callScript: z.string().optional(),
});

function cleanUrl(val) {
  if (val === '' || val === null || val === undefined) return null;
  return val;
}

function buildLeadInclude() {
  return {
    assignedTo: {
      select: { id: true, name: true, email: true },
    },
  };
}

async function logActivity(leadId, userId, type, content) {
  await prisma.activity.create({
    data: { leadId, userId, type, content },
  });
}

const leadsController = {
  async createLead(req, res, next) {
    try {
      const parsed = createLeadSchema.safeParse(req.body);
      if (!parsed.success) {
        return apiResponse.error(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors);
      }

      const data = parsed.data;
      data.website = cleanUrl(data.website);
      data.email = cleanUrl(data.email);
      data.linkedinUrl = cleanUrl(data.linkedinUrl);
      data.twitterUrl = cleanUrl(data.twitterUrl);

      if (data.email) {
        const existing = await prisma.lead.findFirst({ where: { email: data.email } });
        if (existing) {
          return apiResponse.error(res, 'Lead already exists', 409);
        }
      }

      if (data.website) {
        const existing = await prisma.lead.findFirst({ where: { website: data.website } });
        if (existing) {
          return apiResponse.error(res, 'Lead already exists', 409);
        }
      }

      const lead = await prisma.lead.create({
        data: {
          ...data,
          status: 'NEW_LEAD',
        },
        include: buildLeadInclude(),
      });

      await logActivity(lead.id, req.user.id, 'STATUS_CHANGE', 'Lead created with status New Lead');

      return apiResponse.success(res, lead, 'Lead created', 201);
    } catch (err) {
      next(err);
    }
  },

  async getAllLeads(req, res, next) {
    try {
      const {
        status,
        industry,
        country,
        source,
        assignedToId,
        search,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const where = {};

      if (req.user.role === 'EMPLOYEE') {
        where.assignedToId = req.user.id;
      } else if (assignedToId) {
        where.assignedToId = assignedToId;
      }

      if (status) where.status = status;
      if (industry) where.industry = industry;
      if (country) where.country = country;
      if (source) where.source = source;

      if (search) {
        where.OR = [
          { companyName: { contains: search, mode: 'insensitive' } },
          { contactName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      const validSortFields = ['createdAt', 'updatedAt', 'companyName', 'aiScore', 'status'];
      const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
      const safeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where,
          include: buildLeadInclude(),
          orderBy: { [safeSortBy]: safeSortOrder },
          skip,
          take: limitNum,
        }),
        prisma.lead.count({ where }),
      ]);

      return apiResponse.success(res, {
        leads,
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

  async getLeadById(req, res, next) {
    try {
      const { id } = req.params;

      const lead = await prisma.lead.findUnique({
        where: { id },
        include: {
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
          activities: {
            include: {
              user: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
          followUps: {
            include: {
              user: { select: { id: true, name: true } },
            },
            orderBy: { scheduledAt: 'asc' },
          },
        },
      });

      if (!lead) {
        return apiResponse.error(res, 'Lead not found', 404);
      }

      if (req.user.role === 'EMPLOYEE' && lead.assignedToId !== req.user.id) {
        return apiResponse.error(res, 'Access denied', 403);
      }

      return apiResponse.success(res, lead);
    } catch (err) {
      next(err);
    }
  },

  async updateLead(req, res, next) {
    try {
      const { id } = req.params;

      const existing = await prisma.lead.findUnique({ where: { id } });
      if (!existing) {
        return apiResponse.error(res, 'Lead not found', 404);
      }

      if (req.user.role === 'EMPLOYEE' && existing.assignedToId !== req.user.id) {
        return apiResponse.error(res, 'Access denied', 403);
      }

      const parsed = updateLeadSchema.safeParse(req.body);
      if (!parsed.success) {
        return apiResponse.error(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors);
      }

      const data = { ...parsed.data };
      data.website = cleanUrl(data.website);
      data.email = cleanUrl(data.email);
      data.linkedinUrl = cleanUrl(data.linkedinUrl);
      data.twitterUrl = cleanUrl(data.twitterUrl);

      if (data.status && data.status !== existing.status) {
        const oldLabel = LEAD_STATUS_LABELS[existing.status] || existing.status;
        const newLabel = LEAD_STATUS_LABELS[data.status] || data.status;
        await logActivity(id, req.user.id, 'STATUS_CHANGE', `Status changed from ${oldLabel} to ${newLabel}`);
      }

      if (data.assignedToId !== undefined && data.assignedToId !== existing.assignedToId) {
        if (data.assignedToId) {
          const assignee = await prisma.user.findUnique({ where: { id: data.assignedToId } });
          if (!assignee) {
            return apiResponse.error(res, 'Assignee not found', 404);
          }
          await logActivity(id, req.user.id, 'NOTE', `Lead reassigned to ${assignee.name}`);
        } else {
          await logActivity(id, req.user.id, 'NOTE', 'Lead unassigned');
        }
      }

      const lead = await prisma.lead.update({
        where: { id },
        data,
        include: buildLeadInclude(),
      });

      return apiResponse.success(res, lead, 'Lead updated');
    } catch (err) {
      next(err);
    }
  },

  async deleteLead(req, res, next) {
    try {
      const { id } = req.params;

      const lead = await prisma.lead.findUnique({ where: { id } });
      if (!lead) {
        return apiResponse.error(res, 'Lead not found', 404);
      }

      await prisma.$transaction([
        prisma.activity.deleteMany({ where: { leadId: id } }),
        prisma.followUp.deleteMany({ where: { leadId: id } }),
        prisma.lead.delete({ where: { id } }),
      ]);

      return apiResponse.success(res, null, 'Lead deleted');
    } catch (err) {
      next(err);
    }
  },

  async bulkImportLeads(req, res, next) {
    try {
      const { leads: rawLeads } = req.body;

      if (!Array.isArray(rawLeads) || rawLeads.length === 0) {
        return apiResponse.error(res, 'Leads array is required', 400);
      }

      if (rawLeads.length > 100) {
        return apiResponse.error(res, 'Maximum 100 leads per import', 400);
      }

      let created = 0;
      let skipped = 0;

      const validLeads = [];
      for (const item of rawLeads) {
        if (!item.companyName || typeof item.companyName !== 'string' || !item.companyName.trim()) {
          skipped++;
          continue;
        }

        if (item.email) {
          const exists = await prisma.lead.findFirst({ where: { email: item.email } });
          if (exists) { skipped++; continue; }
        }

        if (item.website) {
          const exists = await prisma.lead.findFirst({ where: { website: item.website } });
          if (exists) { skipped++; continue; }
        }

        validLeads.push(item);
      }

      if (validLeads.length > 0) {
        const result = await prisma.$transaction(
          validLeads.map((item) =>
            prisma.lead.create({
              data: {
                companyName: item.companyName,
                website: cleanUrl(item.website),
                industry: item.industry || null,
                country: item.country || null,
                contactName: item.contactName || null,
                email: cleanUrl(item.email),
                phone: item.phone || null,
                linkedinUrl: cleanUrl(item.linkedinUrl),
                twitterUrl: cleanUrl(item.twitterUrl),
                businessSize: item.businessSize || null,
                source: 'CSV_IMPORT',
                status: 'NEW_LEAD',
                assignedToId: item.assignedToId || null,
              },
            })
          )
        );
        created = result.length;
      }

      return apiResponse.success(res, {
        created,
        skipped,
        total: rawLeads.length,
      }, `Bulk import complete: ${created} created, ${skipped} skipped`);
    } catch (err) {
      next(err);
    }
  },

  async assignLead(req, res, next) {
    try {
      const { id } = req.params;
      const { assignedToId } = req.body;

      if (!assignedToId) {
        return apiResponse.error(res, 'assignedToId is required', 400);
      }

      const lead = await prisma.lead.findUnique({ where: { id } });
      if (!lead) {
        return apiResponse.error(res, 'Lead not found', 404);
      }

      const employee = await prisma.user.findUnique({ where: { id: assignedToId } });
      if (!employee) {
        return apiResponse.error(res, 'Employee not found', 404);
      }

      const updated = await prisma.lead.update({
        where: { id },
        data: { assignedToId },
        include: buildLeadInclude(),
      });

      await logActivity(id, req.user.id, 'NOTE', `Lead assigned to ${employee.name}`);

      return apiResponse.success(res, updated, 'Lead assigned');
    } catch (err) {
      next(err);
    }
  },

  async getLeadStats(req, res, next) {
    try {
      const where = {};
      if (req.user.role === 'EMPLOYEE') {
        where.assignedToId = req.user.id;
      }

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [total, leadsByStatus, leadsBySource, leadsByIndustry, weekLeads, monthLeads] = await Promise.all([
        prisma.lead.count({ where }),
        ...leadStatusValues.map((status) =>
          prisma.lead.count({ where: { ...where, status } })
        ),
        ...sourceValues.map((source) =>
          prisma.lead.count({ where: { ...where, source } })
        ),
        prisma.lead.groupBy({
          by: ['industry'],
          where,
          _count: true,
          orderBy: { _count: { industry: 'desc' } },
        }),
        prisma.lead.count({ where: { ...where, createdAt: { gte: weekAgo } } }),
        prisma.lead.count({ where: { ...where, createdAt: { gte: monthAgo } } }),
      ]);

      const byStatus = {};
      leadStatusValues.forEach((status, i) => {
        byStatus[status] = leadsByStatus[i];
      });

      const bySource = {};
      sourceValues.forEach((source, i) => {
        bySource[source] = leadsBySource[i];
      });

      const byIndustry = {};
      leadsByIndustry.forEach((item) => {
        byIndustry[item.industry || 'Unknown'] = item._count;
      });

      const closedWon = byStatus.CLOSED_WON || 0;
      const conversionRate = total > 0 ? Math.round((closedWon / total) * 100 * 100) / 100 : 0;

      return apiResponse.success(res, {
        total,
        byStatus,
        bySource,
        byIndustry,
        conversionRate,
        thisWeek: weekLeads,
        thisMonth: monthLeads,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = leadsController;
