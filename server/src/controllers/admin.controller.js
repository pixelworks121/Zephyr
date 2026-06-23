const prisma = require('../utils/prismaClient');
const apiResponse = require('../utils/apiResponse');
const {
  getStartOfDay,
  getEndOfDay,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  getDaysBetween,
  generateDateRange,
  getWeekNumber,
  formatMonthYear,
  dayKey,
} = require('../utils/dateHelpers');

const ALL_STATUSES = [
  'NEW_LEAD',
  'CONTACTED',
  'EMAIL_SENT',
  'FOLLOW_UP_REQUIRED',
  'INTERESTED',
  'MEETING_SCHEDULED',
  'PROPOSAL_SENT',
  'NEGOTIATION',
  'CLOSED_WON',
  'CLOSED_LOST',
];

const STATUS_LABELS = {
  NEW_LEAD: 'New Lead',
  CONTACTED: 'Contacted',
  EMAIL_SENT: 'Email Sent',
  FOLLOW_UP_REQUIRED: 'Follow-Up Required',
  INTERESTED: 'Interested',
  MEETING_SCHEDULED: 'Meeting Scheduled',
  PROPOSAL_SENT: 'Proposal Sent',
  NEGOTIATION: 'Negotiation',
  CLOSED_WON: 'Closed Won',
  CLOSED_LOST: 'Closed Lost',
};

const ALL_ACTIVITY_TYPES = ['NOTE', 'CALL', 'EMAIL', 'MEETING', 'STATUS_CHANGE', 'FOLLOW_UP'];

const round2 = (n) => parseFloat(Number(n || 0).toFixed(2));

// Build a {key: 0,...} object from a list of keys.
const zeroMap = (keys) => keys.reduce((acc, k) => ({ ...acc, [k]: 0 }), {});

// Parse startDate/endDate query params, falling back to a default window (in days).
function parseRange(req, defaultDays = 30) {
  const now = new Date();
  let endDate = new Date(req.query.endDate);
  if (Number.isNaN(endDate.getTime())) endDate = now;

  let startDate = new Date(req.query.startDate);
  if (Number.isNaN(startDate.getTime())) {
    startDate = new Date(endDate.getTime() - defaultDays * 24 * 60 * 60 * 1000);
  }
  return { startDate: getStartOfDay(startDate), endDate: getEndOfDay(endDate) };
}

const adminController = {
  /* ---------------------------------------------------------------- */
  async getOverviewStats(req, res, next) {
    try {
      const now = new Date();
      const lastMonthRef = new Date(new Date().setMonth(now.getMonth() - 1));
      const lastMonthStart = getStartOfMonth(lastMonthRef);
      const lastMonthEnd = getEndOfMonth(lastMonthRef);

      const [
        totalLeads,
        todayLeads,
        thisWeekLeads,
        thisMonthLeads,
        lastMonthLeads,
        pipelineGroups,
        closedWonLeads,
        totalActivities,
        thisWeekActivities,
        activitiesByTypeGroups,
        totalFollowUps,
        pendingFollowUps,
        overdueFollowUps,
        dueTodayFollowUps,
        totalEmployees,
        activeUsers,
      ] = await Promise.all([
        prisma.lead.count(),
        prisma.lead.count({
          where: { createdAt: { gte: getStartOfDay(now), lte: getEndOfDay(now) } },
        }),
        prisma.lead.count({ where: { createdAt: { gte: getStartOfWeek(now) } } }),
        prisma.lead.count({ where: { createdAt: { gte: getStartOfMonth(now) } } }),
        prisma.lead.count({
          where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
        }),
        prisma.lead.groupBy({ by: ['status'], _count: { status: true } }),
        prisma.lead.findMany({
          where: { status: 'CLOSED_WON' },
          select: { createdAt: true, updatedAt: true },
        }),
        prisma.activity.count(),
        prisma.activity.count({ where: { createdAt: { gte: getStartOfWeek(now) } } }),
        prisma.activity.groupBy({ by: ['type'], _count: { type: true } }),
        prisma.followUp.count(),
        prisma.followUp.count({ where: { done: false } }),
        prisma.followUp.count({ where: { done: false, scheduledAt: { lt: now } } }),
        prisma.followUp.count({
          where: {
            done: false,
            scheduledAt: { gte: getStartOfDay(now), lte: getEndOfDay(now) },
          },
        }),
        prisma.user.count(),
        prisma.activity.findMany({
          where: { createdAt: { gte: getStartOfWeek(now) } },
          select: { userId: true },
          distinct: ['userId'],
        }),
      ]);

      const growthRate =
        lastMonthLeads === 0
          ? 100
          : round2(((thisMonthLeads - lastMonthLeads) / lastMonthLeads) * 100);

      const pipeline = zeroMap(ALL_STATUSES);
      pipelineGroups.forEach((g) => {
        pipeline[g.status] = g._count.status;
      });

      const closedWon = pipeline.CLOSED_WON || 0;
      const closedLost = pipeline.CLOSED_LOST || 0;
      const conversionRate = totalLeads === 0 ? 0 : round2((closedWon / totalLeads) * 100);

      let avgDaysToClose = 0;
      if (closedWonLeads.length > 0) {
        const totalDays = closedWonLeads.reduce(
          (sum, lead) => sum + getDaysBetween(lead.createdAt, lead.updatedAt),
          0
        );
        avgDaysToClose = parseFloat((totalDays / closedWonLeads.length).toFixed(1));
      }

      const byType = zeroMap(ALL_ACTIVITY_TYPES);
      activitiesByTypeGroups.forEach((g) => {
        byType[g.type] = g._count.type;
      });

      return apiResponse.success(res, {
        leads: {
          total: totalLeads,
          today: todayLeads,
          thisWeek: thisWeekLeads,
          thisMonth: thisMonthLeads,
          growthRate,
        },
        conversions: { closedWon, closedLost, conversionRate, avgDaysToClose },
        pipeline,
        activities: { total: totalActivities, thisWeek: thisWeekActivities, byType },
        followUps: {
          total: totalFollowUps,
          pending: pendingFollowUps,
          overdue: overdueFollowUps,
          dueToday: dueTodayFollowUps,
        },
        team: { totalEmployees, activeThisWeek: activeUsers.length },
      });
    } catch (err) {
      next(err);
    }
  },

  /* ---------------------------------------------------------------- */
  async getDailyReport(req, res, next) {
    try {
      const { startDate, endDate } = parseRange(req, 30);
      const dateKeys = generateDateRange(startDate, endDate);

      // Batch fetch everything in range, group in JS.
      const [createdLeads, closedLeads, activities, followUpsCreated, followUpsCompleted] =
        await Promise.all([
          prisma.lead.findMany({
            where: { createdAt: { gte: startDate, lte: endDate } },
            select: { createdAt: true },
          }),
          prisma.lead.findMany({
            where: {
              status: { in: ['CLOSED_WON', 'CLOSED_LOST'] },
              updatedAt: { gte: startDate, lte: endDate },
            },
            select: { status: true, updatedAt: true },
          }),
          prisma.activity.findMany({
            where: { createdAt: { gte: startDate, lte: endDate } },
            select: { type: true, createdAt: true },
          }),
          prisma.followUp.findMany({
            where: { createdAt: { gte: startDate, lte: endDate } },
            select: { createdAt: true },
          }),
          prisma.followUp.findMany({
            where: { done: true, updatedAt: { gte: startDate, lte: endDate } },
            select: { updatedAt: true },
          }),
        ]);

      const blank = () => ({
        leadsCreated: 0,
        activitiesLogged: 0,
        followUpsScheduled: 0,
        followUpsCompleted: 0,
        statusChanges: 0,
        closedWon: 0,
        closedLost: 0,
      });
      const map = {};
      dateKeys.forEach((k) => {
        map[k] = blank();
      });

      const bump = (date, field, amount = 1) => {
        const k = dayKey(date);
        if (map[k]) map[k][field] += amount;
      };

      createdLeads.forEach((l) => bump(l.createdAt, 'leadsCreated'));
      closedLeads.forEach((l) => {
        bump(l.updatedAt, l.status === 'CLOSED_WON' ? 'closedWon' : 'closedLost');
      });
      activities.forEach((a) => {
        bump(a.createdAt, 'activitiesLogged');
        if (a.type === 'STATUS_CHANGE') bump(a.createdAt, 'statusChanges');
      });
      followUpsCreated.forEach((f) => bump(f.createdAt, 'followUpsScheduled'));
      followUpsCompleted.forEach((f) => bump(f.updatedAt, 'followUpsCompleted'));

      const daily = dateKeys.map((date) => ({ date, ...map[date] }));
      const totals = daily.reduce(
        (acc, d) => ({
          leadsCreated: acc.leadsCreated + d.leadsCreated,
          activitiesLogged: acc.activitiesLogged + d.activitiesLogged,
          closedWon: acc.closedWon + d.closedWon,
          closedLost: acc.closedLost + d.closedLost,
        }),
        { leadsCreated: 0, activitiesLogged: 0, closedWon: 0, closedLost: 0 }
      );

      return apiResponse.success(res, {
        period: { startDate, endDate },
        daily,
        totals,
      });
    } catch (err) {
      next(err);
    }
  },

  /* ---------------------------------------------------------------- */
  async getWeeklyReport(req, res, next) {
    try {
      const weeks = Math.min(104, Math.max(1, parseInt(req.query.weeks, 10) || 12));
      const now = new Date();

      // Build week buckets oldest -> newest.
      const buckets = [];
      for (let i = weeks - 1; i >= 0; i--) {
        const ref = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const weekStart = getStartOfWeek(ref);
        const weekEnd = getEndOfWeek(ref);
        buckets.push({
          weekStart,
          weekEnd,
          weekNumber: getWeekNumber(weekStart),
          leadsCreated: 0,
          closedWon: 0,
          closedLost: 0,
          activitiesLogged: 0,
        });
      }
      const earliest = buckets[0].weekStart;

      const [leads, activities] = await Promise.all([
        prisma.lead.findMany({
          where: { createdAt: { gte: earliest } },
          select: { createdAt: true, status: true },
        }),
        prisma.activity.findMany({
          where: { createdAt: { gte: earliest } },
          select: { createdAt: true },
        }),
      ]);

      const findBucket = (date) => {
        const t = new Date(date).getTime();
        return buckets.find((b) => t >= b.weekStart.getTime() && t <= b.weekEnd.getTime());
      };

      leads.forEach((l) => {
        const b = findBucket(l.createdAt);
        if (!b) return;
        b.leadsCreated += 1;
        if (l.status === 'CLOSED_WON') b.closedWon += 1;
        if (l.status === 'CLOSED_LOST') b.closedLost += 1;
      });
      activities.forEach((a) => {
        const b = findBucket(a.createdAt);
        if (b) b.activitiesLogged += 1;
      });

      const weekly = buckets.map((b) => ({
        weekStart: b.weekStart,
        weekEnd: b.weekEnd,
        weekNumber: b.weekNumber,
        leadsCreated: b.leadsCreated,
        closedWon: b.closedWon,
        closedLost: b.closedLost,
        activitiesLogged: b.activitiesLogged,
        conversionRate: b.leadsCreated === 0 ? 0 : round2((b.closedWon / b.leadsCreated) * 100),
      }));

      return apiResponse.success(res, { weekly });
    } catch (err) {
      next(err);
    }
  },

  /* ---------------------------------------------------------------- */
  async getMonthlyReport(req, res, next) {
    try {
      const months = Math.min(36, Math.max(1, parseInt(req.query.months, 10) || 12));
      const now = new Date();

      const buckets = [];
      for (let i = months - 1; i >= 0; i--) {
        const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.push({
          key: `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`,
          month: formatMonthYear(ref),
          year: ref.getFullYear(),
          monthNumber: ref.getMonth() + 1,
          start: getStartOfMonth(ref),
          end: getEndOfMonth(ref),
          leadsCreated: 0,
          closedWon: 0,
          closedLost: 0,
          activitiesLogged: 0,
          wonByEmployee: {},
        });
      }
      const earliest = buckets[0].start;

      const [leads, activities, closedWonLeads, users] = await Promise.all([
        prisma.lead.findMany({
          where: { createdAt: { gte: earliest } },
          select: { createdAt: true, status: true },
        }),
        prisma.activity.findMany({
          where: { createdAt: { gte: earliest } },
          select: { createdAt: true },
        }),
        prisma.lead.findMany({
          where: { status: 'CLOSED_WON', updatedAt: { gte: earliest }, assignedToId: { not: null } },
          select: { updatedAt: true, assignedToId: true },
        }),
        prisma.user.findMany({ select: { id: true, name: true } }),
      ]);
      const userName = {};
      users.forEach((u) => {
        userName[u.id] = u.name;
      });

      const monthKey = (date) => {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      };
      const bucketByKey = {};
      buckets.forEach((b) => {
        bucketByKey[b.key] = b;
      });

      leads.forEach((l) => {
        const b = bucketByKey[monthKey(l.createdAt)];
        if (!b) return;
        b.leadsCreated += 1;
        if (l.status === 'CLOSED_WON') b.closedWon += 1;
        if (l.status === 'CLOSED_LOST') b.closedLost += 1;
      });
      activities.forEach((a) => {
        const b = bucketByKey[monthKey(a.createdAt)];
        if (b) b.activitiesLogged += 1;
      });
      closedWonLeads.forEach((l) => {
        const b = bucketByKey[monthKey(l.updatedAt)];
        if (!b) return;
        b.wonByEmployee[l.assignedToId] = (b.wonByEmployee[l.assignedToId] || 0) + 1;
      });

      const monthly = buckets.map((b) => {
        let topEmployee = null;
        const entries = Object.entries(b.wonByEmployee);
        if (entries.length > 0) {
          const [empId, count] = entries.sort((a, c) => c[1] - a[1])[0];
          topEmployee = { name: userName[empId] || 'Unknown', closedWon: count };
        }
        return {
          month: b.month,
          year: b.year,
          monthNumber: b.monthNumber,
          leadsCreated: b.leadsCreated,
          closedWon: b.closedWon,
          closedLost: b.closedLost,
          activitiesLogged: b.activitiesLogged,
          conversionRate: b.leadsCreated === 0 ? 0 : round2((b.closedWon / b.leadsCreated) * 100),
          topEmployee,
        };
      });

      return apiResponse.success(res, { monthly });
    } catch (err) {
      next(err);
    }
  },

  /* ---------------------------------------------------------------- */
  async getTeamPerformance(req, res, next) {
    try {
      const { startDate, endDate } = parseRange(req, 30);
      const now = new Date();

      const employees = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true },
      });

      const team = await Promise.all(
        employees.map(async (emp) => {
          const [
            assigned,
            active,
            closedWon,
            closedLost,
            activityGroups,
            followUpsScheduled,
            followUpsCompleted,
            followUpsOverdue,
          ] = await Promise.all([
            prisma.lead.count({ where: { assignedToId: emp.id } }),
            prisma.lead.count({
              where: {
                assignedToId: emp.id,
                status: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
              },
            }),
            prisma.lead.count({ where: { assignedToId: emp.id, status: 'CLOSED_WON' } }),
            prisma.lead.count({ where: { assignedToId: emp.id, status: 'CLOSED_LOST' } }),
            prisma.activity.groupBy({
              by: ['type'],
              where: { userId: emp.id, createdAt: { gte: startDate, lte: endDate } },
              _count: { type: true },
            }),
            prisma.followUp.count({
              where: { userId: emp.id, createdAt: { gte: startDate, lte: endDate } },
            }),
            prisma.followUp.count({
              where: { userId: emp.id, done: true, updatedAt: { gte: startDate, lte: endDate } },
            }),
            prisma.followUp.count({
              where: { userId: emp.id, done: false, scheduledAt: { lt: now } },
            }),
          ]);

          const typeCounts = zeroMap(ALL_ACTIVITY_TYPES);
          activityGroups.forEach((g) => {
            typeCounts[g.type] = g._count.type;
          });
          const totalActivities = Object.values(typeCounts).reduce((a, b) => a + b, 0);

          const conversionRate = assigned > 0 ? round2((closedWon / assigned) * 100) : 0;
          const score = Math.round(
            Math.min(100, closedWon * 40 + totalActivities * 0.5 + followUpsCompleted * 10)
          );

          return {
            employee: { id: emp.id, name: emp.name, email: emp.email, role: emp.role },
            leads: { assigned, active, closedWon, closedLost, conversionRate },
            activities: {
              total: totalActivities,
              calls: typeCounts.CALL,
              emails: typeCounts.EMAIL,
              meetings: typeCounts.MEETING,
              notes: typeCounts.NOTE,
            },
            followUps: {
              scheduled: followUpsScheduled,
              completed: followUpsCompleted,
              overdue: followUpsOverdue,
            },
            score,
          };
        })
      );

      let topPerformer = null;
      team.forEach((t) => {
        if (!topPerformer || t.score > topPerformer.score) {
          topPerformer = { employee: t.employee, score: t.score };
        }
      });

      return apiResponse.success(res, {
        period: { startDate, endDate },
        team,
        topPerformer,
      });
    } catch (err) {
      next(err);
    }
  },

  /* ---------------------------------------------------------------- */
  async getLeadSourceAnalytics(req, res, next) {
    try {
      // Sources default to all-time unless an explicit range is provided.
      const hasRange = req.query.startDate || req.query.endDate;
      const { startDate, endDate } = parseRange(req, 3650);
      const rangeWhere = hasRange ? { createdAt: { gte: startDate, lte: endDate } } : {};

      const SOURCES = ['AI_DISCOVERED', 'MANUAL', 'CSV_IMPORT'];

      // Per-source totals + closed won, batched.
      const sourceCounts = await Promise.all(
        SOURCES.flatMap((source) => [
          prisma.lead.count({ where: { ...rangeWhere, source } }),
          prisma.lead.count({ where: { ...rangeWhere, source, status: 'CLOSED_WON' } }),
        ])
      );
      const bySource = {};
      SOURCES.forEach((source, i) => {
        const total = sourceCounts[i * 2];
        const closedWon = sourceCounts[i * 2 + 1];
        bySource[source] = {
          total,
          closedWon,
          conversionRate: total === 0 ? 0 : round2((closedWon / total) * 100),
        };
      });

      // Industry + country grouping, plus closed-won leads (one fetch) for won counts.
      const [industryGroups, countryGroups, closedWonLeads, scored] = await Promise.all([
        prisma.lead.groupBy({
          by: ['industry'],
          where: { ...rangeWhere, industry: { not: null } },
          _count: { industry: true },
          orderBy: { _count: { industry: 'desc' } },
          take: 10,
        }),
        prisma.lead.groupBy({
          by: ['country'],
          where: { ...rangeWhere, country: { not: null } },
          _count: { country: true },
          orderBy: { _count: { country: 'desc' } },
          take: 10,
        }),
        prisma.lead.findMany({
          where: { ...rangeWhere, status: 'CLOSED_WON' },
          select: { industry: true, country: true },
        }),
        prisma.lead.findMany({
          where: { aiScore: { not: null } },
          select: { aiScore: true },
        }),
      ]);

      const wonByIndustry = {};
      const wonByCountry = {};
      closedWonLeads.forEach((l) => {
        if (l.industry) wonByIndustry[l.industry] = (wonByIndustry[l.industry] || 0) + 1;
        if (l.country) wonByCountry[l.country] = (wonByCountry[l.country] || 0) + 1;
      });

      const byIndustry = industryGroups.map((g) => {
        const total = g._count.industry;
        const closedWon = wonByIndustry[g.industry] || 0;
        return {
          industry: g.industry,
          total,
          closedWon,
          conversionRate: total === 0 ? 0 : round2((closedWon / total) * 100),
        };
      });

      const byCountry = countryGroups.map((g) => ({
        country: g.country,
        total: g._count.country,
        closedWon: wonByCountry[g.country] || 0,
      }));

      let avgScore = 0;
      let highQuality = 0;
      let medium = 0;
      let low = 0;
      if (scored.length > 0) {
        let sum = 0;
        scored.forEach((s) => {
          sum += s.aiScore;
          if (s.aiScore >= 7) highQuality += 1;
          else if (s.aiScore >= 4) medium += 1;
          else low += 1;
        });
        avgScore = parseFloat((sum / scored.length).toFixed(1));
      }

      return apiResponse.success(res, {
        bySource,
        byIndustry,
        byCountry,
        aiScore: { avgScore, highQuality, medium, low },
      });
    } catch (err) {
      next(err);
    }
  },

  /* ---------------------------------------------------------------- */
  async getPipelineReport(req, res, next) {
    try {
      const now = new Date();

      const [statusGroups, totalLeads, topLeadsPerStatus] = await Promise.all([
        prisma.lead.groupBy({ by: ['status'], _count: { status: true } }),
        prisma.lead.count(),
        Promise.all(
          ALL_STATUSES.map((status) =>
            prisma.lead.findMany({
              where: { status },
              include: { assignedTo: { select: { name: true } } },
              orderBy: { createdAt: 'desc' },
              take: 5,
            })
          )
        ),
      ]);

      const counts = zeroMap(ALL_STATUSES);
      statusGroups.forEach((g) => {
        counts[g.status] = g._count.status;
      });

      // Gather all sampled lead ids to find their latest STATUS_CHANGE in one query.
      const sampledLeadIds = [];
      topLeadsPerStatus.forEach((list) => list.forEach((l) => sampledLeadIds.push(l.id)));

      let latestStatusChange = {};
      if (sampledLeadIds.length > 0) {
        const statusActivities = await prisma.activity.findMany({
          where: { leadId: { in: sampledLeadIds }, type: 'STATUS_CHANGE' },
          select: { leadId: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        });
        statusActivities.forEach((a) => {
          if (!latestStatusChange[a.leadId]) latestStatusChange[a.leadId] = a.createdAt;
        });
      }

      const pipeline = ALL_STATUSES.map((status, idx) => {
        const list = topLeadsPerStatus[idx];
        const leads = list.map((l) => {
          const ref = latestStatusChange[l.id] || l.createdAt;
          return {
            id: l.id,
            companyName: l.companyName,
            status: l.status,
            assignedTo: l.assignedTo ? l.assignedTo.name : null,
            aiScore: l.aiScore,
            createdAt: l.createdAt,
            daysInCurrentStatus: getDaysBetween(ref, now),
          };
        });
        const avgDaysInStage =
          leads.length > 0
            ? round2(leads.reduce((s, l) => s + l.daysInCurrentStatus, 0) / leads.length)
            : 0;
        const count = counts[status];
        return {
          status,
          label: STATUS_LABELS[status],
          count,
          percentage: totalLeads === 0 ? 0 : round2((count / totalLeads) * 100),
          avgDaysInStage,
          leads,
        };
      });

      const totalActive = ALL_STATUSES.filter(
        (s) => s !== 'CLOSED_WON' && s !== 'CLOSED_LOST'
      ).reduce((sum, s) => sum + counts[s], 0);

      let bottleneck = null;
      pipeline.forEach((p) => {
        if (p.status === 'CLOSED_WON' || p.status === 'CLOSED_LOST') return;
        const weight = p.count * p.avgDaysInStage;
        if (!bottleneck || weight > bottleneck.weight) {
          bottleneck = {
            status: p.status,
            count: p.count,
            avgDaysInStage: p.avgDaysInStage,
            weight,
          };
        }
      });
      if (bottleneck) delete bottleneck.weight;

      return apiResponse.success(res, { pipeline, totalActive, bottleneck });
    } catch (err) {
      next(err);
    }
  },

  /* ---------------------------------------------------------------- */
  async getFollowUpReport(req, res, next) {
    try {
      const now = new Date();
      const todayStart = getStartOfDay(now);
      const todayEnd = getEndOfDay(now);
      const tomorrow = new Date(now.getTime() + 86400000);
      const tomorrowStart = getStartOfDay(tomorrow);
      const tomorrowEnd = getEndOfDay(tomorrow);

      const [
        total,
        pending,
        completed,
        overdue,
        dueToday,
        dueTomorrow,
        overdueItems,
        allFollowUps,
        employees,
      ] = await Promise.all([
        prisma.followUp.count(),
        prisma.followUp.count({ where: { done: false } }),
        prisma.followUp.count({ where: { done: true } }),
        prisma.followUp.count({ where: { done: false, scheduledAt: { lt: now } } }),
        prisma.followUp.count({
          where: { done: false, scheduledAt: { gte: todayStart, lte: todayEnd } },
        }),
        prisma.followUp.count({
          where: { done: false, scheduledAt: { gte: tomorrowStart, lte: tomorrowEnd } },
        }),
        prisma.followUp.findMany({
          where: { done: false, scheduledAt: { lt: now } },
          include: {
            lead: { select: { id: true, companyName: true, status: true } },
            user: { select: { name: true, email: true } },
          },
          orderBy: { scheduledAt: 'asc' },
          take: 20,
        }),
        prisma.followUp.findMany({ select: { userId: true, done: true, scheduledAt: true } }),
        prisma.user.findMany({ select: { id: true, name: true } }),
      ]);

      const completionRate = total === 0 ? 0 : round2((completed / total) * 100);

      const overdueLeads = overdueItems.map((item) => ({
        lead: item.lead,
        assignedTo: item.user,
        followUp: { scheduledAt: item.scheduledAt, note: item.note },
        daysOverdue: getDaysBetween(item.scheduledAt, now),
      }));

      // Per-employee breakdown computed from one fetch.
      const statsByUser = {};
      employees.forEach((e) => {
        statsByUser[e.id] = { pending: 0, overdue: 0, completed: 0 };
      });
      allFollowUps.forEach((f) => {
        const s = statsByUser[f.userId];
        if (!s) return;
        if (f.done) {
          s.completed += 1;
        } else {
          s.pending += 1;
          if (new Date(f.scheduledAt) < now) s.overdue += 1;
        }
      });
      const byEmployee = employees.map((e) => ({
        employee: { name: e.name },
        pending: statsByUser[e.id].pending,
        overdue: statsByUser[e.id].overdue,
        completed: statsByUser[e.id].completed,
      }));

      return apiResponse.success(res, {
        overview: { total, pending, completed, overdue, dueToday, dueTomorrow, completionRate },
        overdueLeads,
        byEmployee,
      });
    } catch (err) {
      next(err);
    }
  },

  /* ---------------------------------------------------------------- */
  async getRecentActivity(req, res, next) {
    try {
      let limit = parseInt(req.query.limit, 10);
      if (Number.isNaN(limit)) limit = 50;
      limit = Math.min(100, Math.max(1, limit));

      const activities = await prisma.activity.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true } },
          lead: { select: { id: true, companyName: true, status: true } },
        },
      });

      return apiResponse.success(res, activities);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = adminController;
