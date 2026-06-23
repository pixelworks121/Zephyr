import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  // Persist token + user and update state.
  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  // Clear everything.
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  // Restore session from localStorage on app load.
  initAuth: () => {
    const token = localStorage.getItem('token');
    const rawUser = localStorage.getItem('user');
    if (token && rawUser) {
      try {
        const user = JSON.parse(rawUser);
        set({ user, token, isAuthenticated: true });
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  },
}));

export default useAuthStore;
