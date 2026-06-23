import { useState } from 'react';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { Plus, Pencil, Trash2, BarChart2, UserCheck } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Spinner from '../../components/ui/Spinner';
import { employeesAPI, authAPI, getErrorMessage } from '../../services/api';
import { toast } from '../../components/ui/useToast';
import { useAuth } from '../../hooks/useAuth';
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from '../../utils/constants';

const chartTooltip = {
  contentStyle: { background: '#1a1a24', border: '1px solid #2e2e3e', borderRadius: 8, color: '#f1f1f3' },
  labelStyle: { color: '#9898a8' },
};

function initials(name = '') {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function perfScore(conversionRate = 0, activitiesLogged = 0) {
  return Math.round(Math.min(100, conversionRate * 0.6 + Math.min(activitiesLogged, 50) * 0.8));
}
function perfColor(score) {
  if (score >= 70) return '#22c55e';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

/* ---------- Add Employee ---------- */
function AddEmployeeModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'EMPLOYEE' });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () => authAPI.register(form),
    onSuccess: () => {
      toast.success('Employee added');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setForm({ name: '', email: '', password: '', role: 'EMPLOYEE' });
      setErrors({});
      onClose();
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to add employee')),
  });

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Valid email required';
    if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    mutation.mutate();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Employee" size="md">
      <form onSubmit={submit} className="space-y-4">
        <Input label="Name" value={form.name} onChange={set('name')} error={errors.name} />
        <Input label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} />
        <Input
          label="Password"
          type="password"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
        />
        <Select
          label="Role"
          value={form.role}
          onChange={set('role')}
          options={[
            { value: 'EMPLOYEE', label: 'Employee' },
            { value: 'ADMIN', label: 'Admin' },
          ]}
        />
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Add Employee
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Edit Employee ---------- */
function EditEmployeeModal({ employee, onClose }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(employee.name);
  const [role, setRole] = useState(employee.role);

  const mutation = useMutation({
    mutationFn: () => employeesAPI.update(employee.id, { name, role }),
    onSuccess: () => {
      toast.success('Employee updated');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      onClose();
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to update employee')),
  });

  return (
    <Modal isOpen onClose={onClose} title="Edit Employee" size="md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Select
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          options={[
            { value: 'EMPLOYEE', label: 'Employee' },
            { value: 'ADMIN', label: 'Admin' },
          ]}
        />
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Performance Modal ---------- */
function PerformanceModal({ employee, onClose }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['employee-performance', employee.id],
    queryFn: () => employeesAPI.getPerformance(employee.id),
    select: (res) => res.data,
  });

  const statusBars = data
    ? Object.entries(data.byStatus || {}).map(([s, value]) => ({
        name: LEAD_STATUS_LABELS[s] || s,
        value,
        color: LEAD_STATUS_COLORS[s],
      }))
    : [];

  return (
    <Modal isOpen onClose={onClose} title={`${employee.name} — Performance`} size="lg">
      {isLoading ? (
        <div className="py-10 flex justify-center">
          <Spinner size="lg" />
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['Total Leads', data.totalLeads],
              ['Closed Won', data.closedWon],
              ['Closed Lost', data.closedLost],
              ['Conversion', `${data.conversionRate}%`],
              ['Activities', data.activitiesLogged],
              ['Follow-Ups', data.followUpsScheduled],
              ['Done', data.followUpsDone],
              ['This Month', data.leadsThisMonth],
            ].map(([label, value]) => (
              <div key={label} className="bg-surface2 border border-border rounded-lg px-3 py-2.5">
                <p className="text-xs text-text-secondary">{label}</p>
                <p className="text-lg font-bold text-text">{value}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-sm font-medium text-text mb-2">Leads by Status</p>
            {statusBars.length === 0 ? (
              <p className="text-sm text-text-secondary">No leads assigned.</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusBars} layout="vertical" margin={{ left: 30, right: 12 }}>
                    <XAxis type="number" allowDecimals={false} tick={{ fill: '#9898a8', fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fill: '#9898a8', fontSize: 10 }} />
                    <Tooltip {...chartTooltip} cursor={{ fill: '#22222f' }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {statusBars.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------- Page ---------- */
export default function TeamPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [perfTarget, setPerfTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: employees, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesAPI.getAll(),
    select: (res) => res.data,
  });

  // Fetch performance per employee for richer table columns.
  const perfQueries = useQueries({
    queries: (employees || []).map((emp) => ({
      queryKey: ['employee-performance', emp.id],
      queryFn: () => employeesAPI.getPerformance(emp.id),
      select: (res) => res.data,
      enabled: !!employees,
    })),
  });
  const perfById = {};
  (employees || []).forEach((emp, i) => {
    perfById[emp.id] = perfQueries[i]?.data;
  });

  const del = useMutation({
    mutationFn: (id) => employeesAPI.delete(id),
    onSuccess: () => {
      toast.success('Employee removed');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
      setDeleteTarget(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-text">Team</h2>
        <Button onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Add Employee
        </Button>
      </div>

      {isLoading ? (
        <SkeletonLoader type="table" rows={5} />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (employees || []).length === 0 ? (
        <div className="bg-surface border border-border rounded-xl">
          <EmptyState icon={UserCheck} title="No team members" />
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-secondary">
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Leads</th>
                  <th className="px-4 py-3 font-medium">Closed Won</th>
                  <th className="px-4 py-3 font-medium">Conversion</th>
                  <th className="px-4 py-3 font-medium">Activities</th>
                  <th className="px-4 py-3 font-medium">Performance</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const perf = perfById[emp.id];
                  const conv = perf ? perf.conversionRate : null;
                  const score = perf ? perfScore(perf.conversionRate, perf.activitiesLogged) : null;
                  return (
                    <tr key={emp.id} className="border-b border-border last:border-0 hover:bg-surface2">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-semibold">
                            {initials(emp.name)}
                          </div>
                          <div>
                            <p className="font-medium text-text">{emp.name}</p>
                            <p className="text-xs text-text-secondary">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={emp.role === 'ADMIN' ? 'primary' : 'default'} size="sm">
                          {emp.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-text">{emp.leadCount}</td>
                      <td className="px-4 py-3 text-text">{emp.closedWonCount}</td>
                      <td className="px-4 py-3 text-text">{conv == null ? '—' : `${conv}%`}</td>
                      <td className="px-4 py-3 text-text">{perf ? perf.activitiesLogged : '—'}</td>
                      <td className="px-4 py-3">
                        {score == null ? (
                          '—'
                        ) : (
                          <div className="flex items-center gap-2 w-32">
                            <div className="flex-1 h-1.5 rounded-full bg-surface2 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${score}%`, backgroundColor: perfColor(score) }}
                              />
                            </div>
                            <span className="text-xs text-text-secondary w-7 text-right">{score}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setPerfTarget(emp)}
                            className="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-surface"
                            title="View performance"
                          >
                            <BarChart2 size={16} />
                          </button>
                          <button
                            onClick={() => setEditTarget(emp)}
                            className="p-1.5 rounded-lg text-text-secondary hover:text-info hover:bg-surface"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          {emp.id !== user?.id && (
                            <button
                              onClick={() => setDeleteTarget(emp)}
                              className="p-1.5 rounded-lg text-text-secondary hover:text-danger hover:bg-surface"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddEmployeeModal isOpen={addOpen} onClose={() => setAddOpen(false)} />
      {editTarget && <EditEmployeeModal employee={editTarget} onClose={() => setEditTarget(null)} />}
      {perfTarget && <PerformanceModal employee={perfTarget} onClose={() => setPerfTarget(null)} />}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => del.mutate(deleteTarget.id)}
        title="Remove employee?"
        message={`${deleteTarget?.name} will be removed and their leads unassigned. This cannot be undone.`}
        confirmLabel="Remove"
        dangerous
        loading={del.isPending}
      />
    </div>
  );
}
