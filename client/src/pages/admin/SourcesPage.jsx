import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Sparkles, Hand, FileSpreadsheet } from 'lucide-react';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import { leadsAPI } from '../../services/api';
import { LEAD_SOURCE_LABELS } from '../../utils/constants';
import { countryFlag } from '../../utils/flags';

const chartTooltip = {
  contentStyle: { background: '#1a1a24', border: '1px solid #2e2e3e', borderRadius: 8, color: '#f1f1f3' },
  labelStyle: { color: '#9898a8' },
};

const SOURCE_META = {
  AI_DISCOVERED: { icon: Sparkles, color: '#6366f1' },
  MANUAL: { icon: Hand, color: '#22c55e' },
  CSV_IMPORT: { icon: FileSpreadsheet, color: '#f59e0b' },
};

const SCORE_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

export default function SourcesPage() {
  const statsQuery = useQuery({
    queryKey: ['lead-stats'],
    queryFn: () => leadsAPI.getStats(),
    select: (res) => res.data,
  });

  const sampleQuery = useQuery({
    queryKey: ['leads', { page: 1, limit: 100, sources: true }],
    queryFn: () => leadsAPI.getAll({ page: 1, limit: 100 }),
    select: (res) => res.data?.leads || [],
  });

  if (statsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader type="card" rows={3} />
        <SkeletonLoader type="list" rows={2} />
      </div>
    );
  }
  if (statsQuery.isError) {
    return <ErrorState error={statsQuery.error} onRetry={statsQuery.refetch} />;
  }

  const stats = statsQuery.data;
  const sample = sampleQuery.data || [];

  // Per-source closed-won + avg score from sample
  const perSource = {};
  ['AI_DISCOVERED', 'MANUAL', 'CSV_IMPORT'].forEach((s) => {
    perSource[s] = { won: 0, scoreSum: 0, scoreCount: 0, sampleTotal: 0 };
  });
  sample.forEach((l) => {
    const s = perSource[l.source];
    if (!s) return;
    s.sampleTotal += 1;
    if (l.status === 'CLOSED_WON') s.won += 1;
    if (l.aiScore != null) {
      s.scoreSum += l.aiScore;
      s.scoreCount += 1;
    }
  });

  const sourceCards = ['AI_DISCOVERED', 'MANUAL', 'CSV_IMPORT'].map((s) => {
    const total = stats.bySource?.[s] || 0;
    const ps = perSource[s];
    const conv = ps.sampleTotal > 0 ? Math.round((ps.won / ps.sampleTotal) * 100) : 0;
    const avgScore = ps.scoreCount > 0 ? Math.round((ps.scoreSum / ps.scoreCount) * 10) / 10 : null;
    return { source: s, total, won: ps.won, conv, avgScore };
  });

  // Top industries from stats (accurate)
  const industries = Object.entries(stats.byIndustry || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  // Top countries from sample
  const countryMap = {};
  sample.forEach((l) => {
    const c = l.country || 'Unknown';
    countryMap[c] = (countryMap[c] || 0) + 1;
  });
  const countries = Object.entries(countryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  // AI score distribution from sample
  const buckets = { high: 0, medium: 0, low: 0 };
  sample.forEach((l) => {
    if (l.aiScore == null) return;
    if (l.aiScore >= 7) buckets.high += 1;
    else if (l.aiScore >= 4) buckets.medium += 1;
    else buckets.low += 1;
  });
  const scorePie = [
    { name: 'High (7-10)', value: buckets.high },
    { name: 'Medium (4-6)', value: buckets.medium },
    { name: 'Low (1-3)', value: buckets.low },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-text">Lead Sources</h2>

      {/* Source comparison cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sourceCards.map((c) => {
          const meta = SOURCE_META[c.source];
          const Icon = meta.icon;
          return (
            <Card key={c.source}>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${meta.color}26`, color: meta.color }}
                >
                  <Icon size={16} />
                </span>
                <h3 className="font-semibold text-text">{LEAD_SOURCE_LABELS[c.source]}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-text-secondary">Total Leads</p>
                  <p className="text-xl font-bold text-text">{c.total}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Closed Won*</p>
                  <p className="text-xl font-bold text-success">{c.won}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Conversion*</p>
                  <p className="text-xl font-bold text-text">{c.conv}%</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Avg Quality*</p>
                  <p className="text-xl font-bold" style={{ color: meta.color }}>
                    {c.avgScore == null ? '—' : c.avgScore}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-text-secondary -mt-3">
        * Closed-won, conversion and quality are computed from the 100 most recent leads.
      </p>

      {/* Industries + Countries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-text mb-4">Top Industries</h3>
          {industries.length === 0 ? (
            <EmptyState title="No data" />
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={industries} layout="vertical" margin={{ left: 40, right: 12 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fill: '#9898a8', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#9898a8', fontSize: 10 }} />
                  <Tooltip {...chartTooltip} cursor={{ fill: '#22222f' }} />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold text-text mb-4">Top Countries</h3>
          {countries.length === 0 ? (
            <EmptyState title="No data" />
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={countries} layout="vertical" margin={{ left: 40, right: 12 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fill: '#9898a8', fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fill: '#9898a8', fontSize: 10 }}
                    tickFormatter={(v) => `${countryFlag(v)}${v}`}
                  />
                  <Tooltip {...chartTooltip} cursor={{ fill: '#22222f' }} />
                  <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]} name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* AI score distribution */}
      <Card>
        <h3 className="font-semibold text-text mb-4">AI Score Distribution</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="High (7-10)" value={buckets.high} accent="success" />
            <StatCard label="Medium (4-6)" value={buckets.medium} accent="warning" />
            <StatCard label="Low (1-3)" value={buckets.low} accent="danger" />
          </div>
          {scorePie.length === 0 ? (
            <EmptyState title="No scored leads" />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={scorePie} dataKey="value" nameKey="name" outerRadius={80} paddingAngle={2}>
                    {scorePie.map((d, i) => (
                      <Cell key={d.name} fill={SCORE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip {...chartTooltip} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#9898a8' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <p className="text-xs text-text-secondary mt-3">
          Distribution computed from the 100 most recent leads.
        </p>
      </Card>
    </div>
  );
}
