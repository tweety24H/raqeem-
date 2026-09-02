import { createContext, useContext, useState, useCallback } from 'react';
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

  const isOwner = worker?.role === 'owner';

  return (
    <AuthContext.Provider value={{ worker, login, logout, isOwner }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
