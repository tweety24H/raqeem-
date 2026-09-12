import { useState } from 'react';
import { motion } from 'framer-motion';
import api from '../api/client';

// مودال اضافة موظف جديد
export default function AddEmployeeModal({ onClose, onAdded }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('designer');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !pin) {
      setError('أكمل كل الحقول');
      return;
    }
    if (pin.length < 4) {
      setError('PIN يجب أن يكون 4 أرقام على الأقل');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // حاول انشاء عبر السيرفر
      const res = await api.post('/auth/quick-create', {
        name: name.trim(),
        role,
        pin
      }).catch(() => null);

      if (res?.data?.worker) {
        onAdded(res.data.worker);
      } else {
        // لو الـ API ما موجود، انشئ محليا مؤقتا
        const localWorker = {
          id: 'local-' + Date.now(),
          name: name.trim(),
          role,
          roleLabel: role === 'designer' ? 'مصمم' : role === 'cashier' ? 'كاشير' : 'موظف',
          isDemo: true,
        };
        onAdded(localWorker);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'فشل في الإضافة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
        dir="rtl"
      >
        <h3 className="mb-4 text-center font-bold text-[#0B1D3A]">+ اضافة موظف</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">الاسم</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: أحمد"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#C5A880] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">الدور</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#C5A880] focus:outline-none"
            >
              <option value="designer">مصمم</option>
              <option value="cashier">كاشير</option>
              <option value="employee">موظف</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">رمز PIN (4 أرقام)</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm tracking-widest text-center focus:border-[#C5A880] focus:outline-none"
            />
          </div>

          {error && <p className="text-center text-xs text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-[#0B1D3A] py-2.5 text-sm font-bold text-white hover:bg-[#1a2f5a] disabled:opacity-50"
            >
              {loading ? 'جاري...' : 'إضافة'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
