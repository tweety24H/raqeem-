import { useEffect } from 'react';

// Preview-only lab for comparing candidate visual designs for the Orders page.
// Not wired to real data or routes used elsewhere in the app.

const FAKE_ORDERS = [
  {
    id: 'RQ2026-0001',
    customer: 'مكتبة الرافدين',
    item: 'بروشورات دعائية × 500',
    total: '150,000',
    status: 'قيد التنفيذ',
  },
  {
    id: 'RQ2026-0002',
    customer: 'شركة النور للتجارة',
    item: 'بطاقات عمل × 1000',
    total: '320,000',
    status: 'مكتمل',
  },
  {
    id: 'RQ2026-0003',
    customer: 'مطعم بغداد',
    item: 'لافتة خارجية 2×3م',
    total: '75,000',
    status: 'متأخر',
  },
];

const STATS = [
  { label: 'طلبات اليوم', value: '12' },
  { label: 'قيد التنفيذ', value: '7' },
  { label: 'إجمالي الإيرادات', value: '2,450,000 د.ع' },
  { label: 'طلبات متأخرة', value: '3' },
];

function useGoogleFont() {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&family=Cairo:wght@400;500;600;700;900&family=Aref+Ruqaa:wght@400;700&display=swap';
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);
}

const INVOICE_SAMPLE = {
  number: 'RQ20260904-0002',
  date: '2026/09/04',
  customer: 'حسين علاء',
  items: [{ label: 'لافتة محل حروف بارزة مذهبة', qty: 1, price: '200,000', total: '200,000' }],
  specs: {
    type: 'حروف بارزة',
    lighting: 'LED',
    dims: '3×0.8م (المساحة 2.4م²)',
  },
  subtotal: '200,000',
  paid: '120,000',
  remaining: '80,000',
};

function statusBadgeClasses(status, variant) {
  const base = 'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium';
  const maps = {
    a: {
      'قيد التنفيذ': 'bg-indigo-50 text-indigo-600',
      'مكتمل': 'bg-emerald-50 text-emerald-600',
      'متأخر': 'bg-rose-50 text-rose-600',
    },
    b: {
      'قيد التنفيذ': 'bg-violet-100 text-violet-700',
      'مكتمل': 'bg-teal-100 text-teal-700',
      'متأخر': 'bg-rose-100 text-rose-700',
    },
    c: {
      'قيد التنفيذ': 'bg-amber-100 text-amber-700',
      'مكتمل': 'bg-green-100 text-green-700',
      'متأخر': 'bg-red-100 text-red-700',
    },
  };
  return `${base} ${maps[variant][status]}`;
}

// ---------- Concept A: Minimal SaaS ----------

function ConceptA() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">التصميم A — Minimal SaaS</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
          نظيف · هادئ · مثل Linear
        </span>
      </header>

      <div className="rounded-xl bg-slate-50 p-6">
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">{s.label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <input
            type="text"
            placeholder="بحث برقم الطلب أو اسم العميل..."
            className="flex-1 min-w-[200px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
          />
          <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none">
            <option>كل الحالات</option>
            <option>قيد التنفيذ</option>
            <option>مكتمل</option>
            <option>متأخر</option>
          </select>
          <button className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600">
            طلب جديد
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <th className="px-4 py-3 font-medium">رقم الطلب</th>
                <th className="px-4 py-3 font-medium">العميل</th>
                <th className="px-4 py-3 font-medium">التفاصيل</th>
                <th className="px-4 py-3 font-medium">المبلغ</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {FAKE_ORDERS.map((o) => (
                <tr key={o.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-indigo-600">{o.id}</td>
                  <td className="px-4 py-3 text-slate-700">{o.customer}</td>
                  <td className="px-4 py-3 text-slate-500">{o.item}</td>
                  <td className="px-4 py-3 text-slate-700">{o.total} د.ع</td>
                  <td className="px-4 py-3">
                    <span className={statusBadgeClasses(o.status, 'a')}>{o.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-slate-500">لوحة الألوان</p>
        <div className="flex flex-wrap gap-3">
          <ColorSwatch hex="#ffffff" name="خلفية" border />
          <ColorSwatch hex="#f8fafc" name="slate-50" border />
          <ColorSwatch hex="#6366f1" name="أساسي — indigo" />
          <ColorSwatch hex="#0f172a" name="نص" />
          <ColorSwatch hex="#e2e8f0" name="حدود" border />
        </div>
      </div>

      <button
        onClick={() => console.log('design-choice: A - Minimal SaaS')}
        className="mt-6 w-full rounded-xl bg-indigo-500 py-3 text-sm font-bold text-white transition hover:bg-indigo-600 sm:w-auto sm:px-8"
      >
        اختر هذا التصميم
      </button>
    </section>
  );
}

// ---------- Concept B: Premium Gradient ----------

function ConceptB() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">التصميم B — Premium Gradient</h2>
        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs text-violet-600">
          تدرجات ناعمة · ظلال · مثل Stripe
        </span>
      </header>

      <div className="rounded-xl bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-6">
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className="rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 p-4 text-white shadow-lg shadow-indigo-200"
              style={{ opacity: 1 - i * 0.04 }}
            >
              <p className="text-sm text-indigo-100">{s.label}</p>
              <p className="mt-2 text-2xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white/80 p-3 shadow-md shadow-indigo-100 backdrop-blur">
          <input
            type="text"
            placeholder="بحث برقم الطلب أو اسم العميل..."
            className="flex-1 min-w-[200px] rounded-xl border border-violet-100 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none"
          />
          <select className="rounded-xl border border-violet-100 bg-white px-3 py-2 text-sm text-slate-700 focus:border-violet-400 focus:outline-none">
            <option>كل الحالات</option>
            <option>قيد التنفيذ</option>
            <option>مكتمل</option>
            <option>متأخر</option>
          </select>
          <button className="rounded-xl bg-gradient-to-l from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-indigo-200 hover:shadow-lg">
            طلب جديد
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-md shadow-indigo-100">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-violet-100 bg-gradient-to-l from-violet-50 to-indigo-50 text-slate-600">
                <th className="px-4 py-3 font-medium">رقم الطلب</th>
                <th className="px-4 py-3 font-medium">العميل</th>
                <th className="px-4 py-3 font-medium">التفاصيل</th>
                <th className="px-4 py-3 font-medium">المبلغ</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {FAKE_ORDERS.map((o) => (
                <tr key={o.id} className="border-b border-violet-50 last:border-0 hover:bg-violet-50/40">
                  <td className="px-4 py-3 font-medium text-violet-600">{o.id}</td>
                  <td className="px-4 py-3 text-slate-700">{o.customer}</td>
                  <td className="px-4 py-3 text-slate-500">{o.item}</td>
                  <td className="px-4 py-3 text-slate-700">{o.total} د.ع</td>
                  <td className="px-4 py-3">
                    <span className={statusBadgeClasses(o.status, 'b')}>{o.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-violet-100 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-slate-500">لوحة الألوان</p>
        <div className="flex flex-wrap gap-3">
          <ColorSwatch hex="#8b5cf6" name="بنفسجي — violet" />
          <ColorSwatch hex="#6366f1" name="أساسي — indigo" />
          <ColorSwatch hex="#f5f3ff" name="violet-50" border />
          <ColorSwatch hex="#eef2ff" name="indigo-50" border />
          <ColorSwatch hex="#ffffff" name="بطاقات" border />
        </div>
      </div>

      <button
        onClick={() => console.log('design-choice: B - Premium Gradient')}
        className="mt-6 w-full rounded-xl bg-gradient-to-l from-violet-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:shadow-xl sm:w-auto sm:px-8"
      >
        اختر هذا التصميم
      </button>
    </section>
  );
}

// ---------- Concept C: Warm Print Shop ----------

function ConceptC() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">التصميم C — Warm Print Shop</h2>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700">
          دافئ · ودّي · مناسب للمطبعة
        </span>
      </header>

      <div className="rounded-xl bg-amber-50/60 p-6">
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm"
            >
              <p className="text-sm text-amber-700/70">{s.label}</p>
              <p className="mt-2 text-2xl font-bold text-amber-900">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-white p-3">
          <input
            type="text"
            placeholder="بحث برقم الطلب أو اسم العميل..."
            className="flex-1 min-w-[200px] rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-slate-700 placeholder:text-amber-700/40 focus:border-amber-500 focus:outline-none"
          />
          <select className="rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm text-slate-700 focus:border-amber-500 focus:outline-none">
            <option>كل الحالات</option>
            <option>قيد التنفيذ</option>
            <option>مكتمل</option>
            <option>متأخر</option>
          </select>
          <button className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600">
            طلب جديد
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-amber-200 bg-white">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-amber-200 bg-amber-100/50 text-amber-900">
                <th className="px-4 py-3 font-medium">رقم الطلب</th>
                <th className="px-4 py-3 font-medium">العميل</th>
                <th className="px-4 py-3 font-medium">التفاصيل</th>
                <th className="px-4 py-3 font-medium">المبلغ</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {FAKE_ORDERS.map((o) => (
                <tr key={o.id} className="border-b border-amber-100 last:border-0 hover:bg-amber-50/50">
                  <td className="px-4 py-3 font-bold text-amber-700">{o.id}</td>
                  <td className="px-4 py-3 text-slate-700">{o.customer}</td>
                  <td className="px-4 py-3 text-slate-500">{o.item}</td>
                  <td className="px-4 py-3 text-slate-700">{o.total} د.ع</td>
                  <td className="px-4 py-3">
                    <span className={statusBadgeClasses(o.status, 'c')}>{o.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-amber-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-slate-500">لوحة الألوان</p>
        <div className="flex flex-wrap gap-3">
          <ColorSwatch hex="#f59e0b" name="أساسي — amber" />
          <ColorSwatch hex="#fb923c" name="orange-400" />
          <ColorSwatch hex="#fffbeb" name="amber-50" border />
          <ColorSwatch hex="#78350f" name="نص داكن" />
          <ColorSwatch hex="#ffffff" name="بطاقات" border />
        </div>
      </div>

      <button
        onClick={() => console.log('design-choice: C - Warm Print Shop')}
        className="mt-6 w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-white transition hover:bg-amber-600 sm:w-auto sm:px-8"
      >
        اختر هذا التصميم
      </button>
    </section>
  );
}

// ---------- Concept D: فاتورة سويسري (Swiss Invoice) ----------

function ConceptD_Invoice() {
  const d = INVOICE_SAMPLE;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">التصميم D — فاتورة سويسري</h2>
        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">
          Swiss Style · عربي ١٠٠٪ · الفراغ الأبيض هو البطل
        </span>
      </header>

      <div className="bg-white p-2 sm:p-8" style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}>
        <div className="mx-auto max-w-xl" dir="rtl">
          {/* رأس الفاتورة */}
          <div className="grid grid-cols-[1fr_auto] items-start gap-6 pb-10">
            <h1 className="text-[56px] font-black leading-none tracking-tight text-neutral-900">فاتورة</h1>
            <div className="pt-2 text-left text-xs leading-6 text-neutral-500" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <div className="font-bold uppercase tracking-[0.15em] text-neutral-900">RaqeemOS</div>
              <div>مطبعتي</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 border-t border-neutral-900 pt-4" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] text-neutral-400">رقم الوصل</p>
              <p className="mt-1 text-sm font-semibold text-neutral-900">{d.number}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] text-neutral-400">التاريخ</p>
              <p className="mt-1 text-sm font-semibold text-neutral-900">{d.date}</p>
            </div>
          </div>

          {/* الزبون */}
          <div className="mt-8 border-t border-neutral-200 pt-4">
            <p className="text-[11px] uppercase tracking-[0.15em] text-neutral-400">الزبون</p>
            <p className="mt-1 text-lg font-bold text-neutral-900">{d.customer}</p>
          </div>

          {/* جدول العناصر */}
          <div className="mt-8">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 border-b border-neutral-900 pb-2 text-[11px] uppercase tracking-[0.1em] text-neutral-400">
              <span>البيان</span>
              <span className="w-12 text-left">العدد</span>
              <span className="w-24 text-left">سعر الوحدة</span>
              <span className="w-24 text-left">المجموع</span>
            </div>
            {d.items.map((it, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-4 border-b border-neutral-100 py-3 text-sm text-neutral-800"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                <span>{it.label}</span>
                <span className="w-12 text-left">{it.qty}</span>
                <span className="w-24 text-left">{it.price}</span>
                <span className="w-24 text-left font-semibold">{it.total}</span>
              </div>
            ))}
          </div>

          {/* مواصفات الإعلان الضوئي */}
          <div className="mt-8 grid grid-cols-3 gap-6 border-t border-neutral-200 pt-4 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] text-neutral-400">نوع الإعلان</p>
              <p className="mt-1 font-semibold text-neutral-900">{d.specs.type}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] text-neutral-400">نوع الإضاءة</p>
              <p className="mt-1 font-semibold text-neutral-900">{d.specs.lighting}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] text-neutral-400">الأبعاد</p>
              <p className="mt-1 font-semibold text-neutral-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {d.specs.dims}
              </p>
            </div>
          </div>

          {/* المجاميع */}
          <div className="mt-10 flex justify-end border-t border-neutral-900 pt-4">
            <div className="w-56 space-y-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <div className="flex justify-between text-sm text-neutral-500">
                <span>المجموع الكلي</span>
                <span className="text-neutral-900">{d.subtotal} د.ع</span>
              </div>
              <div className="flex justify-between text-sm text-neutral-500">
                <span>الواصل</span>
                <span className="text-neutral-900">{d.paid} د.ع</span>
              </div>
              <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-black text-neutral-900">
                <span>المتبقي</span>
                <span style={{ color: '#B8932A' }}>{d.remaining} د.ع</span>
              </div>
            </div>
          </div>

          {/* التواقيع */}
          <div className="mt-16 grid grid-cols-2 gap-6 text-xs text-neutral-400">
            <div className="border-t border-neutral-300 pt-2">توقيع الزبون</div>
            <div className="border-t border-neutral-300 pt-2 text-left">توقيع الموظف</div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-slate-500">لوحة الألوان</p>
        <div className="flex flex-wrap gap-3">
          <ColorSwatch hex="#ffffff" name="خلفية" border />
          <ColorSwatch hex="#171717" name="نص أساسي — neutral-900" />
          <ColorSwatch hex="#a3a3a3" name="نص ثانوي — neutral-400" border />
          <ColorSwatch hex="#B8932A" name="التمييز الوحيد — ذهبي" />
          <ColorSwatch hex="#e5e5e5" name="خطوط فاصلة" border />
        </div>
      </div>

      <button
        onClick={() => console.log('design-choice: D - Swiss Invoice')}
        className="mt-6 w-full rounded-xl bg-neutral-900 py-3 text-sm font-bold text-white transition hover:bg-neutral-700 sm:w-auto sm:px-8"
      >
        اختر هذا التصميم
      </button>
    </section>
  );
}

// ---------- Concept E: بطاقة عصرية ملونة (Modern Colorful Card) ----------

function ConceptE_Invoice() {
  const d = INVOICE_SAMPLE;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">التصميم E — بطاقة عصرية ملونة</h2>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-600">
          مثل Stripe / Notion · ودّي وواضح
        </span>
      </header>

      <div className="flex justify-center bg-slate-100 p-4 sm:p-8" style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}>
        <div dir="rtl" className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-300/50">
          {/* رأس ملون */}
          <div className="bg-gradient-to-l from-[#1B2A6B] to-[#2c3f96] px-6 py-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-white/60">فاتورة</p>
                <p className="mt-1 text-xl font-black">مطبعتي</p>
              </div>
              <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {d.number}
              </span>
            </div>
          </div>

          <div className="p-6">
            {/* الزبون */}
            <div className="mb-5 flex items-center justify-between rounded-2xl bg-slate-50 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D4AF37] text-sm font-bold text-white">
                  {d.customer.trim().charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{d.customer}</p>
                  <p className="text-xs text-slate-400" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {d.date}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                دفعة جزئية
              </span>
            </div>

            {/* العناصر */}
            <p className="mb-2 text-xs font-semibold text-slate-400">عناصر الطلب</p>
            <div className="mb-5 space-y-2">
              {d.items.map((it, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-base">
                    🔤
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{it.label}</p>
                    <p className="text-xs text-slate-400" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {it.qty} × {it.price} د.ع
                    </p>
                  </div>
                  <p className="text-sm font-bold text-slate-800" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {it.total}
                  </p>
                </div>
              ))}
            </div>

            {/* مواصفات كـ chips */}
            <p className="mb-2 text-xs font-semibold text-slate-400">مواصفات الإعلان الضوئي</p>
            <div className="mb-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-600">
                {d.specs.type}
              </span>
              <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-600">
                💡 {d.specs.lighting}
              </span>
              <span
                className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                📐 {d.specs.dims}
              </span>
            </div>

            {/* بطاقة الإجمالي */}
            <div className="rounded-2xl bg-gradient-to-l from-[#1B2A6B] to-[#2c3f96] p-4 text-white">
              <div className="flex justify-between text-xs text-white/70">
                <span>المجموع الكلي</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{d.subtotal} د.ع</span>
              </div>
              <div className="mt-1 flex justify-between text-xs text-white/70">
                <span>الواصل</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{d.paid} د.ع</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-white/15 pt-2">
                <span className="text-sm font-semibold">المتبقي</span>
                <span className="text-xl font-black" style={{ color: '#D4AF37', fontVariantNumeric: 'tabular-nums' }}>
                  {d.remaining} د.ع
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-between text-[11px] text-slate-400">
              <span>توقيع الزبون: ___________</span>
              <span>توقيع الموظف: ___________</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-slate-500">لوحة الألوان</p>
        <div className="flex flex-wrap gap-3">
          <ColorSwatch hex="#1B2A6B" name="نيلي — أساسي" />
          <ColorSwatch hex="#D4AF37" name="ذهبي — تمييز" />
          <ColorSwatch hex="#F8FAFC" name="slate-50" border />
          <ColorSwatch hex="#EEF2FF" name="indigo-50" border />
          <ColorSwatch hex="#ffffff" name="بطاقات" border />
        </div>
      </div>

      <button
        onClick={() => console.log('design-choice: E - Modern Colorful Card')}
        className="mt-6 w-full rounded-xl bg-[#1B2A6B] py-3 text-sm font-bold text-white transition hover:bg-[#121d4d] sm:w-auto sm:px-8"
      >
        اختر هذا التصميم
      </button>
    </section>
  );
}

// ---------- Concept F: فاتورة تراثية فخمة (Ornamental Heritage) ----------

function ConceptF_Invoice() {
  const d = INVOICE_SAMPLE;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">التصميم F — فاتورة تراثية فخمة</h2>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-800">
          ذهبي · كريمي · طابع أصيل
        </span>
      </header>

      <div className="flex justify-center bg-stone-100 p-4 sm:p-8">
        <div
          dir="rtl"
          className="w-full max-w-md p-2"
          style={{ background: '#FBF6EA', border: '1px solid #C9A94A', boxShadow: '0 0 0 5px #FBF6EA, 0 0 0 6px #C9A94A' }}
        >
          <div className="relative p-6">
            {/* زخارف الزوايا */}
            <Corner className="right-1 top-1" />
            <Corner className="left-1 top-1 -scale-x-100" />
            <Corner className="right-1 bottom-1 -scale-y-100" />
            <Corner className="left-1 bottom-1 -scale-x-100 -scale-y-100" />

            {/* الرأس */}
            <div className="text-center">
              <p
                className="text-4xl font-bold text-[#1B2A6B]"
                style={{ fontFamily: "'Aref Ruqaa', 'Cairo', serif" }}
              >
                فاتورة
              </p>
              <div className="mx-auto mt-2 flex items-center justify-center gap-2 text-[#C9A94A]">
                <span className="h-px w-10" style={{ background: '#C9A94A' }} />
                <span>❖</span>
                <span className="h-px w-10" style={{ background: '#C9A94A' }} />
              </div>
              <p className="mt-2 text-sm font-semibold text-stone-500" style={{ fontFamily: "'Cairo', sans-serif" }}>
                مطبعتي
              </p>
            </div>

            <div
              className="mt-6 flex justify-center gap-10 text-center text-sm"
              style={{ fontFamily: "'Cairo', sans-serif", fontVariantNumeric: 'tabular-nums' }}
            >
              <div>
                <p className="text-[11px] text-stone-400">رقم الوصل</p>
                <p className="mt-0.5 font-bold text-stone-700">{d.number}</p>
              </div>
              <div>
                <p className="text-[11px] text-stone-400">التاريخ</p>
                <p className="mt-0.5 font-bold text-stone-700">{d.date}</p>
              </div>
            </div>

            <p
              className="mt-5 text-center text-base"
              style={{ fontFamily: "'Cairo', sans-serif", color: '#3a2f14' }}
            >
              الزبون: <span className="font-bold">{d.customer}</span>
            </p>

            {/* الجدول */}
            <table
              className="mt-6 w-full text-sm"
              style={{ fontFamily: "'Cairo', sans-serif", borderCollapse: 'collapse' }}
            >
              <thead>
                <tr style={{ borderBottom: '3px double #C9A94A' }} className="text-[11px] text-stone-500">
                  <th className="py-1.5 text-right font-medium">البيان</th>
                  <th className="py-1.5 text-center font-medium">العدد</th>
                  <th className="py-1.5 text-center font-medium">سعر الوحدة</th>
                  <th className="py-1.5 text-left font-medium">المجموع</th>
                </tr>
              </thead>
              <tbody style={{ fontVariantNumeric: 'tabular-nums' }}>
                {d.items.map((it, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e7dcbd' }}>
                    <td className="py-2 text-stone-700">{it.label}</td>
                    <td className="py-2 text-center text-stone-700">{it.qty}</td>
                    <td className="py-2 text-center text-stone-700">{it.price}</td>
                    <td className="py-2 text-left font-bold text-stone-800">{it.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* بطاقة المواصفات */}
            <div
              className="mt-5 rounded-lg p-3 text-center text-xs leading-6 text-stone-600"
              style={{ fontFamily: "'Cairo', sans-serif", border: '1px solid #C9A94A' }}
            >
              نوع الإعلان: <b className="text-stone-800">{d.specs.type}</b> — نوع الإضاءة:{' '}
              <b className="text-stone-800">{d.specs.lighting}</b>
              <br />
              الأبعاد: <b className="text-stone-800" style={{ fontVariantNumeric: 'tabular-nums' }}>{d.specs.dims}</b>
            </div>

            {/* الإجمالي */}
            <div
              className="mt-6 space-y-1.5 text-sm"
              style={{ fontFamily: "'Cairo', sans-serif", borderTop: '3px double #C9A94A', paddingTop: 12 }}
            >
              <div className="flex justify-between text-stone-500">
                <span>المجموع الكلي</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{d.subtotal} د.ع</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>الواصل</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{d.paid} د.ع</span>
              </div>
              <div className="flex justify-between pt-1 text-base font-bold" style={{ color: '#8a6d10' }}>
                <span style={{ fontFamily: "'Aref Ruqaa', serif" }}>المتبقي</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{d.remaining} د.ع</span>
              </div>
            </div>

            <div
              className="mt-8 flex justify-between text-xs text-stone-400"
              style={{ fontFamily: "'Cairo', sans-serif" }}
            >
              <span>توقيع الزبون: ______</span>
              <span>توقيع الموظف: ______</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-slate-500">لوحة الألوان</p>
        <div className="flex flex-wrap gap-3">
          <ColorSwatch hex="#FBF6EA" name="كريمي — خلفية" border />
          <ColorSwatch hex="#C9A94A" name="ذهبي — إطار وتمييز" />
          <ColorSwatch hex="#1B2A6B" name="نيلي — العنوان" />
          <ColorSwatch hex="#3a2f14" name="نص أساسي" />
          <ColorSwatch hex="#8a6d10" name="ذهبي داكن — المتبقي" />
        </div>
      </div>

      <button
        onClick={() => console.log('design-choice: F - Ornamental Heritage')}
        className="mt-6 w-full rounded-xl py-3 text-sm font-bold text-white transition sm:w-auto sm:px-8"
        style={{ background: '#8a6d10' }}
      >
        اختر هذا التصميم
      </button>
    </section>
  );
}

function Corner({ className }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      className={`absolute ${className}`}
      style={{ color: '#C9A94A' }}
    >
      <path d="M2 20V6a4 4 0 0 1 4-4h14" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="2" cy="20" r="1.5" fill="currentColor" />
    </svg>
  );
}

function ColorSwatch({ hex, name, border }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-8 w-8 rounded-full ${border ? 'border border-slate-300' : ''}`}
        style={{ backgroundColor: hex }}
      />
      <div className="text-xs text-slate-600">
        <p className="font-medium">{name}</p>
        <p className="text-slate-400">{hex}</p>
      </div>
    </div>
  );
}

export default function DesignLab() {
  useGoogleFont();

  return (
    <div dir="rtl" style={{ fontFamily: "'Tajawal', sans-serif" }} className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-black text-slate-900">مختبر التصاميم — صفحة الطلبات</h1>
          <p className="mt-2 text-sm text-slate-500">
            هذه صفحة معاينة فقط لمقارنة ثلاثة تصاميم مقترحة. لا اتصال ببيانات حقيقية.
          </p>
        </div>

        <div className="flex flex-col gap-10">
          <ConceptA />
          <ConceptB />
          <ConceptC />
          <ConceptD_Invoice />
          <ConceptE_Invoice />
          <ConceptF_Invoice />
        </div>
      </div>
    </div>
  );
}
