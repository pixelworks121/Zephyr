import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Mail, Lock, Eye, EyeOff, Zap } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { authAPI, getErrorMessage } from '../../services/api';
import useAuthStore from '../../store/authStore';
import { toast } from '../../components/ui/useToast';

function validate({ email, password }) {
  const errors = {};
  if (!email.trim()) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address';
  if (!password) errors.password = 'Password is required';
  else if (password.length < 8) errors.password = 'Password must be at least 8 characters';
  return errors;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const mutation = useMutation({
    mutationFn: (creds) => authAPI.login(creds),
    onSuccess: (res) => {
      const { user, token } = res.data;
      setAuth(user, token);
      toast.success(`Welcome back, ${user.name}`);
      navigate(user.role === 'ADMIN' ? '/admin' : '/dashboard', { replace: true });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Login failed'));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate({ email, password });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    mutation.mutate({ email: email.trim(), password });
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary mb-4">
            <Zap size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text">Pixel Works</h1>
          <p className="text-sm text-text-secondary mt-1">Zephyr Platform</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <Input
              label="Email"
              type="email"
              icon={Mail}
              placeholder="you@pixelworks.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              autoComplete="email"
            />

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className={`w-full rounded-lg bg-surface2 border text-sm text-text placeholder:text-text-secondary/60
                    py-2.5 pl-10 pr-10 focus:outline-none focus:ring-2 transition-colors
                    ${errors.password ? 'border-danger focus:ring-danger/40' : 'border-border focus:ring-primary/40 focus:border-primary'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-danger">{errors.password}</p>}
            </div>

            <Button type="submit" fullWidth size="lg" loading={mutation.isPending}>
              Sign In
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-text-secondary mt-6">
          &copy; {new Date().getFullYear()} Pixel Works. All rights reserved.
        </p>
      </div>
    </div>
  );
}
