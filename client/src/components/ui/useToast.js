import { create } from 'zustand';

const MAX_TOASTS = 4;
let counter = 0;

const useToastStore = create((set, get) => ({
  toasts: [],
  add: (type, message) => {
    const id = ++counter;
    set((state) => {
      const next = [...state.toasts, { id, type, message }];
      // Keep only the most recent MAX_TOASTS (drop oldest first).
      return { toasts: next.slice(-MAX_TOASTS) };
    });
    // Auto-dismiss after 4 seconds.
    setTimeout(() => get().remove(id), 4000);
    return id;
  },
  remove: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

// Stable toast helper usable inside or outside React.
export const toast = {
  success: (message) => useToastStore.getState().add('success', message),
  error: (message) => useToastStore.getState().add('error', message),
  warning: (message) => useToastStore.getState().add('warning', message),
  info: (message) => useToastStore.getState().add('info', message),
};

export function useToast() {
  return toast;
}

export default useToastStore;
