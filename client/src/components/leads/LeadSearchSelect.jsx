import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { leadsAPI } from '../../services/api';
import useDebounce from '../../hooks/useDebounce';
import Spinner from '../ui/Spinner';

// Type-to-search lead picker. Calls onChange(lead) when one is selected.
export default function LeadSearchSelect({ label = 'Lead', value, onChange, error }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const search = useDebounce(query, 300);

  const { data, isFetching } = useQuery({
    queryKey: ['leads', { search, limit: 8, picker: true }],
    queryFn: () => leadsAPI.getAll({ search, limit: 8 }),
    select: (res) => res.data?.leads || [],
    enabled: open,
  });

  if (value) {
    return (
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">{label}</label>
        <div className="flex items-center justify-between rounded-lg bg-surface2 border border-border px-3 py-2.5">
          <span className="text-sm text-text truncate">{value.companyName}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-text-secondary hover:text-text"
          >
            <X size={16} />
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-text-secondary mb-1.5">{label}</label>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search leads…"
          className={`w-full rounded-lg bg-surface2 border text-sm text-text py-2.5 pl-10 pr-3
            focus:outline-none focus:ring-2 focus:ring-primary/40
            ${error ? 'border-danger' : 'border-border'}`}
        />
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}

      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-border bg-surface shadow-xl">
          {isFetching ? (
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : (data || []).length === 0 ? (
            <p className="px-3 py-3 text-sm text-text-secondary">No leads found.</p>
          ) : (
            data.map((lead) => (
              <button
                key={lead.id}
                type="button"
                onClick={() => {
                  onChange(lead);
                  setOpen(false);
                  setQuery('');
                }}
                className="w-full text-left px-3 py-2.5 text-sm text-text hover:bg-surface2"
              >
                {lead.companyName}
                {lead.country && <span className="text-text-secondary"> · {lead.country}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
