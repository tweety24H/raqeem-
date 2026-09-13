import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import api from '../api/client';
import Button from './ui/Button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from './ui/alert-dialog';

const CONFIRM_WORD = 'حذف';

// مودال حذف موظف - تأكيد مضاعف (يكتب كلمة "حذف" + يدخل رمز PIN المالك
// نفسه) لأنها عملية حذف ناعم (active=0) بس ما نريدها تصير بضغطة وحدة غلط.
// زر التأكيد الفعلي ليس AlertDialogAction (يسكر تلقائيًا) لأننا نحتاج ننتظر
// رد السيرفر أولاً ونبقي المودال مفتوح لو صار خطأ.
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
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent dir="rtl" className="text-right">
        <AlertDialogHeader className="items-center text-center">
          <span className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-danger/15 text-danger dark:bg-danger/15">
            <Trash2 className="h-6 w-6" />
          </span>
          <AlertDialogTitle>هل أنت متأكد من حذف {worker.name}؟</AlertDialogTitle>
          <AlertDialogDescription className="text-danger dark:text-danger">
            سيتم حذف جميع بيانات دخوله، لا يمكن التراجع
          </AlertDialogDescription>
        </AlertDialogHeader>

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

          <AlertDialogFooter className="pt-2">
            <AlertDialogCancel className="flex-1">إلغاء</AlertDialogCancel>
            <Button
              type="button"
              magnetic={false}
              disabled={!canConfirm || deleting}
              onClick={handleDelete}
              className="flex-1 !bg-danger text-white hover:!bg-danger/90"
            >
              {deleting ? 'جاري الحذف...' : 'تأكيد الحذف'}
            </Button>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
