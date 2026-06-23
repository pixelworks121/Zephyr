import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Select from '../ui/Select';
import ActivityTypeIcon from '../activities/ActivityTypeIcon';
import { activitiesAPI, getErrorMessage } from '../../services/api';
import { toast } from '../ui/useToast';
import { timeAgo } from '../../utils/formatDate';
import { ACTIVITY_TYPE_LABELS } from '../../utils/constants';

// Types a user can manually log (STATUS_CHANGE is system-only).
const LOGGABLE = ['NOTE', 'CALL', 'EMAIL', 'MEETING', 'FOLLOW_UP'];

export default function LeadActivityTimeline({ lead }) {
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState('NOTE');
  const [content, setContent] = useState('');
  const [visible, setVisible] = useState(10);
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: () => activitiesAPI.create({ leadId: lead.id, type, content }),
    onSuccess: () => {
      toast.success('Activity logged');
      queryClient.invalidateQueries({ queryKey: ['lead', lead.id] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setShowForm(false);
      setContent('');
      setType('NOTE');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to log activity')),
  });

  const activities = lead.activities || [];
  const shown = activities.slice(0, visible);

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-text">Activity Timeline</h3>
        <Button size="sm" variant="ghost" onClick={() => setShowForm((s) => !s)}>
          <Plus size={14} /> Log Activity
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!content.trim()) return;
            create.mutate();
          }}
          className="mb-4 space-y-3 rounded-lg border border-border bg-surface2 p-3"
        >
          <Select
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={LOGGABLE.map((t) => ({ value: t, label: ACTIVITY_TYPE_LABELS[t] }))}
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="What happened?"
            className="w-full rounded-lg bg-surface border border-border text-sm text-text py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" type="button" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" loading={create.isPending} disabled={!content.trim()}>
              Log
            </Button>
          </div>
        </form>
      )}

      {activities.length === 0 ? (
        <p className="text-sm text-text-secondary">No activity yet.</p>
      ) : (
        <>
          <div className="space-y-3">
            {shown.map((a) => (
              <div key={a.id} className="flex gap-3">
                <ActivityTypeIcon type={a.type} withBg />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text break-words">{a.content}</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {a.user?.name || 'System'} · {timeAgo(a.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {visible < activities.length && (
            <div className="mt-4 text-center">
              <Button variant="secondary" size="sm" onClick={() => setVisible((v) => v + 10)}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
