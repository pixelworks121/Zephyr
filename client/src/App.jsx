import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import { useAuth } from './hooks/useAuth';
import ToastContainer from './components/ui/Toast';
import AppLayout from './components/layout/AppLayout';

import LoginPage from './pages/auth/LoginPage';
import LeadsPage from './pages/leads/LeadsPage';
import LeadDetailPage from './pages/leads/LeadDetailPage';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import FollowUpsPage from './pages/employee/FollowUpsPage';
import ActivitiesPage from './pages/employee/ActivitiesPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import TeamPage from './pages/admin/TeamPage';
import ReportsPage from './pages/admin/ReportsPage';
import SourcesPage from './pages/admin/SourcesPage';

function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, isAdmin } = useAuth();
  if (isAuthenticated) return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;
  return children;
}

// Wraps a page in the app shell with the given title.
const shell = (title, node, opts = {}) => (
  <ProtectedRoute adminOnly={opts.adminOnly}>
    <AppLayout title={title}>{node}</AppLayout>
  </ProtectedRoute>
);

export default function App() {
  const initAuth = useAuthStore((s) => s.initAuth);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        {/* Employee + shared */}
        <Route path="/dashboard" element={shell('Dashboard', <EmployeeDashboard />)} />
        <Route path="/leads" element={shell('Leads', <LeadsPage />)} />
        <Route path="/leads/:id" element={shell('Lead Details', <LeadDetailPage />)} />
        <Route path="/followups" element={shell('Follow-Ups', <FollowUpsPage />)} />
        <Route path="/activities" element={shell('Activity Log', <ActivitiesPage />)} />

        {/* Admin only */}
        <Route path="/admin" element={shell('Admin Overview', <AdminDashboard />, { adminOnly: true })} />
        <Route path="/admin/team" element={shell('Team', <TeamPage />, { adminOnly: true })} />
        <Route path="/admin/reports" element={shell('Reports', <ReportsPage />, { adminOnly: true })} />
        <Route path="/admin/sources" element={shell('Lead Sources', <SourcesPage />, { adminOnly: true })} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      <ToastContainer />
    </BrowserRouter>
  );
}
