import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

let uid = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const push = useCallback(
    (message, { type = 'success', duration = 3500 } = {}) => {
      const id = ++uid;
      setToasts((list) => [...list, { id, message, type }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const toast = {
    success: (message, opts) => push(message, { ...opts, type: 'success' }),
    error: (message, opts) => push(message, { ...opts, type: 'error' }),
    info: (message, opts) => push(message, { ...opts, type: 'info' }),
  };

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>{children}</ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
}

// Internal — only ToastContainer needs the live list/dismiss handle.
export function useToastList() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToastList must be used within ToastProvider');
  return ctx;
}
