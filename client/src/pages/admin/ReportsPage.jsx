import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ArrowUpDown, Info } from 'lucide-react';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import ErrorState from '../../components/ui/ErrorState';
import { leadsAPI, activitiesAPI } from '../../services/api';

const chartTooltip = {
  contentStyle: { background: '#1a1a24', border: '1px solid #2e2e3e', borderRadius: 8, color: '#f1f1f3' },
  labelStyle: { color: '#9898a8' },
};

const TABS = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const fmtDay = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const fmtMonth = (d) => d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

function weekStart(d) {
  const x = startOfDay(new Date(d));
  x.setDate(x.getDate() - x.getDay());
  return x;
}

// Sortable table component.
function SortableTable({ columns, rows }) {
  const [sort, setSort] = useState({ key: columns[0].key, dir: 'asc' });
  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, sort]);

  const toggle = (key) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-text-secondary">
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-3 font-medium">
                <button onClick={() => toggle(c.key)} className="inline-flex items-center gap-1 hover:text-text">
                  {c.label}
                  <ArrowUpDown size={12} />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3 text-text">
                  {c.format ? c.format(row[c.key]) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ReportsPage() {
  const [tab, setTab] = useState('daily');
  const [weeks, setWeeks] = useState(8);
  const [months, setMonths] = useState(6);

  const leadsQuery = useQuery({
    queryKey: ['leads', { page: 1, limit: 100, reports: true }],
    queryFn: () => leadsAPI.getAll({ page: 1, limit: 100 }),
    select: (res) => res.data?.leads || [],
  });

  const activitiesQuery = useQuery({
    queryKey: ['activities', 'all', 'reports'],
    queryFn: () => activitiesAPI.getAll({ limit: 100 }),
    select: (res) => res.data?.data || [],
  });

  const leads = leadsQuery.data || [];
  const activities = activitiesQuery.data || [];

  // ---- Daily (last 30 days) ----
  const daily = useMemo(() => {
    const map = {};
    const order = [];
    for (let i = 29; i >= 0; i--) {
      const d = startOfDay(new Date());
      d.setDate(d.getDate() - i);
      const k = fmtDay(d);
      map[k] = { date: k, leads: 0, activities: 0, closedWon: 0 };
      order.push(k);
    }
    leads.forEach((l) => {
      const k = fmtDay(startOfDay(new Date(l.createdAt)));
      if (map[k]) {
        map[k].leads += 1;
        if (l.status === 'CLOSED_WON') map[k].closedWon += 1;
      }
    });
    activities.forEach((a) => {
      const k = fmtDay(startOfDay(new Date(a.createdAt)));
      if (map[k]) map[k].activities += 1;
    });
    return order.map((k) => map[k]);
  }, [leads, activities]);

  // ---- Weekly ----
  const weekly = useMemo(() => {
    const map = {};
    const order = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const ws = weekStart(new Date());
      ws.setDate(ws.getDate() - i * 7);
      const k = fmtDay(ws);
      map[k] = { week: k, leads: 0, closedWon: 0 };
      order.push(k);
    }
    leads.forEach((l) => {
      const k = fmtDay(weekStart(new Date(l.createdAt)));
      if (map[k]) {
        map[k].leads += 1;
        if (l.status === 'CLOSED_WON') map[k].closedWon += 1;
      }
    });
    return order.map((k) => ({
      ...map[k],
      conversion: map[k].leads ? Math.round((map[k].closedWon / map[k].leads) * 100) : 0,
    }));
  }, [leads, weeks]);

  // ---- Monthly ----
  const monthly = useMemo(() => {
    const map = {};
    const order = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i, 1);
      const k = fmtMonth(d);
      map[k] = { month: k, leads: 0, closedWon: 0 };
      order.push(k);
    }
    leads.forEach((l) => {
      const k = fmtMonth(new Date(l.createdAt));
      if (map[k]) {
        map[k].leads += 1;
        if (l.status === 'CLOSED_WON') map[k].closedWon += 1;
      }
    });
    return order.map((k) => ({
      ...map[k],
      conversion: map[k].leads ? Math.round((map[k].closedWon / map[k].leads) * 100) : 0,
    }));
  }, [leads, months]);

  if (leadsQuery.isLoading) return <SkeletonLoader type="card" rows={3} />;
  if (leadsQuery.isError) return <ErrorState error={leadsQuery.error} onRetry={leadsQuery.refetch} />;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-text">Reports</h2>

      <div className="flex items-center gap-2 rounded-lg bg-info/10 border border-info/30 px-4 py-3 text-sm text-info">
        <Info size={16} className="shrink-0" />
        Reports are computed from the 100 most recent leads and activities.
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key ? 'border-primary text-text' : 'border-transparent text-text-secondary hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'daily' && (
        <div className="space-y-6">
          <Card>
            <h3 className="font-semibold text-text mb-4">Leads Created (last 30 days)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={daily} margin={{ top: 4, right: 12, bottom: 4, left: -18 }}>
                  <defs>
                    <linearGradient id="leadFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2e2e3e" />
                  <XAxis dataKey="date" tick={{ fill: '#9898a8', fontSize: 10 }} interval={4} />
                  <YAxis allowDecimals={false} tick={{ fill: '#9898a8', fontSize: 11 }} />
                  <Tooltip {...chartTooltip} />
                  <Area type="monotone" dataKey="leads" stroke="#6366f1" fill="url(#leadFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card>
            <h3 className="font-semibold text-text mb-4">Activities Logged (last 30 days)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily} margin={{ top: 4, right: 12, bottom: 4, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2e2e3e" />
                  <XAxis dataKey="date" tick={{ fill: '#9898a8', fontSize: 10 }} interval={4} />
                  <YAxis allowDecimals={false} tick={{ fill: '#9898a8', fontSize: 11 }} />
                  <Tooltip {...chartTooltip} cursor={{ fill: '#22222f' }} />
                  <Bar dataKey="activities" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card padding="p-0">
            <SortableTable
              columns={[
                { key: 'date', label: 'Date' },
                { key: 'leads', label: 'Leads' },
                { key: 'activities', label: 'Activities' },
                { key: 'closedWon', label: 'Closed Won' },
              ]}
              rows={daily}
            />
          </Card>
        </div>
      )}

      {tab === 'weekly' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Select
              value={String(weeks)}
              onChange={(e) => setWeeks(Number(e.target.value))}
              options={[4, 8, 12, 24].map((w) => ({ value: String(w), label: `${w} weeks` }))}
            />
          </div>
          <Card>
            <h3 className="font-semibold text-text mb-4">Leads & Closed Won per Week</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={weekly} margin={{ top: 4, right: 12, bottom: 4, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2e2e3e" />
                  <XAxis dataKey="week" tick={{ fill: '#9898a8', fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fill: '#9898a8', fontSize: 11 }} />
                  <Tooltip {...chartTooltip} cursor={{ fill: '#22222f' }} />
                  <Bar dataKey="leads" fill="#6366f1" radius={[4, 4, 0, 0]} name="Leads" />
                  <Line type="monotone" dataKey="closedWon" stroke="#22c55e" strokeWidth={2} name="Closed Won" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card padding="p-0">
            <SortableTable
              columns={[
                { key: 'week', label: 'Week of' },
                { key: 'leads', label: 'Leads' },
                { key: 'closedWon', label: 'Closed Won' },
                { key: 'conversion', label: 'Conversion', format: (v) => `${v}%` },
              ]}
              rows={weekly}
            />
          </Card>
        </div>
      )}

      {tab === 'monthly' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Select
              value={String(months)}
              onChange={(e) => setMonths(Number(e.target.value))}
              options={[3, 6, 12].map((m) => ({ value: String(m), label: `${m} months` }))}
            />
          </div>
          <Card>
            <h3 className="font-semibold text-text mb-4">Leads per Month</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 4, right: 12, bottom: 4, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2e2e3e" />
                  <XAxis dataKey="month" tick={{ fill: '#9898a8', fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fill: '#9898a8', fontSize: 11 }} />
                  <Tooltip {...chartTooltip} cursor={{ fill: '#22222f' }} />
                  <Bar dataKey="leads" fill="#6366f1" radius={[4, 4, 0, 0]} name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card padding="p-0">
            <SortableTable
              columns={[
                { key: 'month', label: 'Month' },
                { key: 'leads', label: 'Leads' },
                { key: 'closedWon', label: 'Closed Won' },
                { key: 'conversion', label: 'Conversion', format: (v) => `${v}%` },
              ]}
              rows={monthly}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
