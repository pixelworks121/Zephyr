import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import LeadSearchSelect from '../leads/LeadSearchSelect';
import { followUpsAPI, getErrorMessage } from '../../services/api';
import { toast } from '../ui/useToast';
import { toDateTimeLocal } from '../../utils/formatDate';

// mode: 'create' (with lead picker) | 'edit' (date + note only)
export default function FollowUpModal({ isOpen, onClose, mode = 'create', followUp }) {
  const queryClient = useQueryClient();
  const [lead, setLead] = useState(null);
  const [scheduledAt, setScheduledAt] = useState(
    mode === 'edit' && followUp ? toDateTimeLocal(followUp.scheduledAt) : toDateTimeLocal()
  );
  const [note, setNote] = useState(mode === 'edit' && followUp ? followUp.note || '' : '');
  const [errors, setErrors] = useState({});

  const reset = () => {
    setLead(null);
    setNote('');
    setScheduledAt(toDateTimeLocal());
    setErrors({});
  };

  const mutation = useMutation({
    mutationFn: () => {
      const iso = new Date(scheduledAt).toISOString();
      if (mode === 'edit') {
        return followUpsAPI.update(followUp.id, { scheduledAt: iso, note: note || undefined });
      }
      return followUpsAPI.create({ leadId: lead.id, scheduledAt: iso, note: note || undefined });
    },
    onSuccess: () => {
      toast.success(mode === 'edit' ? 'Follow-up updated' : 'Follow-up scheduled');
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      reset();
      onClose();
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to save follow-up')),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (mode === 'create' && !lead) errs.lead = 'Please select a lead';
    if (new Date(scheduledAt) <= new Date()) errs.scheduledAt = 'Date must be in the future';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    mutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'edit' ? 'Edit Follow-Up' : 'Schedule Follow-Up'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'create' && (
          <LeadSearchSelect label="Lead *" value={lead} onChange={setLead} error={errors.lead} />
        )}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Date & time *</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className={`w-full rounded-lg bg-surface2 border text-sm text-text py-2.5 px-3
              focus:outline-none focus:ring-2 focus:ring-primary/40 ${errors.scheduledAt ? 'border-danger' : 'border-border'}`}
          />
          {errors.scheduledAt && <p className="mt-1 text-xs text-danger">{errors.scheduledAt}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Optional note…"
            className="w-full rounded-lg bg-surface2 border border-border text-sm text-text py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {mode === 'edit' ? 'Save' : 'Schedule'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
