import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/client';

// مودال تعديل موظف موجود - الاسم والدور جاهزين مسبقًا، وحقل الـ PIN
// نخليه فاضي دائمًا (ما نعرض رمزه القديم - مو موجود عنا أصلاً لأنه مشفّر)
// وياخذ رمز جديد بس اذا كتب المستخدم شي فيه.
export default function EditWorkerModal({ worker, roles, onClose, onSaved }) {
  const [name, setName] = useState(worker.name);
  const [roleId, setRoleId] = useState(worker.role_id || '');
  const [isOwnerRole, setIsOwnerRole] = useState(worker.role === 'owner');
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (pin && pin.length < 4) {
      setError('رمز PIN يجب يكون 4 أرقام على الأقل');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        role: isOwnerRole ? 'owner' : 'employee',
        role_id: roleId || null,
      };
      if (pin) body.pin = pin;
      await api.patch(`/auth/workers/${worker.id}`, body);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'فشل التعديل');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          dir="rtl"
          className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900"
        >
          <h3 className="mb-4 text-center font-bold text-[#1A2744] dark:text-white">✏️ تعديل بيانات {worker.name}</h3>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="label">الاسم</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </div>

            <div>
              <label className="label">الدور (حزمة الصلاحيات)</label>
              <select className="input" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                <option value="">بدون دور محدد</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={isOwnerRole} onChange={(e) => setIsOwnerRole(e.target.checked)} />
              مالك (وصول كامل لكل شي)
            </label>

            <div>
              <label className="label">رمز PIN جديد (اختياري)</label>
              <input
                className="input"
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="اتركه فاضي إذا ما تريد تغييره"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                إلغاء
              </button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
