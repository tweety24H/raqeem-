import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/client';

const CONFIRM_WORD = 'حذف';

// مودال حذف موظف - تأكيد مضاعف (يكتب كلمة "حذف" + يدخل رمز PIN المالك
// نفسه) لأنها عملية حذف ناعم (active=0) بس ما نريدها تصير بضغطة وحدة غلط.
export default function DeleteWorkerModal({ worker, onClose, onDeleted }) {
  const [confirmText, setConfirmText] = useState('');
  const [ownerPin, setOwnerPin] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const canConfirm = confirmText === CONFIRM_WORD && ownerPin.length >= 4;

  async function handleDelete() {
    setError('');
    setDeleting(true);
    try {
      const res = await api.delete(`/auth/workers/${worker.id}`, { data: { confirmText, ownerPin } });
      onDeleted(res.data.openOrders || 0);
    } catch (err) {
      setError(err.response?.data?.error || 'فشل الحذف');
    } finally {
      setDeleting(false);
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
          className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mb-4 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-danger/15 text-2xl dark:bg-danger/15">
              🗑️
            </span>
            <h3 className="font-bold text-[#0B1D3A] dark:text-white">هل أنت متأكد من حذف {worker.name}؟</h3>
            <p className="mt-2 text-xs text-danger dark:text-danger">سيتم حذف جميع بيانات دخوله، لا يمكن التراجع</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="label">اكتب كلمة «{CONFIRM_WORD}» للتأكيد</label>
              <input
                className="input"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={CONFIRM_WORD}
                autoFocus
              />
            </div>
            <div>
              <label className="label">رمز PIN الخاص بيك (المالك)</label>
              <input
                className="input"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={ownerPin}
                onChange={(e) => setOwnerPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger dark:bg-danger/10 dark:text-danger">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                إلغاء
              </button>
              <button
                type="button"
                disabled={!canConfirm || deleting}
                onClick={handleDelete}
                className="flex-1 rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-danger/20 transition hover:bg-danger disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
