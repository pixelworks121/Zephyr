import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Upload,
  Search,
  X,
  ExternalLink,
  Eye,
  Pencil,
  Trash2,
  Users,
  ChevronLeft,
  ChevronRight,
  BrainCircuit,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import StatCard from '../../components/ui/StatCard';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import Badge from '../../components/ui/Badge';
import LeadStatusBadge from '../../components/leads/LeadStatusBadge';
import AiScore from '../../components/leads/AiScore';
import AddLeadModal from '../../components/leads/AddLeadModal';
import LeadFormModal from '../../components/leads/LeadFormModal';
import CsvImportModal from '../../components/leads/CsvImportModal';
import DeleteLeadButton from '../../components/leads/DeleteLeadButton';
import { leadsAPI, employeesAPI, aiAPI, getErrorMessage } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/useToast';
import useDebounce from '../../hooks/useDebounce';
import { formatDate } from '../../utils/formatDate';
import { countryFlag } from '../../utils/flags';
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  LEAD_SOURCES,
  LEAD_SOURCE_LABELS,
  INDUSTRIES,
  toOptions,
} from '../../utils/constants';

const PAGE_SIZE = 20;

const emptyFilters = {
  status: '',
  industry: '',
  country: '',
  source: '',
  assignedToId: '',
};

export default function LeadsPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 400);
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [editLead, setEditLead] = useState(null);

  const setFilter = (key) => (e) => {
    setFilters((f) => ({ ...f, [key]: e.target.value }));
    setPage(1);
  };

  const params = {
    page,
    limit: PAGE_SIZE,
    ...(search ? { search } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.industry ? { industry: filters.industry } : {}),
    ...(filters.country ? { country: filters.country } : {}),
    ...(filters.source ? { source: filters.source } : {}),
    ...(filters.assignedToId ? { assignedToId: filters.assignedToId } : {}),
  };

  const statsQuery = useQuery({
    queryKey: ['lead-stats'],
    queryFn: () => leadsAPI.getStats(),
    select: (res) => res.data,
  });

  const leadsQuery = useQuery({
    queryKey: ['leads', params],
    queryFn: () => leadsAPI.getAll(params),
    select: (res) => res.data,
    keepPreviousData: true,
  });

  const employeesQuery = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesAPI.getAll(),
    enabled: isAdmin,
    select: (res) => res.data,
  });

  const stats = statsQuery.data;
  const leads = leadsQuery.data?.leads || [];
  const pagination = leadsQuery.data?.pagination;
  const hasFilters = search || Object.values(filters).some(Boolean);

  const unscoredLeadIds = leads.filter(l => l.aiScore === null || l.aiScore === undefined).map(l => l.id);

  const batchAnalyzeMutation = useMutation({
    mutationFn: (ids) => aiAPI.batchAnalyze(ids),
    onSuccess: (data) => {
      toast.success(data.message || 'Batch analysis completed');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const clearFilters = () => {
    setSearchInput('');
    setFilters(emptyFilters);
    setPage(1);
  };

  const employeeOptions = (employeesQuery.data || []).map((e) => ({ value: e.id, label: e.name }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl font-bold text-text">Leads</h2>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              {unscoredLeadIds.length > 0 && (
                <Button 
                  variant="primary" 
                  onClick={() => batchAnalyzeMutation.mutate(unscoredLeadIds)}
                  loading={batchAnalyzeMutation.isPending}
                  disabled={batchAnalyzeMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  <BrainCircuit size={16} className="mr-2" />
                  Batch Analyze ({unscoredLeadIds.length})
                </Button>
              )}
              <Button variant="secondary" onClick={() => setCsvOpen(true)}>
                <Upload size={16} /> Import CSV
              </Button>
            </>
          )}
          <Button onClick={() => setAddOpen(true)}>
            <Plus size={16} /> Add Lead
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Leads" value={stats ? stats.total : '—'} />
        <StatCard label="New This Week" value={stats ? stats.thisWeek : '—'} accent="primary" />
        <StatCard
          label="Closed Won"
          value={stats ? stats.byStatus?.CLOSED_WON ?? 0 : '—'}
          accent="success"
        />
        <StatCard
          label="Conversion Rate"
          value={stats ? `${stats.conversionRate}%` : '—'}
          accent="info"
        />
      </div>

      {/* Filters */}
      <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <Input
            icon={Search}
            placeholder="Search company, contact, email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Select
            value={filters.status}
            onChange={setFilter('status')}
            placeholder="All Statuses"
            options={toOptions(LEAD_STATUSES, LEAD_STATUS_LABELS)}
          />
          <Select
            value={filters.industry}
            onChange={setFilter('industry')}
            placeholder="All Industries"
            options={INDUSTRIES.map((i) => ({ value: i, label: i }))}
          />
          <Input
            placeholder="Country"
            value={filters.country}
            onChange={setFilter('country')}
          />
          {isAdmin && (
            <Select
              value={filters.source}
              onChange={setFilter('source')}
              placeholder="All Sources"
              options={toOptions(LEAD_SOURCES, LEAD_SOURCE_LABELS)}
            />
          )}
          {isAdmin && (
            <Select
              value={filters.assignedToId}
              onChange={setFilter('assignedToId')}
              placeholder="Any Assignee"
              options={employeeOptions}
            />
          )}
        </div>
        {hasFilters && (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X size={14} /> Clear filters
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      {leadsQuery.isLoading ? (
        <SkeletonLoader type="table" rows={6} />
      ) : leadsQuery.isError ? (
        <ErrorState error={leadsQuery.error} onRetry={leadsQuery.refetch} />
      ) : leads.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl">
          <EmptyState
            icon={Users}
            title="No leads found"
            message={
              hasFilters
                ? 'Try adjusting or clearing your filters.'
                : 'Get started by adding your first lead.'
            }
            action={
              hasFilters ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button onClick={() => setAddOpen(true)}>
                  <Plus size={16} /> Add your first lead
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-secondary">
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Industry / Country</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">AI Score</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Assigned</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    className="border-b border-border last:border-0 hover:bg-surface2 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-medium text-text">
                        {lead.companyName}
                        {lead.website && (
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-text-secondary hover:text-primary"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                      {lead.contactName && (
                        <p className="text-xs text-text-secondary">{lead.contactName}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-text">{lead.industry || '—'}</p>
                      <p className="text-xs text-text-secondary">
                        {countryFlag(lead.country)}
                        {lead.country || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <LeadStatusBadge status={lead.status} />
                    </td>
                    <td className="px-4 py-3">
                      <AiScore score={lead.aiScore} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="default" size="sm">
                        {LEAD_SOURCE_LABELS[lead.source] || lead.source}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {lead.assignedTo ? (
                        <span className="text-text">{lead.assignedTo.name}</span>
                      ) : (
                        <span className="text-text-secondary">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                      {formatDate(lead.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => navigate(`/leads/${lead.id}`)}
                          className="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-surface"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => setEditLead(lead)}
                              className="p-1.5 rounded-lg text-text-secondary hover:text-info hover:bg-surface"
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>
                            <DeleteLeadButton lead={lead}>
                              {(open) => (
                                <button
                                  onClick={open}
                                  className="p-1.5 rounded-lg text-text-secondary hover:text-danger hover:bg-surface"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </DeleteLeadButton>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-text-secondary">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} leads
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={14} /> Prev
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <AddLeadModal isOpen={addOpen} onClose={() => setAddOpen(false)} />
      {isAdmin && <CsvImportModal isOpen={csvOpen} onClose={() => setCsvOpen(false)} />}
      {editLead && (
        <LeadFormModal
          isOpen={!!editLead}
          onClose={() => setEditLead(null)}
          mode="edit"
          lead={editLead}
        />
      )}
    </div>
  );
}
