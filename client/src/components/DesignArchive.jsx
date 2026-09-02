import { useEffect, useRef, useState } from 'react';
import api, { fileUrl } from '../api/client';
import Modal from './Modal';
import { formatDateTime } from '../utils/format';
import { fileIcon, isImageType, isPreviewable, formatBytes, downloadDesignFile } from '../utils/fileHelpers';

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.ai,.psd,.cdr,.eps';
const HINT = 'اسحب ملفًا هنا أو اضغط للاختيار (PDF, JPG, PNG, AI, PSD, CDR, EPS — حتى 20 ميجابايت)';

export function DesignCard({ file, onDeleted, showOrder }) {
  async function remove() {
    if (!confirm('حذف هذا التصميم؟')) return;
    await api.delete(`/designs/${file.id}`);
    onDeleted?.();
  }

  return (
    <div className="rounded-xl border border-slate-200 p-2">
      <a href={fileUrl(file.file_path)} target="_blank" rel="noreferrer">
        {isImageType(file.file_type) ? (
          <img
            src={fileUrl(file.file_path)}
            alt={file.file_name}
            className="mb-2 h-24 w-full rounded-lg object-cover"
          />
        ) : (
          <div className="mb-2 flex h-24 w-full items-center justify-center rounded-lg bg-slate-100 text-3xl">
            {fileIcon(file.file_type)}
          </div>
        )}
      </a>
      {showOrder && file.order_number && (
        <div className="truncate text-xs font-semibold text-nili">#{file.order_number}</div>
      )}
      <div className="truncate text-xs font-medium text-slate-800" title={file.file_name}>
        {file.file_name}
      </div>
      <div className="text-xs text-slate-400">
        {formatBytes(file.file_size)} · {formatDateTime(file.uploaded_at)}
      </div>
      <div className="mt-1 flex flex-wrap gap-2 text-xs">
        {isPreviewable(file.file_type) && (
          <a href={fileUrl(file.file_path)} target="_blank" rel="noreferrer" className="text-nili hover:underline">
            معاينة
          </a>
        )}
        <button onClick={() => downloadDesignFile(api, file)} className="text-emerald-600 hover:underline">
          تحميل
        </button>
        <button onClick={remove} className="text-rose-500 hover:underline">
          حذف
        </button>
      </div>
    </div>
  );
}

export function OrderDesignsSection({ orderId, customerId }) {
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    load();
  }, [orderId]);

  async function load() {
    const res = await api.get(`/designs/order/${orderId}`);
    setFiles(res.data.files);
  }

  async function upload(file) {
    setError('');
    setUploading(true);
    try {
      const fd = new FormData();
      // ترتيب الحقول مهم: customer_id/order_id يجب أن يسبقا الملف
      fd.append('customer_id', customerId);
      fd.append('order_id', orderId);
      fd.append('file', file);
      await api.post('/designs/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'فشل رفع الملف');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  }

  return (
    <div className="card">
      <h2 className="mb-3 font-semibold text-slate-700">التصاميم 📁</h2>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`mb-4 cursor-pointer rounded-xl border-2 border-dashed px-4 py-6 text-center text-sm transition ${
          dragOver ? 'border-nili bg-nili/5 text-nili' : 'border-slate-300 text-slate-500 hover:bg-slate-50'
        }`}
      >
        {uploading ? 'جاري الرفع...' : HINT}
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={ACCEPT}
          onChange={(e) => {
            if (e.target.files[0]) upload(e.target.files[0]);
            e.target.value = '';
          }}
        />
      </div>

      {error && <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {files.map((f) => (
          <DesignCard key={f.id} file={f} onDeleted={load} />
        ))}
        {files.length === 0 && (
          <div className="col-span-full py-4 text-center text-sm text-slate-400">لا توجد تصاميم لهذا الطلب بعد</div>
        )}
      </div>
    </div>
  );
}

export function CustomerDesignsModal({ customer, onClose }) {
  const [files, setFiles] = useState(null);

  useEffect(() => {
    load();
  }, [customer.id]);

  async function load() {
    const res = await api.get(`/designs/customer/${customer.id}`);
    setFiles(res.data.files);
  }

  const groups = [];
  const groupIndex = {};
  for (const f of files || []) {
    if (!(f.order_id in groupIndex)) {
      groupIndex[f.order_id] = groups.length;
      groups.push({ orderId: f.order_id, orderNumber: f.order_number, items: [] });
    }
    groups[groupIndex[f.order_id]].items.push(f);
  }

  return (
    <Modal open title={`أرشيف تصاميم: ${customer.name}`} onClose={onClose} width="max-w-3xl">
      {!files ? (
        <div className="py-6 text-center text-slate-400">جاري التحميل...</div>
      ) : groups.length === 0 ? (
        <div className="py-6 text-center text-slate-400">لا توجد تصاميم محفوظة لهذا الزبون</div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.orderId}>
              <h3 className="mb-2 text-sm font-semibold text-nili">طلب #{g.orderNumber}</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {g.items.map((f) => (
                  <DesignCard key={f.id} file={f} onDeleted={load} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
