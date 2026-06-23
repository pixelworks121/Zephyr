import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Check, Pencil, Trash2, Bell, CalendarClock } from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import FollowUpModal from '../../components/followups/FollowUpModal';
import { followUpsAPI, getErrorMessage } from '../../services/api';
import { toast } from '../../components/ui/useToast';
import { useAuth } from '../../hooks/useAuth';
import { formatDateTime, daysOverdue } from '../../utils/formatDate';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Due Today' },
  { key: 'completed', label: 'Completed' },
];

function paramsForTab(tab) {
  switch (tab) {
    case 'pending':
      return { done: false };
    case 'overdue':
      return { overdue: true };
    case 'completed':
      return { done: true };
    case 'today': {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start.getTime() + 86400000 - 1);
      return { done: false, startDate: start.toISOString(), endDate: end.toISOString() };
    }
    default:
      return {};
  }
}

export default function FollowUpsPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('pending');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const tabParams = paramsForTab(tab);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['followups', 'me', tab],
    queryFn: () => followUpsAPI.getMine({ ...tabParams, limit: 100 }),
    select: (res) => res.data,
  });

  const markDone = useMutation({
    mutationFn: (id) => followUpsAPI.markDone(id),
    onSuccess: () => {
      toast.success('Follow-up completed');
      queryClient.invalidateQueries({ queryKey: ['followups'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const del = useMutation({
    mutationFn: (id) => followUpsAPI.delete(id),
    onSuccess: () => {
      toast.success('Follow-up deleted');
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
      setDeleteTarget(null);
    },
  });

  const summary = data?.summary;
  const items = data?.data || [];

  const chips = [
    { label: 'Total', value: summary?.total, accent: 'text' },
    { label: 'Pending', value: summary?.pending, accent: 'info' },
    { label: 'Overdue', value: summary?.overdue, accent: 'danger' },
    { label: 'Due Today', value: summary?.dueToday, accent: 'warning' },
    { label: 'Done', value: summary?.done, accent: 'success' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl font-bold text-text">Follow-Ups</h2>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Schedule Follow-Up
        </Button>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {chips.map((c) => (
          <div key={c.label} className="bg-surface border border-border rounded-lg px-4 py-3">
            <p className="text-xs text-text-secondary">{c.label}</p>
            <p
              className={`text-lg font-bold ${
                { text: 'text-text', info: 'text-info', danger: 'text-danger', warning: 'text-warning', success: 'text-success' }[
                  c.accent
                ]
              }`}
            >
              {c.value ?? '—'}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-primary text-text'
                : 'border-transparent text-text-secondary hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <SkeletonLoader type="list" rows={5} />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl">
          <EmptyState icon={Bell} title="Nothing here" message={`No ${tab === 'all' ? '' : tab} follow-ups.`} />
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((fu) => {
            const overdue = !fu.done && daysOverdue(fu.scheduledAt) > 0;
            return (
              <div
                key={fu.id}
                className={`rounded-xl border p-4 ${
                  overdue ? 'border-danger/40 bg-danger/10' : 'border-border bg-surface'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to={`/leads/${fu.lead?.id}`}
                      className="font-medium text-text hover:text-primary"
                    >
                      {fu.lead?.companyName || 'Lead'}
                    </Link>
                    <p className="text-xs text-text-secondary mt-1 flex items-center gap-1.5">
                      <CalendarClock size={13} /> {formatDateTime(fu.scheduledAt)}
                    </p>
                    {fu.note && <p className="text-sm text-text-secondary mt-1">{fu.note}</p>}
                    {overdue && (
                      <p className="text-xs text-danger mt-1">
                        Overdue by {daysOverdue(fu.scheduledAt)} day(s)
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {fu.done ? (
                      <Badge variant="success">Done</Badge>
                    ) : overdue ? (
                      <Badge variant="danger">Overdue</Badge>
                    ) : (
                      <Badge variant="info">Pending</Badge>
                    )}
                    {!fu.done && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => markDone.mutate(fu.id)}
                          loading={markDone.isPending && markDone.variables === fu.id}
                        >
                          <Check size={14} /> Done
                        </Button>
                        <button
                          onClick={() => setEditTarget(fu)}
                          className="p-1.5 rounded-lg text-text-secondary hover:text-info hover:bg-surface2"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                      </>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => setDeleteTarget(fu)}
                        className="p-1.5 rounded-lg text-text-secondary hover:text-danger hover:bg-surface2"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <FollowUpModal isOpen={createOpen} onClose={() => setCreateOpen(false)} mode="create" />
      {editTarget && (
        <FollowUpModal
          isOpen={!!editTarget}
          onClose={() => setEditTarget(null)}
          mode="edit"
          followUp={editTarget}
        />
      )}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => del.mutate(deleteTarget.id)}
        title="Delete follow-up?"
        message="This follow-up will be permanently removed."
        confirmLabel="Delete"
        dangerous
        loading={del.isPending}
      />
    </div>
  );
}
