import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Check, CalendarClock } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { followUpsAPI, getErrorMessage } from '../../services/api';
import { toast } from '../ui/useToast';
import { formatDateTime, daysOverdue, toDateTimeLocal } from '../../utils/formatDate';

function FollowUpRow({ fu, leadId }) {
  const queryClient = useQueryClient();
  const overdue = !fu.done && daysOverdue(fu.scheduledAt) > 0;

  const markDone = useMutation({
    mutationFn: () => followUpsAPI.markDone(fu.id),
    onSuccess: () => {
      toast.success('Follow-up completed');
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['followups'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <div
      className={`rounded-lg border p-3 ${
        overdue ? 'border-danger/40 bg-danger/10' : 'border-border bg-surface2'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-text flex items-center gap-1.5">
            <CalendarClock size={14} className="text-text-secondary" />
            {formatDateTime(fu.scheduledAt)}
          </p>
          {fu.note && <p className="text-xs text-text-secondary mt-1">{fu.note}</p>}
          {overdue && (
            <p className="text-xs text-danger mt-1">
              Overdue by {daysOverdue(fu.scheduledAt)} day(s)
            </p>
          )}
          {fu.done && <p className="text-xs text-success mt-1">Completed</p>}
        </div>
        {!fu.done && (
          <Button size="sm" variant="secondary" onClick={() => markDone.mutate()} loading={markDone.isPending}>
            <Check size={14} /> Done
          </Button>
        )}
      </div>
    </div>
  );
}

export default function LeadFollowUps({ lead }) {
  const [showForm, setShowForm] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(toDateTimeLocal());
  const [note, setNote] = useState('');
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: () =>
      followUpsAPI.create({
        leadId: lead.id,
        scheduledAt: new Date(scheduledAt).toISOString(),
        note: note || undefined,
      }),
    onSuccess: () => {
      toast.success('Follow-up scheduled');
      queryClient.invalidateQueries({ queryKey: ['lead', lead.id] });
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      setShowForm(false);
      setNote('');
      setScheduledAt(toDateTimeLocal());
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to schedule follow-up')),
  });

  const followUps = lead.followUps || [];

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-text">Follow-Ups</h3>
        <Button size="sm" variant="ghost" onClick={() => setShowForm((s) => !s)}>
          <Plus size={14} /> Schedule
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
          className="mb-4 space-y-3 rounded-lg border border-border bg-surface2 p-3"
        >
          <div>
            <label className="block text-xs text-text-secondary mb-1">Date & time</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-lg bg-surface border border-border text-sm text-text py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Optional note…"
              className="w-full rounded-lg bg-surface border border-border text-sm text-text py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" type="button" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" loading={create.isPending}>
              Schedule
            </Button>
          </div>
        </form>
      )}

      {followUps.length === 0 ? (
        <p className="text-sm text-text-secondary">No follow-ups scheduled.</p>
      ) : (
        <div className="space-y-2">
          {followUps.map((fu) => (
            <FollowUpRow key={fu.id} fu={fu} leadId={lead.id} />
          ))}
        </div>
      )}
    </Card>
  );
}
