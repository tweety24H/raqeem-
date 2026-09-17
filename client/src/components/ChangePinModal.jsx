import { useState } from 'react';
import { Save } from 'lucide-react';
import api from '../api/client';
import Button from './ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';

// مودال "تغيير رمزي" — ذاتي الخدمة لأي موظف مسجّل دخول (وليس إعادة تعيين
// المالك لرمز موظف آخر، تلك عملية منفصلة موجودة أصلاً بـ EditWorkerModal).
// يتحقق من الرمز الحالي فعليًا عبر السيرفر قبل قبول الرمز الجديد.
export default function ChangePinModal({ open, onClose }) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  function reset() {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setError('');
    setDone(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!/^\d{4}$/.test(newPin)) {
      setError('الرمز الجديد يجب أن يكون 4 أرقام بالضبط');
      return;
    }
    if (newPin !== confirmPin) {
      setError('تأكيد الرمز الجديد غير مطابق');
      return;
    }
    setSaving(true);
    try {
      await api.post('/auth/change-pin', { currentPin, newPin });
      setDone(true);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (err) {
      setError(err.response?.data?.error || 'فشل تغيير الرمز');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent dir="rtl" className="max-w-sm text-right">
        <DialogHeader>
          <DialogTitle>تغيير رمز الدخول (PIN)</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {error && (
            <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger dark:bg-danger/10 dark:text-danger">
              {error}
            </div>
          )}
          {done && (
            <div className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success dark:bg-success/10 dark:text-success">
              تم تغيير الرمز بنجاح
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="current-pin">الرمز الحالي</Label>
            <Input
              id="current-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              required
              autoFocus
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-pin">الرمز الجديد (4 أرقام)</Label>
            <Input
              id="new-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              required
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-pin">تأكيد الرمز الجديد</Label>
            <Input
              id="confirm-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              required
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="secondary" magnetic={false} onClick={handleClose}>
              إلغاء
            </Button>
            <Button type="submit" variant="gold" magnetic={false} disabled={saving} className="inline-flex items-center gap-1.5">
              <Save className="h-4 w-4" />
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
