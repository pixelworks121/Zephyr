import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Users, Bell, AlertTriangle, Trophy, Check, ArrowRight } from 'lucide-react';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import LeadCard from '../../components/leads/LeadCard';
import ActivityTypeIcon from '../../components/activities/ActivityTypeIcon';
import { leadsAPI, followUpsAPI, activitiesAPI, getErrorMessage } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, formatDateTime, timeAgo, daysOverdue } from '../../utils/formatDate';
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  statusCategoryColor,
} from '../../utils/constants';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const chartTooltip = {
  contentStyle: {
    background: '#1a1a24',
    border: '1px solid #2e2e3e',
    borderRadius: 8,
    color: '#f1f1f3',
  },
  labelStyle: { color: '#9898a8' },
};

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const statsQuery = useQuery({
    queryKey: ['lead-stats'],
    queryFn: () => leadsAPI.getStats(),
    select: (res) => res.data,
  });

  const followQuery = useQuery({
    queryKey: ['followups', 'me', 'upcoming'],
    queryFn: () => followUpsAPI.getMine({ upcoming: true, limit: 5 }),
    select: (res) => res.data,
  });

  const leadsQuery = useQuery({
    queryKey: ['leads', { page: 1, limit: 5 }],
    queryFn: () => leadsAPI.getAll({ page: 1, limit: 5 }),
    select: (res) => res.data,
  });

  const activityQuery = useQuery({
    queryKey: ['activities', 'me', 'recent'],
    queryFn: () => activitiesAPI.getMine({ limit: 10 }),
    select: (res) => res.data,
  });

  const markDone = useMutation({
    mutationFn: (id) => followUpsAPI.markDone(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
    },
    onError: (err) => alert(getErrorMessage(err)),
  });

  const stats = statsQuery.data;
  const summary = followQuery.data?.summary;
  const upcoming = followQuery.data?.data || [];
  const recentLeads = leadsQuery.data?.leads || [];
  const activities = activityQuery.data?.data || [];

  const pipelineData = stats
    ? LEAD_STATUSES.map((s) => ({
        status: LEAD_STATUS_LABELS[s],
        key: s,
        count: stats.byStatus?.[s] || 0,
      })).filter((d) => d.count > 0)
    : [];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-bold text-text">
          {greeting()}, {user?.name?.split(' ')[0] || 'there'}
        </h2>
        <p className="text-sm text-text-secondary">{formatDate(new Date())}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="My Assigned Leads" value={stats ? stats.total : '—'} icon={Users} />
        <StatCard
          label="Due Today"
          value={summary ? summary.dueToday : '—'}
          icon={Bell}
          accent={summary?.dueToday > 0 ? 'danger' : 'text'}
        />
        <StatCard
          label="Overdue"
          value={summary ? summary.overdue : '—'}
          icon={AlertTriangle}
          accent={summary?.overdue > 0 ? 'danger' : 'text'}
        />
        <StatCard
          label="Closed Won"
          value={stats ? stats.byStatus?.CLOSED_WON ?? 0 : '—'}
          icon={Trophy}
          accent="success"
        />
      </div>

      {/* Pipeline */}
      <Card>
        <h3 className="font-semibold text-text mb-4">My Pipeline</h3>
        {statsQuery.isLoading ? (
          <SkeletonLoader type="list" rows={1} />
        ) : pipelineData.length === 0 ? (
          <p className="text-sm text-text-secondary">No leads in your pipeline yet.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                <XAxis
                  dataKey="status"
                  tick={{ fill: '#9898a8', fontSize: 11 }}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={70}
                />
                <YAxis allowDecimals={false} tick={{ fill: '#9898a8', fontSize: 11 }} />
                <Tooltip {...chartTooltip} cursor={{ fill: '#22222f' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {pipelineData.map((d) => (
                    <Cell key={d.key} fill={statusCategoryColor(d.key)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My leads */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text">My Leads</h3>
            <Link to="/leads" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {leadsQuery.isLoading ? (
            <SkeletonLoader type="list" rows={3} />
          ) : leadsQuery.isError ? (
            <ErrorState error={leadsQuery.error} onRetry={leadsQuery.refetch} />
          ) : recentLeads.length === 0 ? (
            <EmptyState icon={Users} title="No leads yet" message="Leads assigned to you appear here." />
          ) : (
            <div className="space-y-3">
              {recentLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>
          )}
        </Card>

        {/* Upcoming follow-ups */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text">Upcoming Follow-Ups</h3>
            <Link to="/followups" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {followQuery.isLoading ? (
            <SkeletonLoader type="list" rows={3} />
          ) : followQuery.isError ? (
            <ErrorState error={followQuery.error} onRetry={followQuery.refetch} />
          ) : upcoming.length === 0 ? (
            <EmptyState icon={Bell} title="All caught up" message="No upcoming follow-ups." />
          ) : (
            <div className="space-y-3">
              {upcoming.map((fu) => {
                const overdue = daysOverdue(fu.scheduledAt) > 0;
                return (
                  <div
                    key={fu.id}
                    className={`rounded-lg border p-3 ${
                      overdue ? 'border-danger/40 bg-danger/10' : 'border-border bg-surface2'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          to={`/leads/${fu.lead?.id}`}
                          className="text-sm font-medium text-text hover:text-primary truncate block"
                        >
                          {fu.lead?.companyName || 'Lead'}
                        </Link>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {formatDateTime(fu.scheduledAt)}
                        </p>
                        {fu.note && <p className="text-xs text-text-secondary mt-1 truncate">{fu.note}</p>}
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => markDone.mutate(fu.id)}
                        loading={markDone.isPending && markDone.variables === fu.id}
                      >
                        <Check size={14} /> Done
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-text">My Recent Activity</h3>
          <Link to="/activities" className="text-xs text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight size={12} />
          </Link>
        </div>
        {activityQuery.isLoading ? (
          <SkeletonLoader type="list" rows={3} />
        ) : activities.length === 0 ? (
          <EmptyState title="No activity yet" message="Your logged activities appear here." />
        ) : (
          <div className="space-y-3">
            {activities.map((a) => (
              <div key={a.id} className="flex gap-3">
                <ActivityTypeIcon type={a.type} withBg />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text break-words">{a.content}</p>
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
