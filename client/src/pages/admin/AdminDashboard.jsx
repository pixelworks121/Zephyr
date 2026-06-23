import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Users, CalendarPlus, CalendarRange, Trophy, Percent, UserCheck, AlertTriangle } from 'lucide-react';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import ActivityTypeIcon from '../../components/activities/ActivityTypeIcon';
import PipelineControlCard from '../../components/admin/PipelineControlCard';
import { leadsAPI, employeesAPI, followUpsAPI, activitiesAPI } from '../../services/api';
import { timeAgo } from '../../utils/formatDate';
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  LEAD_SOURCE_LABELS,
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPE_COLORS,
} from '../../utils/constants';

const SOURCE_COLORS = { AI_DISCOVERED: '#6366f1', MANUAL: '#22c55e', CSV_IMPORT: '#f59e0b' };

const chartTooltip = {
  contentStyle: { background: '#1a1a24', border: '1px solid #2e2e3e', borderRadius: 8, color: '#f1f1f3' },
  labelStyle: { color: '#9898a8' },
  itemStyle: { color: '#f1f1f3' },
};

function dayKey(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function AdminDashboard() {
  const statsQuery = useQuery({
    queryKey: ['lead-stats'],
    queryFn: () => leadsAPI.getStats(),
    select: (res) => res.data,
  });

  const employeesQuery = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesAPI.getAll(),
    select: (res) => res.data,
  });

  const followQuery = useQuery({
    queryKey: ['followups', 'all', 'summary'],
    queryFn: () => followUpsAPI.getAll({ limit: 1 }),
    select: (res) => res.data,
  });

  const activityQuery = useQuery({
    queryKey: ['activities', 'all', 'recent'],
    queryFn: () => activitiesAPI.getAll({ limit: 20 }),
    select: (res) => res.data,
  });

  const recentLeadsQuery = useQuery({
    queryKey: ['leads', { page: 1, limit: 100, forChart: true }],
    queryFn: () => leadsAPI.getAll({ page: 1, limit: 100 }),
    select: (res) => res.data?.leads || [],
  });

  if (statsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader type="card" rows={3} />
        <SkeletonLoader type="list" rows={3} />
      </div>
    );
  }
  if (statsQuery.isError) {
    return <ErrorState error={statsQuery.error} onRetry={statsQuery.refetch} />;
  }

  const stats = statsQuery.data;
  const employees = employeesQuery.data || [];
  const followSummary = followQuery.data?.summary;
  const activityByType = activityQuery.data?.summary?.totalByType || {};
  const recentActivities = activityQuery.data?.data || [];

  // Pipeline distribution
  const pipeline = Object.entries(stats.byStatus || {})
    .filter(([, v]) => v > 0)
    .map(([status, value]) => ({
      name: LEAD_STATUS_LABELS[status] || status,
      value,
      color: LEAD_STATUS_COLORS[status],
    }));

  // Sources
  const sources = Object.entries(stats.bySource || {})
    .filter(([, v]) => v > 0)
    .map(([src, value]) => ({ name: LEAD_SOURCE_LABELS[src] || src, value, color: SOURCE_COLORS[src] }));

  // Activity breakdown (exclude STATUS_CHANGE for clarity)
  const activityBars = Object.entries(activityByType)
    .filter(([t]) => t !== 'STATUS_CHANGE')
    .map(([t, value]) => ({ name: ACTIVITY_TYPE_LABELS[t] || t, value, color: ACTIVITY_TYPE_COLORS[t] }));

  // Leads over time (last 30 days, from recent leads sample)
  const days = [];
  const counts = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = dayKey(d);
    counts[k] = 0;
    days.push(k);
  }
  (recentLeadsQuery.data || []).forEach((l) => {
    const k = dayKey(l.createdAt);
    if (k in counts) counts[k] += 1;
  });
  const timeline = days.map((k) => ({ date: k, leads: counts[k] }));

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Total Leads" value={stats.total} icon={Users} />
        <StatCard label="This Week" value={stats.thisWeek} icon={CalendarPlus} accent="primary" />
        <StatCard label="This Month" value={stats.thisMonth} icon={CalendarRange} accent="info" />
        <StatCard label="Closed Won" value={stats.byStatus?.CLOSED_WON ?? 0} icon={Trophy} accent="success" />
        <StatCard label="Conversion" value={`${stats.conversionRate}%`} icon={Percent} accent="success" />
        <StatCard label="Team Members" value={employees.length} icon={UserCheck} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <h3 className="font-semibold text-text mb-4">Leads Over Time (30 days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline} margin={{ top: 4, right: 12, bottom: 4, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e2e3e" />
                <XAxis dataKey="date" tick={{ fill: '#9898a8', fontSize: 10 }} interval={4} />
                <YAxis allowDecimals={false} tick={{ fill: '#9898a8', fontSize: 11 }} />
                <Tooltip {...chartTooltip} />
                <Line type="monotone" dataKey="leads" stroke="#6366f1" strokeWidth={2} dot={false} name="Leads created" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-text-secondary mt-2">Based on the 100 most recent leads.</p>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="font-semibold text-text mb-4">Pipeline Distribution</h3>
          {pipeline.length === 0 ? (
            <EmptyState title="No leads" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pipeline} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {pipeline.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip {...chartTooltip} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#9898a8' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-text mb-4">Activity Breakdown</h3>
          {activityBars.length === 0 ? (
            <EmptyState title="No activity" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityBars} margin={{ top: 4, right: 8, bottom: 4, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2e2e3e" />
                  <XAxis dataKey="name" tick={{ fill: '#9898a8', fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fill: '#9898a8', fontSize: 11 }} />
                  <Tooltip {...chartTooltip} cursor={{ fill: '#22222f' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {activityBars.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold text-text mb-4">Lead Sources</h3>
          {sources.length === 0 ? (
            <EmptyState title="No leads" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sources} dataKey="value" nameKey="name" outerRadius={80} paddingAngle={2}>
                    {sources.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip {...chartTooltip} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#9898a8' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Pipeline & Follow-up health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PipelineControlCard />
        
        <Card>
          <h3 className="font-semibold text-text mb-4">Follow-Up Health</h3>
          {followQuery.isLoading ? (
            <SkeletonLoader type="list" rows={1} />
          ) : followSummary ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-text-secondary">Pending</p>
                  <p className="text-2xl font-bold text-info">{followSummary.pending}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Overdue</p>
                  <p className="text-2xl font-bold text-danger">{followSummary.overdue}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Due Today</p>
                  <p className="text-2xl font-bold text-warning">{followSummary.dueToday}</p>
                </div>
              </div>
              {followSummary.overdue > 0 && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-danger/10 border border-danger/30 px-4 py-3 text-sm text-danger">
                  <AlertTriangle size={16} />
                  {followSummary.overdue} follow-up(s) are overdue across your team.
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-text-secondary">No data.</p>
          )}
        </Card>
      </div>

      {/* Recent activity feed */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-text">Recent Activity</h3>
        </div>
        {activityQuery.isLoading ? (
          <SkeletonLoader type="list" rows={4} />
        ) : recentActivities.length === 0 ? (
          <EmptyState title="No activity yet" />
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {recentActivities.map((a) => (
              <div key={a.id} className="flex gap-3">
                <ActivityTypeIcon type={a.type} withBg />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text break-words">
                    <span className="font-medium">{a.user?.name || 'Someone'}</span> · {a.content}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {a.lead?.companyName && (
                      <Link to={`/leads/${a.lead.id}`} className="hover:text-primary">
                        {a.lead.companyName}
                      </Link>
                    )}{' '}
                    · {timeAgo(a.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
