import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { leadsAPI, employeesAPI, getErrorMessage } from '../../services/api';
import { toast } from '../ui/useToast';
import { useAuth } from '../../hooks/useAuth';
import {
  INDUSTRIES,
  BUSINESS_SIZES,
  BUSINESS_SIZE_LABELS,
  LEAD_SOURCES,
  LEAD_SOURCE_LABELS,
  toOptions,
} from '../../utils/constants';

const EMPTY = {
  companyName: '',
  website: '',
  industry: '',
  country: '',
  contactName: '',
  email: '',
  phone: '',
  linkedinUrl: '',
  twitterUrl: '',
  businessSize: '',
  assignedToId: '',
  source: 'MANUAL',
};

const isUrl = (v) => {
  try {
    new URL(v);
    return true;
  } catch {
    return false;
  }
};

export default function LeadFormModal({ isOpen, onClose, mode = 'create', lead }) {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() =>
    mode === 'edit' && lead
      ? {
          ...EMPTY,
          ...Object.fromEntries(
            Object.keys(EMPTY).map((k) => [k, lead[k] ?? (k === 'source' ? 'MANUAL' : '')])
          ),
          assignedToId: lead.assignedToId || '',
        }
      : EMPTY
  );
  const [errors, setErrors] = useState({});

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesAPI.getAll(),
    enabled: isAdmin && isOpen,
    select: (res) => res.data,
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const mutation = useMutation({
    mutationFn: (payload) =>
      mode === 'edit' ? leadsAPI.update(lead.id, payload) : leadsAPI.create(payload),
    onSuccess: () => {
      toast.success(mode === 'edit' ? 'Lead updated' : 'Lead created');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
      if (mode === 'edit') queryClient.invalidateQueries({ queryKey: ['lead', lead.id] });
      setForm(EMPTY);
      setErrors({});
      onClose();
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to save lead')),
  });

  const validate = () => {
    const e = {};
    if (!form.companyName.trim()) e.companyName = 'Company name is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (form.website && !isUrl(form.website)) e.website = 'Invalid URL';
    if (form.linkedinUrl && !isUrl(form.linkedinUrl)) e.linkedinUrl = 'Invalid URL';
    if (form.twitterUrl && !isUrl(form.twitterUrl)) e.twitterUrl = 'Invalid URL';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      companyName: form.companyName.trim(),
      website: form.website || '',
      industry: form.industry || undefined,
      country: form.country || undefined,
      contactName: form.contactName || undefined,
      email: form.email || '',
      phone: form.phone || undefined,
      linkedinUrl: form.linkedinUrl || '',
      twitterUrl: form.twitterUrl || '',
    };
    if (form.businessSize) payload.businessSize = form.businessSize;
    if (isAdmin) {
      if (form.source) payload.source = form.source;
      // Only send assignedToId when set (backend expects uuid or null).
      payload.assignedToId = form.assignedToId || (mode === 'edit' ? null : undefined);
    }

    mutation.mutate(payload);
  };

  const employeeOptions = (employees || []).map((emp) => ({ value: emp.id, label: emp.name }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'edit' ? 'Edit Lead' : 'Add Lead'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Company Name *"
          value={form.companyName}
          onChange={set('companyName')}
          error={errors.companyName}
          placeholder="Acme Inc."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Website"
            value={form.website}
            onChange={set('website')}
            error={errors.website}
            placeholder="https://acme.com"
          />
          <Select
            label="Industry"
            value={form.industry}
            onChange={set('industry')}
            placeholder="Select industry"
            options={INDUSTRIES.map((i) => ({ value: i, label: i }))}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Country" value={form.country} onChange={set('country')} placeholder="United States" />
          <Select
            label="Business Size"
            value={form.businessSize}
            onChange={set('businessSize')}
            placeholder="Select size"
            options={toOptions(BUSINESS_SIZES, BUSINESS_SIZE_LABELS)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Contact Name" value={form.contactName} onChange={set('contactName')} />
          <Input
            label="Email"
            value={form.email}
            onChange={set('email')}
            error={errors.email}
            placeholder="contact@acme.com"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Phone" value={form.phone} onChange={set('phone')} />
          <Input
            label="LinkedIn URL"
            value={form.linkedinUrl}
            onChange={set('linkedinUrl')}
            error={errors.linkedinUrl}
          />
        </div>

        <Input
          label="Twitter URL"
          value={form.twitterUrl}
          onChange={set('twitterUrl')}
          error={errors.twitterUrl}
        />

        {isAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Assigned To"
              value={form.assignedToId}
              onChange={set('assignedToId')}
              placeholder="Unassigned"
              options={employeeOptions}
            />
            <Select
              label="Source"
              value={form.source}
              onChange={set('source')}
              options={toOptions(LEAD_SOURCES, LEAD_SOURCE_LABELS)}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {mode === 'edit' ? 'Save Changes' : 'Create Lead'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
