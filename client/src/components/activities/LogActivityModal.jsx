import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Select from '../ui/Select';
import LeadSearchSelect from '../leads/LeadSearchSelect';
import { activitiesAPI, getErrorMessage } from '../../services/api';
import { toast } from '../ui/useToast';
import { ACTIVITY_TYPE_LABELS } from '../../utils/constants';

const LOGGABLE = ['NOTE', 'CALL', 'EMAIL', 'MEETING', 'FOLLOW_UP'];

export default function LogActivityModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [lead, setLead] = useState(null);
  const [type, setType] = useState('NOTE');
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState({});

  const reset = () => {
    setLead(null);
    setType('NOTE');
    setContent('');
    setErrors({});
  };

  const mutation = useMutation({
    mutationFn: () => activitiesAPI.create({ leadId: lead.id, type, content }),
    onSuccess: () => {
      toast.success('Activity logged');
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['lead', lead.id] });
      reset();
      onClose();
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to log activity')),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!lead) errs.lead = 'Please select a lead';
    if (!content.trim()) errs.content = 'Content is required';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    mutation.mutate();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Activity" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <LeadSearchSelect label="Lead *" value={lead} onChange={setLead} error={errors.lead} />
        <Select
          label="Type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={LOGGABLE.map((t) => ({ value: t, label: ACTIVITY_TYPE_LABELS[t] }))}
        />
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Content *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="What happened?"
            className={`w-full rounded-lg bg-surface2 border text-sm text-text py-2.5 px-3
              focus:outline-none focus:ring-2 focus:ring-primary/40 ${errors.content ? 'border-danger' : 'border-border'}`}
          />
          {errors.content && <p className="mt-1 text-xs text-danger">{errors.content}</p>}
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Log Activity
          </Button>
        </div>
      </form>
    </Modal>
  );
}
