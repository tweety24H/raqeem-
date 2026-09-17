import { useEffect, useState } from 'react';
import { Eye, Download, PackagePlus, Check, X } from 'lucide-react';
import api, { fileUrl } from '../api/client';
import PageHeader from '../components/PageHeader';
import { formatDateTime } from '../utils/format';
import Button from '../components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';

const isElectron = typeof window !== 'undefined' && !!window.raqeem?.isElectron;

const STATUS_STYLE = {
  جديد: 'bg-gold/15 text-gold-dark',
  'تمت المراجعة': 'bg-success/15 text-success',
  مرفوض: 'bg-danger/15 text-danger',
  'وارد من QR - بانتظار المراجعة': 'bg-gold/15 text-gold-dark',
};

export default function Requests() {
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [convertMsg, setConvertMsg] = useState({});

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await api.get('/requests');
    setRequests(res.data.requests);
  }

  async function accept(id) {
    await api.patch(`/requests/${id}`, { status: 'تمت المراجعة' });
    load();
  }

  async function confirmReject(reason) {
    await api.patch(`/requests/${rejectTarget.id}`, { status: 'مرفوض', reject_reason: reason });
    setRejectTarget(null);
    load();
  }

  async function convert(id) {
    try {
      const res = await api.post(`/requests/${id}/convert`);
      setConvertMsg((m) => ({ ...m, [id]: { ok: true, text: `تم إنشاء الطلب رقم ${res.data.orderNumber}` } }));
      load();
    } catch (err) {
      setConvertMsg((m) => ({ ...m, [id]: { ok: false, text: err.response?.data?.error || 'فشل التحويل' } }));
    }
  }

  // "حفظ التصميم في الجهاز" — Electron: نافذة حفظ نظامية حقيقية عبر IPC
  // (الرندرر يجيب البايتات بـ fetch عادي، والحفظ الفعلي على القرص يصير
  // بعملية Electron الرئيسية). متصفح عادي: تنزيل قياسي عبر <a download>.
  async function downloadDesign(r) {
    const ext = (r.file_path.match(/\.[a-zA-Z0-9]+$/) || ['.jpg'])[0];
    const safeCustomer = (r.customer_name || 'design').replace(/\s+/g, '_');
    const suggestedName = `design_${safeCustomer}_${r.id}${ext}`;

    const res = await api.get(`/requests/download/${r.id}`, { responseType: 'blob' });

    if (isElectron) {
      const buffer = await res.data.arrayBuffer();
      await window.raqeem.dialog.saveFile(new Uint8Array(buffer), suggestedName);
    } else {
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = suggestedName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  }

  const term = search.trim().toLowerCase();
  const filtered = term
    ? requests.filter(
        (r) =>
          r.customer_name?.toLowerCase().includes(term) ||
          r.phone?.toLowerCase().includes(term) ||
          r.service_text?.toLowerCase().includes(term)
      )
    : requests;

  return (
    <div className="p-6">
      <PageHeader title="طلبات الزبائن الواردة" subtitle="طلبات وصلت عبر صفحة QR المحلية بانتظار المراجعة" />

      <input
        className="input mb-4 max-w-xs"
        placeholder="ابحث بالاسم، الهاتف، أو الخدمة..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="space-y-3">
        {filtered.map((r) => (
          <div key={r.id} className="card flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-1 gap-4">
              {r.file_path && (
                <button
                  type="button"
                  onClick={() => setPreviewUrl(fileUrl(r.file_path))}
                  className="shrink-0 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10"
                  title="اضغط للتكبير"
                >
                  <img src={fileUrl(r.file_path)} alt="معاينة التصميم" className="h-20 w-20 object-cover" />
                </button>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-800 dark:text-slate-100">طلب رقم #{r.id}</span>
                  {r.request_type === 'full_order' && (
                    <span className="badge bg-nili/10 text-nili dark:bg-nili-light/20 dark:text-nili-light">طلب كامل</span>
                  )}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  {r.customer_name} <span className="text-slate-400">· {r.phone}</span>
                </div>
                {r.service_text && (
                  <div className="text-sm text-slate-600 dark:text-slate-300">
                    الخدمة: {r.service_text}
                    {r.quantity ? ` — الكمية: ${r.quantity}` : ''}
                  </div>
                )}
                {r.specs && <div className="text-sm text-slate-500 dark:text-slate-400">المواصفات: {r.specs}</div>}
                {r.notes && <div className="text-sm text-slate-500 dark:text-slate-400">{r.notes}</div>}
                {r.status === 'مرفوض' && r.reject_reason && (
                  <div className="mt-1 text-sm text-danger">سبب الرفض: {r.reject_reason}</div>
                )}
                <div className="mt-1 text-xs text-slate-400">{formatDateTime(r.created_at)}</div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {r.file_path && (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        magnetic={false}
                        className="!px-3 !py-1.5 !text-xs"
                        onClick={() => setPreviewUrl(fileUrl(r.file_path))}
                      >
                        <Eye className="ml-1 inline h-3.5 w-3.5" /> معاينة التصميم
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        magnetic={false}
                        className="!px-3 !py-1.5 !text-xs"
                        onClick={() => downloadDesign(r)}
                      >
                        <Download className="ml-1 inline h-3.5 w-3.5" /> حفظ التصميم في الجهاز
                      </Button>
                    </>
                  )}
                  {r.order_id && (
                    <a
                      href={`#/orders/${r.order_id}`}
                      className="inline-flex items-center rounded-lg bg-nili/10 px-3 py-1.5 text-xs font-semibold text-nili hover:bg-nili/15 dark:bg-nili-light/10 dark:text-nili-light"
                    >
                      عرض الطلب المُنشأ
                    </a>
                  )}
                  {!r.order_id && (r.status === 'تمت المراجعة') && (
                    <Button
                      type="button"
                      variant="gold"
                      magnetic={false}
                      className="!px-3 !py-1.5 !text-xs"
                      onClick={() => convert(r.id)}
                    >
                      <PackagePlus className="ml-1 inline h-3.5 w-3.5" /> تحويل الى طلب
                    </Button>
                  )}
                </div>
                {convertMsg[r.id] && (
                  <div className={`mt-1 text-xs font-semibold ${convertMsg[r.id].ok ? 'text-success' : 'text-danger'}`}>
                    {convertMsg[r.id].text}
                  </div>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className={`badge ${STATUS_STYLE[r.status] || 'bg-slate-100 text-slate-600'}`}>{r.status}</span>
              {(r.status === 'جديد' || r.status === 'وارد من QR - بانتظار المراجعة') && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    magnetic={false}
                    className="!px-3 !py-1.5 !text-xs !text-success"
                    onClick={() => accept(r.id)}
                  >
                    <Check className="ml-1 inline h-3.5 w-3.5" /> قبول
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    magnetic={false}
                    className="!px-3 !py-1.5 !text-xs !text-danger"
                    onClick={() => setRejectTarget(r)}
                  >
                    <X className="ml-1 inline h-3.5 w-3.5" /> رفض
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-8 text-center text-slate-400">{term ? 'لا توجد نتائج' : 'لا توجد طلبات واردة'}</div>
        )}
      </div>

      <Dialog open={!!previewUrl} onOpenChange={(o) => !o && setPreviewUrl(null)}>
        <DialogContent dir="rtl" className="max-w-2xl text-center">
          <DialogHeader>
            <DialogTitle>معاينة التصميم</DialogTitle>
          </DialogHeader>
          {previewUrl && <img src={previewUrl} alt="تصميم" className="mx-auto max-h-[70vh] rounded-lg object-contain" />}
        </DialogContent>
      </Dialog>

      <RejectModal request={rejectTarget} onClose={() => setRejectTarget(null)} onConfirm={confirmReject} />
    </div>
  );
}

function RejectModal({ request, onClose, onConfirm }) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (request) setReason('');
  }, [request]);

  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="max-w-sm text-right">
        <DialogHeader>
          <DialogTitle>سبب الرفض</DialogTitle>
        </DialogHeader>
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="اكتب سبب رفض الطلب..." />
        <DialogFooter className="pt-1">
          <Button type="button" variant="secondary" magnetic={false} onClick={onClose}>
            إلغاء
          </Button>
          <Button
            type="button"
            variant="primary"
            magnetic={false}
            className="flex-1 !bg-danger hover:!bg-danger/90"
            onClick={() => onConfirm(reason)}
          >
            تأكيد الرفض
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
