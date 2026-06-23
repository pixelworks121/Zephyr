import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Activity } from 'lucide-react';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ActivityTypeIcon from '../../components/activities/ActivityTypeIcon';
import LogActivityModal from '../../components/activities/LogActivityModal';
import { activitiesAPI, getErrorMessage } from '../../services/api';
import { toast } from '../../components/ui/useToast';
import { formatDateTime } from '../../utils/formatDate';
import { ACTIVITY_TYPE_LABELS } from '../../utils/constants';

const TYPE_OPTIONS = [
  { value: 'NOTE', label: 'Note' },
  { value: 'CALL', label: 'Call' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'FOLLOW_UP', label: 'Follow-Up' },
];

function ActivityContent({ text }) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 100;
  const display = long && !expanded ? `${text.slice(0, 100)}…` : text;
  return (
    <p className="text-sm text-text break-words">
      {display}
      {long && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="ml-1 text-xs text-primary hover:underline"
        >
          {expanded ? 'show less' : 'show more'}
        </button>
      )}
    </p>
  );
}

export default function ActivitiesPage() {
  const queryClient = useQueryClient();
  const [type, setType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [limit, setLimit] = useState(20);
  const [logOpen, setLogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const params = {
    limit,
    page: 1,
    ...(type ? { type } : {}),
    ...(startDate ? { startDate: new Date(startDate).toISOString() } : {}),
    ...(endDate ? { endDate: new Date(`${endDate}T23:59:59`).toISOString() } : {}),
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['activities', 'me', params],
    queryFn: () => activitiesAPI.getMine(params),
    select: (res) => res.data,
    keepPreviousData: true,
  });

  const del = useMutation({
    mutationFn: (id) => activitiesAPI.delete(id),
    onSuccess: () => {
      toast.success('Activity deleted');
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
      setDeleteTarget(null);
    },
  });

  const items = data?.data || [];
  const pagination = data?.pagination;
  const canLoadMore = pagination && items.length < pagination.total;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl font-bold text-text">Activity Log</h2>
        <Button onClick={() => setLogOpen(true)}>
          <Plus size={16} /> Log Activity
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-border rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Select
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="All Types"
          options={TYPE_OPTIONS}
        />
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>

      {/* List */}
      {isLoading ? (
        <SkeletonLoader type="list" rows={5} />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl">
          <EmptyState
            icon={Activity}
            title="No activity logged"
            message="Log your first activity to keep track of your work."
            action={
              <Button onClick={() => setLogOpen(true)}>
                <Plus size={16} /> Log Activity
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((a) => (
              <div
                key={a.id}
                className="bg-surface border border-border rounded-xl p-4 flex gap-3"
              >
                <ActivityTypeIcon type={a.type} withBg />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-text-secondary">
                      {ACTIVITY_TYPE_LABELS[a.type] || a.type}
                    </span>
                    {a.type !== 'STATUS_CHANGE' && (
                      <button
                        onClick={() => setDeleteTarget(a)}
                        className="p-1 rounded text-text-secondary hover:text-danger"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  <ActivityContent text={a.content} />
                  <p className="text-xs text-text-secondary mt-1">
                    {a.lead?.companyName && (
                      <Link to={`/leads/${a.lead.id}`} className="hover:text-primary">
                        {a.lead.companyName}
                      </Link>
                    )}{' '}
                    · {formatDateTime(a.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {canLoadMore && (
            <div className="text-center">
              <Button
                variant="secondary"
                onClick={() => setLimit((l) => l + 20)}
                loading={isFetching}
              >
                Load more
              </Button>
            </div>
          )}
        </>
      )}

      <LogActivityModal isOpen={logOpen} onClose={() => setLogOpen(false)} />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => del.mutate(deleteTarget.id)}
        title="Delete activity?"
        message="This activity will be permanently removed."
        confirmLabel="Delete"
        dangerous
        loading={del.isPending}
      />
    </div>
  );
}
