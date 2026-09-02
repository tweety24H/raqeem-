import { useEffect, useState } from 'react';
import api, { fileUrl } from '../api/client';
import PageHeader from '../components/PageHeader';
import { formatDateTime } from '../utils/format';

export default function Requests() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await api.get('/requests');
    setRequests(res.data.requests);
  }

  async function markReviewed(id) {
    await api.patch(`/requests/${id}`, { status: 'تمت المراجعة' });
    load();
  }

  return (
    <div className="p-6">
      <PageHeader title="طلبات الزبائن الواردة" subtitle="طلبات وصلت عبر صفحة QR المحلية بانتظار المراجعة" />

      <div className="space-y-3">
        {requests.map((r) => (
          <div key={r.id} className="card flex items-start justify-between">
            <div>
              <div className="font-medium text-slate-800">
                {r.customer_name} <span className="text-slate-400">· {r.phone}</span>
              </div>
              {r.service_text && <div className="text-sm text-slate-600">الخدمة المطلوبة: {r.service_text}</div>}
              {r.notes && <div className="text-sm text-slate-500">{r.notes}</div>}
              {r.file_path && (
                <a href={fileUrl(r.file_path)} target="_blank" rel="noreferrer" className="text-sm text-nili underline">
                  عرض الملف المرفق
                </a>
              )}
              <div className="mt-1 text-xs text-slate-400">{formatDateTime(r.created_at)}</div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`badge ${r.status === 'جديد' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {r.status}
              </span>
              {r.status === 'جديد' && (
                <button className="text-xs text-nili hover:underline" onClick={() => markReviewed(r.id)}>
                  تمت المراجعة
                </button>
              )}
            </div>
          </div>
        ))}
        {requests.length === 0 && <div className="py-8 text-center text-slate-400">لا توجد طلبات واردة</div>}
      </div>
    </div>
  );
}
