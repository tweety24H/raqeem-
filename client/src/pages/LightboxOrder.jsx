import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { fileUrl } from '../api/client';
import VerifyQR from '../components/VerifyQR';
import { formatIQD, formatDate } from '../utils/format';
import { buildLightboxOrderLink } from '../utils/whatsapp';

const DRAFT_KEY = 'raqeem_lightbox_draft';

const AD_TYPES = [
  { value: 'صندوق', label: 'صندوق', icon: '📦' },
  { value: 'فلكس', label: 'فلكس', icon: '🖼️' },
  { value: 'حروف بارزة', label: 'حروف بارزة', icon: '🔤' },
];

const LIGHTING_TYPES = [
  { value: 'LED', label: 'LED', icon: '💡' },
  { value: 'نيون', label: 'نيون', icon: '✨' },
  { value: 'بدون', label: 'بدون', icon: '🚫' },
];

const FLEX_TYPES = [
  { value: 'صيني', label: 'صيني' },
  { value: 'كوري', label: 'كوري' },
  { value: 'الماني', label: 'الماني' },
];

const emptyItem = () => ({ description: '', quantity: 1, unit_price: 0 });

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function LightboxOrder() {
  const draft = useRef(loadDraft()).current;

  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState(draft?.customerSearch || '');
  const [customerId, setCustomerId] = useState(draft?.customerId || '');
  const [customerName, setCustomerName] = useState(draft?.customerName || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });

  const [items, setItems] = useState(draft?.items?.length ? draft.items : [emptyItem()]);
  const [paidAmount, setPaidAmount] = useState(draft?.paidAmount ?? 0);

  const [adType, setAdType] = useState(draft?.adType || 'صندوق');
  const [lightingType, setLightingType] = useState(draft?.lightingType || 'LED');
  const [flexType, setFlexType] = useState(draft?.flexType || 'صيني');
  const [width, setWidth] = useState(draft?.width || '');
  const [length, setLength] = useState(draft?.length || '');
  const [userNotes, setUserNotes] = useState(draft?.userNotes || '');
  const [designFile, setDesignFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const [shopSettings, setShopSettings] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedOrder, setSavedOrder] = useState(null);

  const fileInputRef = useRef(null);
  const today = new Date();

  useEffect(() => {
    api.get('/settings').then((r) => setShopSettings(r.data.settings || {})).catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/customers', { params: { search: customerSearch || undefined } }).then((r) => setCustomers(r.data.customers));
  }, [customerSearch]);

  // مسودة تلقائية بـ localStorage حتى ما تضيع البيانات لو انسكر المتصفح
  useEffect(() => {
    if (savedOrder) return;
    const snapshot = {
      customerSearch,
      customerId,
      customerName,
      items,
      paidAmount,
      adType,
      lightingType,
      flexType,
      width,
      length,
      userNotes,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(snapshot));
  }, [customerSearch, customerId, customerName, items, paidAmount, adType, lightingType, flexType, width, length, userNotes, savedOrder]);

  const subtotal = useMemo(
    () => items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0), 0),
    [items]
  );
  const paid = Math.min(Math.max(Number(paidAmount) || 0, 0), subtotal || Infinity);
  const remaining = Math.max(subtotal - paid, 0);
  const area = Math.round((Number(width) || 0) * (Number(length) || 0) * 100) / 100;

  function updateItem(idx, patch) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function pickCustomer(c) {
    setCustomerId(String(c.id));
    setCustomerName(c.name);
    setCustomerSearch(c.name);
    setShowSuggestions(false);
  }

  async function createCustomer() {
    if (!newCustomer.name) return;
    const res = await api.post('/customers', newCustomer);
    pickCustomer({ id: res.data.id, name: newCustomer.name });
    setShowNewCustomer(false);
    setNewCustomer({ name: '', phone: '' });
  }

  function handleFile(f) {
    if (f) setDesignFile(f);
  }

  async function submit() {
    setError('');
    if (!customerId) return setError('اختر الزبون أولًا من قائمة الاقتراحات');
    if (items.length === 0 || items.some((it) => !it.description || !it.quantity || !it.unit_price)) {
      return setError('أكمل تفاصيل كل صنف بالجدول (الوصف، العدد، السعر)');
    }
    setSaving(true);
    try {
      const specLines = [
        `نوع الاعلان: ${adType}`,
        `نوع الاضاءة: ${lightingType}`,
        ...(adType === 'فلكس' ? [`نوع الفلكس: ${flexType}`] : []),
        width && length ? `الابعاد: ${length} × ${width} م (المساحة: ${area} م²)` : null,
        userNotes ? `ملاحظات: ${userNotes}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      const paymentType = paid <= 0 ? 'debt' : paid >= subtotal ? 'full' : 'partial';

      const payload = {
        customer_id: Number(customerId),
        items: items.map((it) => ({
          description: it.description,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
        })),
        discount: 0,
        payment_type: paymentType,
        paid_amount: paymentType === 'partial' ? paid : undefined,
        notes: specLines,
      };

      const res = await api.post('/orders', payload);

      if (designFile) {
        const fd = new FormData();
        fd.append('customer_id', customerId);
        fd.append('order_id', res.data.orderId);
        fd.append('file', designFile);
        await api.post('/designs/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }

      setSavedOrder({
        orderId: res.data.orderId,
        orderNumber: res.data.orderNumber,
        subtotal,
        paid,
        remaining,
      });
      localStorage.removeItem(DRAFT_KEY);
    } catch (err) {
      setError(err.response?.data?.error || 'فشل حفظ الطلب');
    } finally {
      setSaving(false);
    }
  }

  function sendWhatsapp() {
    const customer = customers.find((c) => String(c.id) === String(customerId)) || { name: customerName, phone: '' };
    const link = buildLightboxOrderLink(customer, savedOrder);
    if (!link) {
      alert('لا يوجد رقم هاتف مسجل لهذا الزبون');
      return;
    }
    window.open(link, '_blank');
  }

  if (savedOrder) {
    return (
      <PrintReceipt
        order={savedOrder}
        customerName={customerName}
        items={items}
        adType={adType}
        lightingType={lightingType}
        flexType={flexType}
        width={width}
        length={length}
        area={area}
        userNotes={userNotes}
        shopSettings={shopSettings}
        onSendWhatsapp={sendWhatsapp}
        onNewOrder={() => window.location.reload()}
      />
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">طلب إعلان ضوئي</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">تحويل الوصل الورقي إلى فورم رقمي حديث</p>
        </div>

        {/* الهيدر */}
        <div className="mb-5 rounded-2xl border border-nili/10 bg-nili/5 p-5 dark:border-nili-light/20 dark:bg-nili-light/5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="relative sm:col-span-2">
              <label className="label">الزبون</label>
              {!showNewCustomer ? (
                <>
                  <input
                    className="input"
                    placeholder="اكتب اسم الزبون أو رقم الهاتف..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setCustomerId('');
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  />
                  {showSuggestions && customerSearch && (
                    <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-white/10 dark:bg-[#1a1a23]">
                      {customers.length === 0 && (
                        <button
                          type="button"
                          className="block w-full px-4 py-3 text-right text-sm text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5"
                          onMouseDown={() => {
                            setNewCustomer({ name: customerSearch, phone: '' });
                            setShowNewCustomer(true);
                            setShowSuggestions(false);
                          }}
                        >
                          + إضافة "{customerSearch}" كزبون جديد
                        </button>
                      )}
                      {customers.map((c) => (
                        <button
                          type="button"
                          key={c.id}
                          onMouseDown={() => pickCustomer(c)}
                          className="flex w-full items-center justify-between px-4 py-2.5 text-right text-sm hover:bg-nili/5 dark:text-slate-200 dark:hover:bg-white/5"
                        >
                          <span>
                            {c.name} {c.phone && <span className="text-slate-400 dark:text-slate-500">· {c.phone}</span>}
                          </span>
                          {c.debt > 0 && <span className="text-xs text-rose-600 dark:text-rose-400">دين: {formatIQD(c.debt)}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {customerId && (
                    <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">✓ تم اختيار {customerName}</p>
                  )}
                </>
              ) : (
                <div className="flex gap-2">
                  <input
                    className="input"
                    placeholder="اسم الزبون"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="رقم الهاتف"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  />
                  <button type="button" className="btn-primary shrink-0" onClick={createCustomer}>
                    حفظ
                  </button>
                  <button type="button" className="btn-secondary shrink-0" onClick={() => setShowNewCustomer(false)}>
                    إلغاء
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="label">رقم الوصل</label>
              <div className="input flex items-center bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500">
                سيتولد تلقائيًا
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">التاريخ: {formatDate(today.toISOString())}</div>
        </div>

        {/* الجدول الديناميكي */}
        <div className="card mb-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700 dark:text-slate-200">عناصر الطلب</h2>
            <button type="button" className="btn-secondary" onClick={() => setItems((p) => [...p, emptyItem()])}>
              + إضافة صنف
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400">
                <tr>
                  <th className="rounded-r-lg px-3 py-2 text-right">التفاصيل</th>
                  <th className="px-3 py-2 text-right">العدد</th>
                  <th className="px-3 py-2 text-right">سعر المفرد</th>
                  <th className="px-3 py-2 text-right">المجموع</th>
                  <th className="rounded-l-lg px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} className="border-t border-slate-100 dark:border-white/5">
                    <td className="px-3 py-2">
                      <input
                        className="input"
                        placeholder="مثال: صندوق فلكس مضاء"
                        value={it.description}
                        onChange={(e) => updateItem(idx, { description: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="input w-24"
                        type="number"
                        step="any"
                        value={it.quantity}
                        onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="input w-32"
                        type="number"
                        step="any"
                        value={it.unit_price}
                        onChange={(e) => updateItem(idx, { unit_price: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">
                      {formatIQD(Number(it.quantity || 0) * Number(it.unit_price || 0))}
                    </td>
                    <td className="px-3 py-2">
                      {items.length > 1 && (
                        <button
                          type="button"
                          className="text-rose-500 hover:underline"
                          onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
                        >
                          حذف
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 dark:bg-white/5 sm:grid-cols-3">
            <div className="text-center">
              <div className="text-xs text-slate-500 dark:text-slate-400">المجموع الكلي</div>
              <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{formatIQD(subtotal)}</div>
            </div>
            <div>
              <label className="label text-center block">الواصل</label>
              <input
                className="input text-center"
                type="number"
                step="any"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
              />
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-500 dark:text-slate-400">المتبقي</div>
              <div className={`text-lg font-bold ${remaining > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {formatIQD(remaining)}
              </div>
            </div>
          </div>
        </div>

        {/* تفاصيل الاعلان الضوئي */}
        <div className="card mb-5 space-y-5">
          <h2 className="font-semibold text-slate-700 dark:text-slate-200">تفاصيل الإعلان الضوئي</h2>

          <div>
            <label className="label">نوع الاعلان</label>
            <div className="grid grid-cols-3 gap-2">
              {AD_TYPES.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setAdType(opt.value)}
                  className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                    adType === opt.value
                      ? 'border-nili bg-nili text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-nili/40 dark:border-white/10 dark:bg-[#1a1a23] dark:text-slate-300'
                  }`}
                >
                  <span className="mb-1 block text-lg">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">نوع الاضاءة</label>
            <div className="grid grid-cols-3 gap-2">
              {LIGHTING_TYPES.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setLightingType(opt.value)}
                  className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                    lightingType === opt.value
                      ? 'border-amber-500 bg-amber-500 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300 dark:border-white/10 dark:bg-[#1a1a23] dark:text-slate-300'
                  }`}
                >
                  <span className="mb-1 block text-lg">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {adType === 'فلكس' && (
            <div>
              <label className="label">نوع الفلكس</label>
              <div className="grid grid-cols-3 gap-2">
                {FLEX_TYPES.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => setFlexType(opt.value)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                      flexType === opt.value
                        ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 dark:border-white/10 dark:bg-[#1a1a23] dark:text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="label">الطول (م)</label>
              <input className="input" type="number" step="any" value={length} onChange={(e) => setLength(e.target.value)} />
            </div>
            <div>
              <label className="label">العرض (م)</label>
              <input className="input" type="number" step="any" value={width} onChange={(e) => setWidth(e.target.value)} />
            </div>
            <div>
              <label className="label">المساحة</label>
              <div className="input flex items-center bg-nili/5 font-semibold text-nili dark:bg-nili-light/10 dark:text-gold">
                {area || 0} م²
              </div>
            </div>
          </div>

          <div>
            <label className="label">رفع ملف التصميم</label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFile(e.dataTransfer.files?.[0]);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-6 text-center text-sm transition ${
                dragOver
                  ? 'border-nili bg-nili/5 text-nili'
                  : 'border-slate-300 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5'
              }`}
            >
              {designFile ? `تم اختيار: ${designFile.name}` : 'اسحب ملفًا هنا أو اضغط للاختيار (PDF, JPG, PNG, AI, PSD, CDR, EPS)'}
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept=".pdf,.jpg,.jpeg,.png,.ai,.psd,.cdr,.eps"
                onChange={(e) => handleFile(e.target.files[0])}
              />
            </div>
          </div>

          <div>
            <label className="label">ملاحظات إضافية</label>
            <textarea className="input" rows={2} value={userNotes} onChange={(e) => setUserNotes(e.target.value)} />
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </div>
        )}

        <button disabled={saving} onClick={submit} className="btn-primary w-full py-3 text-base">
          {saving ? 'جاري الحفظ...' : '💾 حفظ وطباعة الوصل'}
        </button>
      </div>
    </div>
  );
}

function PrintReceipt({
  order,
  customerName,
  items,
  adType,
  lightingType,
  flexType,
  width,
  length,
  area,
  userNotes,
  shopSettings,
  onSendWhatsapp,
  onNewOrder,
}) {
  const dateStr = formatDate(new Date().toISOString());

  return (
    <div className="min-h-screen bg-stone-200 py-8 print:bg-white print:py-0 dark:bg-[#0a0a0f] dark:print:bg-white">
      <div className="no-print mx-auto mb-4 flex max-w-xl items-center justify-between px-4">
        <Link to="/orders" className="text-sm text-nili hover:underline dark:text-gold">
          ← رجوع لقائمة الطلبات
        </Link>
        <div className="flex gap-2">
          <button onClick={onSendWhatsapp} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700">
            📱 ارسال واتساب
          </button>
          <button onClick={() => window.print()} className="rounded-lg bg-nili px-4 py-2 text-sm text-white hover:bg-nili-dark">
            🖨️ طباعة PDF
          </button>
          <button onClick={onNewOrder} className="rounded-lg bg-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-300">
            + طلب جديد
          </button>
        </div>
      </div>

      <div className="mx-auto flex max-w-xl justify-center px-4 print:px-0">
        <div
          dir="rtl"
          className="receipt-frame w-full p-2"
          style={{
            background: '#FBF6EA',
            border: '1px solid #C9A94A',
            boxShadow: '0 0 0 5px #FBF6EA, 0 0 0 6px #C9A94A',
          }}
        >
          <div className="relative p-6 sm:p-8">
            <Corner className="right-1 top-1" />
            <Corner className="left-1 top-1 -scale-x-100" />
            <Corner className="right-1 bottom-1 -scale-y-100" />
            <Corner className="left-1 bottom-1 -scale-x-100 -scale-y-100" />

            {/* الرأس */}
            <div className="text-center">
              <p className="text-4xl font-bold text-[#1B2A6B]" style={{ fontFamily: "'Aref Ruqaa', 'IBM Plex Sans Arabic', serif" }}>
                فاتورة
              </p>
              <div className="mx-auto mt-2 flex items-center justify-center gap-2 text-[#C9A94A]">
                <span className="h-px w-10" style={{ background: '#C9A94A' }} />
                <span>❖</span>
                <span className="h-px w-10" style={{ background: '#C9A94A' }} />
              </div>
              <p className="mt-2 text-sm font-semibold text-stone-500" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
                {shopSettings.shop_name || 'مطبعتك'}
              </p>
              {(shopSettings.shop_phone || shopSettings.shop_address) && (
                <p className="mt-0.5 text-[11px] text-stone-400" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
                  {[shopSettings.shop_phone, shopSettings.shop_address].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>

            <div
              className="mt-6 flex justify-center gap-10 text-center text-sm"
              style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontVariantNumeric: 'tabular-nums' }}
            >
              <div>
                <p className="text-[11px] text-stone-400">رقم الوصل</p>
                <p className="mt-0.5 font-bold text-stone-700">{order.orderNumber}</p>
              </div>
              <div>
                <p className="text-[11px] text-stone-400">التاريخ</p>
                <p className="mt-0.5 font-bold text-stone-700">{dateStr}</p>
              </div>
            </div>

            <p className="mt-5 text-center text-base" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", color: '#3a2f14' }}>
              الزبون: <span className="font-bold">{customerName}</span>
            </p>

            {/* الجدول */}
            <table className="mt-6 w-full text-sm" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '3px double #C9A94A' }} className="text-[11px] text-stone-500">
                  <th className="py-1.5 text-right font-medium">البيان</th>
                  <th className="py-1.5 text-center font-medium">العدد</th>
                  <th className="py-1.5 text-center font-medium">سعر الوحدة</th>
                  <th className="py-1.5 text-left font-medium">المجموع</th>
                </tr>
              </thead>
              <tbody style={{ fontVariantNumeric: 'tabular-nums' }}>
                {items.map((it, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e7dcbd' }}>
                    <td className="py-2 text-stone-700">{it.description}</td>
                    <td className="py-2 text-center text-stone-700">{it.quantity}</td>
                    <td className="py-2 text-center text-stone-700">{formatIQD(it.unit_price)}</td>
                    <td className="py-2 text-left font-bold text-stone-800">
                      {formatIQD(Number(it.quantity) * Number(it.unit_price))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* بطاقة المواصفات */}
            <div
              className="mt-5 rounded-lg p-3 text-center text-xs leading-6 text-stone-600"
              style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", border: '1px solid #C9A94A' }}
            >
              <b className="block text-stone-700">مواصفات الإعلان الضوئي</b>
              نوع الإعلان: <b className="text-stone-800">{adType}</b> — نوع الإضاءة:{' '}
              <b className="text-stone-800">{lightingType}</b>
              {adType === 'فلكس' && (
                <>
                  {' '}
                  — نوع الفلكس: <b className="text-stone-800">{flexType}</b>
                </>
              )}
              {width && length && (
                <>
                  <br />
                  الأبعاد:{' '}
                  <b className="text-stone-800" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {length}×{width}م (المساحة {area}م²)
                  </b>
                </>
              )}
              {userNotes && (
                <>
                  <br />
                  ملاحظات: {userNotes}
                </>
              )}
            </div>

            {/* الإجمالي */}
            <div
              className="mt-6 space-y-1.5 text-sm"
              style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", borderTop: '3px double #C9A94A', paddingTop: 12 }}
            >
              <div className="flex justify-between text-stone-500">
                <span>المجموع الكلي</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatIQD(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>الواصل</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatIQD(order.paid)}</span>
              </div>
              <div className="flex justify-between pt-1 text-base font-bold" style={{ color: '#8a6d10' }}>
                <span style={{ fontFamily: "'Aref Ruqaa', serif" }}>المتبقي</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatIQD(order.remaining)}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <VerifyQR
                orderNumber={order.orderNumber}
                logoUrl={shopSettings.shop_logo_path ? fileUrl(shopSettings.shop_logo_path) : null}
              />
            </div>

            <div className="mt-8 flex justify-between text-xs text-stone-400" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              <span>توقيع الزبون: ______</span>
              <span>توقيع الموظف: ______</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .receipt-frame, .receipt-frame * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}

function Corner({ className }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" className={`absolute ${className}`} style={{ color: '#C9A94A' }}>
      <path d="M2 20V6a4 4 0 0 1 4-4h14" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="2" cy="20" r="1.5" fill="currentColor" />
    </svg>
  );
}
