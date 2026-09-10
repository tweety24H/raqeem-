import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [worker, setWorker] = useState(() => {
    const raw = localStorage.getItem('raqeem_worker');
    return raw ? JSON.parse(raw) : null;
  });

  const login = useCallback(async (pin) => {
    const res = await api.post('/auth/login', { pin });
    localStorage.setItem('raqeem_token', res.data.token);
    localStorage.setItem('raqeem_worker', JSON.stringify(res.data.worker));
    setWorker(res.data.worker);
    return res.data.worker;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('raqeem_token');
    localStorage.removeItem('raqeem_worker');
    setWorker(null);
  }, []);

  // Task 7: refresh permissions from the server once on load, in case an
  // owner changed this worker's permissions since their last login (the JWT
  // itself doesn't carry permissions, so localStorage can otherwise go stale).
  useEffect(() => {
    if (!worker) return;
    api
      .get('/auth/me')
      .then((res) => {
        const next = { ...worker, permissions: res.data.worker.permissions };
        localStorage.setItem('raqeem_worker', JSON.stringify(next));
        setWorker(next);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isOwner = worker?.role === 'owner';

  // hasPermission(slug) — the owner passes every check implicitly, matching
  // the server's checkPermission() behavior.
  const hasPermission = useCallback(
    (slug) => {
      if (!worker) return false;
      if (isOwner) return true;
      return Array.isArray(worker.permissions) && worker.permissions.includes(slug);
    },
    [worker, isOwner]
  );

  return (
    <AuthContext.Provider value={{ worker, login, logout, isOwner, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
