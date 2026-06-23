import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UploadCloud, FileText } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { leadsAPI, getErrorMessage } from '../../services/api';
import { toast } from '../ui/useToast';

// Minimal CSV parser supporting quoted fields and commas within quotes.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    if (row.some((c) => c.trim() !== '')) rows.push(row);
  }
  return rows;
}

// Map common header names to lead fields.
const FIELD_MAP = {
  company: 'companyName',
  companyname: 'companyName',
  'company name': 'companyName',
  website: 'website',
  url: 'website',
  industry: 'industry',
  country: 'country',
  contact: 'contactName',
  contactname: 'contactName',
  'contact name': 'contactName',
  name: 'contactName',
  email: 'email',
  phone: 'phone',
  linkedin: 'linkedinUrl',
  linkedinurl: 'linkedinUrl',
  twitter: 'twitterUrl',
  twitterurl: 'twitterUrl',
};

export default function CsvImportModal({ isOpen, onClose }) {
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState([]);
  const [parseError, setParseError] = useState('');
  const queryClient = useQueryClient();

  const reset = () => {
    setFileName('');
    setParsed([]);
    setParseError('');
  };

  const mutation = useMutation({
    mutationFn: () => leadsAPI.bulkImport({ leads: parsed }),
    onSuccess: (res) => {
      const { created = 0, skipped = 0 } = res.data || {};
      toast.success(`Imported ${created} lead${created === 1 ? '' : 's'}${skipped ? `, ${skipped} skipped` : ''}`);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-stats'] });
      reset();
      onClose();
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Import failed')),
  });

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError('');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCsv(String(reader.result));
        if (rows.length < 2) {
          setParseError('CSV must include a header row and at least one data row.');
          setParsed([]);
          return;
        }
        const headers = rows[0].map((h) => FIELD_MAP[h.trim().toLowerCase()] || null);
        if (!headers.includes('companyName')) {
          setParseError('CSV must include a "Company Name" column.');
          setParsed([]);
          return;
        }
        const leads = rows.slice(1).map((cols) => {
          const obj = {};
          headers.forEach((field, idx) => {
            if (field && cols[idx] != null && cols[idx].trim() !== '') {
              obj[field] = cols[idx].trim();
            }
          });
          return obj;
        }).filter((l) => l.companyName);
        setParsed(leads.slice(0, 100));
      } catch {
        setParseError('Could not parse CSV file.');
        setParsed([]);
      }
    };
    reader.readAsText(file);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Leads from CSV" size="md">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Upload a CSV with a header row. Supported columns: Company Name (required), Website,
          Industry, Country, Contact Name, Email, Phone, LinkedIn, Twitter. Max 100 rows.
        </p>

        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-8 cursor-pointer hover:border-primary/50 transition-colors">
          <UploadCloud size={28} className="text-text-secondary" />
          <span className="text-sm text-text-secondary">
            {fileName || 'Click to choose a .csv file'}
          </span>
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
        </label>

        {parseError && <p className="text-sm text-danger">{parseError}</p>}

        {parsed.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-text">
            <FileText size={16} className="text-success" />
            {parsed.length} valid lead{parsed.length === 1 ? '' : 's'} ready to import
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={parsed.length === 0}
          >
            Import {parsed.length || ''}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
