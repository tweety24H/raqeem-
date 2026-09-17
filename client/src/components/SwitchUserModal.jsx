import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';
import UserPinPad from './UserPinPad';

function initials(name) {
  return (name || '?').trim().charAt(0);
}

// Quick switch to another worker's session without a full logout — picks a
// worker, enters their PIN inline, and the successful login just overwrites
// the current session (same mechanism the login screen uses).
export default function SwitchUserModal({ open, onClose }) {
  const { worker, login } = useAuth();
  const navigate = useNavigate();
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setError('');
    api
      .get('/auth/login-options')
      .then((r) => setOptions(r.data.workers.filter((w) => w.id !== worker?.id)))
      .catch(() => setOptions([]));
  }, [open, worker]);

  async function submitPin(pin) {
    setError('');
    setLoading(true);
    try {
      await login(pin);
      onClose();
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'رمز PIN غير صحيح');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="تبديل المستخدم">
      {!selected ? (
        <div className="space-y-2">
          {options.length === 0 && <p className="text-sm text-slate-400">لا يوجد مستخدمون آخرون</p>}
          {options.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setSelected(w)}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 text-right transition hover:border-[#C5A880] hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0B1D3A] text-sm font-bold text-[#C5A880]">
                {initials(w.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{w.name}</span>
                <span className="block truncate text-xs text-slate-400">{w.roleLabel}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div>
          <div className="mb-5 flex flex-col items-center">
            <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#0B1D3A] text-lg font-bold text-[#C5A880]">
              {initials(selected.name)}
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-100">{selected.name}</p>
            <p className="text-xs text-slate-400">أدخل رمز PIN</p>
          </div>
          <UserPinPad onSubmit={submitPin} loading={loading} error={error} onClear={() => setError('')} />
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setError('');
            }}
            className="mt-4 w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ← رجوع
          </button>
        </div>
      )}
    </Modal>
  );
}
