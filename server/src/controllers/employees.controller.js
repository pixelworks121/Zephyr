const { z } = require('zod');
const prisma = require('../utils/prismaClient');
const apiResponse = require('../utils/apiResponse');

const updateEmployeeSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  role: z.enum(['ADMIN', 'EMPLOYEE']).optional(),
});

const employeesController = {
  async getAllEmployees(req, res, next) {
    try {
      const employees = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'EMPLOYEE'] } },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              leads: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const employeeIds = employees.map((e) => e.id);

      const closedCounts = await prisma.lead.groupBy({
        by: ['assignedToId'],
        where: {
          assignedToId: { in: employeeIds },
          status: 'CLOSED_WON',
        },
        _count: true,
      });

      const closedMap = {};
      closedCounts.forEach((item) => {
        closedMap[item.assignedToId] = item._count;
      });

      const result = employees.map((emp) => ({
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        createdAt: emp.createdAt,
        updatedAt: emp.updatedAt,
        leadCount: emp._count.leads,
        closedWonCount: closedMap[emp.id] || 0,
      }));

      return apiResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  },

  async getEmployeeById(req, res, next) {
    try {
      const { id } = req.params;

      const employee = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          leads: {
            select: {
              id: true,
              companyName: true,
              status: true,
              industry: true,
              aiScore: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
          _count: { select: { leads: true } },
        },
      });

      if (!employee) {
        return apiResponse.error(res, 'Employee not found', 404);
      }

      return apiResponse.success(res, employee);
    } catch (err) {
      next(err);
    }
  },

  async updateEmployee(req, res, next) {
    try {
      const { id } = req.params;

      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) {
        return apiResponse.error(res, 'Employee not found', 404);
      }

      const parsed = updateEmployeeSchema.safeParse(req.body);
      if (!parsed.success) {
        return apiResponse.error(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors);
      }

      if (parsed.data.role && id === req.user.id) {
        return apiResponse.error(res, 'Cannot change your own role', 400);
      }

      const updated = await prisma.user.update({
        where: { id },
        data: parsed.data,
        select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
      });

      return apiResponse.success(res, updated, 'Employee updated');
    } catch (err) {
      next(err);
    }
  },

  async deleteEmployee(req, res, next) {
    try {
      const { id } = req.params;

      if (id === req.user.id) {
        return apiResponse.error(res, 'Cannot delete yourself', 400);
      }

      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) {
        return apiResponse.error(res, 'Employee not found', 404);
      }

      await prisma.lead.updateMany({
        where: { assignedToId: id },
        data: { assignedToId: null },
      });

      await prisma.user.delete({ where: { id } });

      return apiResponse.success(res, null, 'Employee deleted');
    } catch (err) {
      next(err);
    }
  },

  async getEmployeePerformance(req, res, next) {
    try {
      const { id } = req.params;

      const employee = await prisma.user.findUnique({ where: { id } });
      if (!employee) {
        return apiResponse.error(res, 'Employee not found', 404);
      }

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const statusCounts = await prisma.lead.groupBy({
        by: ['status'],
        where: { assignedToId: id },
        _count: true,
      });

      const byStatus = {};
      statusCounts.forEach((item) => {
        byStatus[item.status] = item._count;
      });

      const [totalLeads, closedWon, closedLost, activitiesLogged, followUpsScheduled, followUpsDone, leadsThisWeek, leadsThisMonth] = await Promise.all([
        prisma.lead.count({ where: { assignedToId: id } }),
        prisma.lead.count({ where: { assignedToId: id, status: 'CLOSED_WON' } }),
        prisma.lead.count({ where: { assignedToId: id, status: 'CLOSED_LOST' } }),
        prisma.activity.count({ where: { userId: id } }),
        prisma.followUp.count({ where: { userId: id } }),
        prisma.followUp.count({ where: { userId: id, done: true } }),
        prisma.lead.count({ where: { assignedToId: id, createdAt: { gte: weekAgo } } }),
        prisma.lead.count({ where: { assignedToId: id, createdAt: { gte: monthAgo } } }),
      ]);

      const conversionRate = totalLeads > 0
        ? Math.round((closedWon / totalLeads) * 100 * 100) / 100
        : 0;

      return apiResponse.success(res, {
        totalLeads,
        byStatus,
        closedWon,
        closedLost,
        conversionRate,
        activitiesLogged,
        followUpsScheduled,
        followUpsDone,
        leadsThisWeek,
        leadsThisMonth,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = employeesController;
