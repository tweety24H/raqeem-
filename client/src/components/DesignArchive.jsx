import { useEffect, useRef, useState } from 'react';
import api, { fileUrl } from '../api/client';
import Modal from './Modal';
import { useLanguage } from '../context/LanguageContext';
import { formatDateTime } from '../utils/format';
import { fileIcon, isImageType, isPreviewable, formatBytes, downloadDesignFile } from '../utils/fileHelpers';

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.ai,.psd,.cdr,.eps';

export function DesignCard({ file, onDeleted, showOrder }) {
  const { t } = useLanguage();

  async function remove() {
    if (!confirm(t('designs.confirmDelete'))) return;
    await api.delete(`/designs/${file.id}`);
    onDeleted?.();
  }

  return (
    <div className="rounded-xl border border-slate-200 p-2 dark:border-white/10">
      <a href={fileUrl(file.file_path)} target="_blank" rel="noreferrer">
        {isImageType(file.file_type) ? (
          <img
            src={fileUrl(file.file_path)}
            alt={file.file_name}
            className="mb-2 h-24 w-full rounded-lg object-cover"
          />
        ) : (
          <div className="mb-2 flex h-24 w-full items-center justify-center rounded-lg bg-slate-100 text-3xl dark:bg-white/5">
            {fileIcon(file.file_type)}
          </div>
        )}
      </a>
      {showOrder && file.order_number && (
        <div className="truncate text-xs font-semibold text-nili dark:text-gold">#{file.order_number}</div>
      )}
      <div className="truncate text-xs font-medium text-slate-800 dark:text-slate-200" title={file.file_name}>
        {file.file_name}
      </div>
      <div className="text-xs text-slate-400 dark:text-slate-500">
        {formatBytes(file.file_size)} · {formatDateTime(file.uploaded_at)}
      </div>
      <div className="mt-1 flex flex-wrap gap-2 text-xs">
        {isPreviewable(file.file_type) && (
          <a href={fileUrl(file.file_path)} target="_blank" rel="noreferrer" className="text-nili hover:underline dark:text-gold">
            {t('designs.preview')}
          </a>
        )}
        <button onClick={() => downloadDesignFile(api, file)} className="text-emerald-600 hover:underline dark:text-emerald-400">
          {t('designs.download')}
        </button>
        <button onClick={remove} className="text-rose-500 hover:underline dark:text-rose-400">
          {t('designs.delete')}
        </button>
      </div>
    </div>
  );
}

export function OrderDesignsSection({ orderId, customerId }) {
  const { t } = useLanguage();
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
      setError(err.response?.data?.error || t('designs.errorUpload'));
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
      <h2 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">{t('designs.heading')}</h2>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`mb-4 cursor-pointer rounded-xl border-2 border-dashed px-4 py-6 text-center text-sm transition ${
          dragOver
            ? 'border-nili bg-nili/5 text-nili'
            : 'border-slate-300 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5'
        }`}
      >
        {uploading ? t('designs.uploading') : t('designs.dropHint')}
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

      {error && (
        <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {files.map((f) => (
          <DesignCard key={f.id} file={f} onDeleted={load} />
        ))}
        {files.length === 0 && (
          <div className="col-span-full py-4 text-center text-sm text-slate-400 dark:text-slate-500">
            {t('designs.noDesignsOrder')}
          </div>
        )}
      </div>
    </div>
  );
}

export function CustomerDesignsModal({ customer, onClose }) {
  const { t } = useLanguage();
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
    <Modal open title={`${t('designs.archiveTitlePrefix')}: ${customer.name}`} onClose={onClose} width="max-w-3xl">
      {!files ? (
        <div className="py-6 text-center text-slate-400 dark:text-slate-500">{t('common.loading')}</div>
      ) : groups.length === 0 ? (
        <div className="py-6 text-center text-slate-400 dark:text-slate-500">{t('designs.noDesignsCustomer')}</div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.orderId}>
              <h3 className="mb-2 text-sm font-semibold text-nili dark:text-gold">
                {t('designs.orderPrefix')} #{g.orderNumber}
              </h3>
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
