import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import type { Shipment } from '../types';
import { CURRENCY, downloadPdf, errMsg, fmt, statusOf } from '../lib';

const persianDate = (value: string | Date, options: Intl.DateTimeFormatOptions = {}) =>
  new Intl.DateTimeFormat('fa-IR', options).format(new Date(value));

export default function Dashboard() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/shipments')
      .then((response) => setShipments(response.data))
      .catch(() => setError('دریافت اطلاعات داشبورد ناموفق بود. لطفاً دوباره تلاش کنید.'))
      .finally(() => setLoading(false));
  }, []);

  const totals = useMemo(() => shipments.reduce((sum, shipment) => ({
    amount: sum.amount + Number(shipment.total_amount),
    paid: sum.paid + Number(shipment.paid),
    quantity: sum.quantity + Number(shipment.total_quantity) * (shipment.unit === 'kg' ? 0.001 : 1),
  }), { amount: 0, paid: 0, quantity: 0 }), [shipments]);

  const monthly = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const month = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
      const quantity = shipments.reduce((sum, shipment) => (
        shipment.ship_date.slice(0, 7) === key
          ? sum + Number(shipment.total_quantity) * (shipment.unit === 'kg' ? 0.001 : 1)
          : sum
      ), 0);
      return { key, label: persianDate(month, { month: 'long' }), quantity };
    });
  }, [shipments]);

  const maxQuantity = Math.max(...monthly.map((month) => month.quantity), 1);
  const remaining = totals.amount - totals.paid;
  const paidPercent = totals.amount > 0 ? Math.min(100, (totals.paid / totals.amount) * 100) : 0;
  const recent = shipments.slice(0, 3);
  const downloadInvoice = async (shipmentId: number) => {
    setError('');
    try {
      await downloadPdf(`/shipments/${shipmentId}/invoice.pdf`, `invoice-${shipmentId}.pdf`);
    } catch (downloadError) {
      setError(errMsg(downloadError));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1b2932]">نمای کلی معدن</h1>
          <p className="mt-1 text-sm text-slate-500">خلاصه ارسال‌ها و وضعیت حساب گیرنده‌ها</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-white px-5 py-3 text-sm text-slate-600 shadow-sm">
            {persianDate(new Date(), { month: 'long', year: 'numeric' })}
          </span>
          <Link to="/shipments/new" className="inline-flex items-center gap-2 rounded-lg bg-[#f3b33d] px-5 py-3 text-sm font-bold text-[#202b32] shadow-sm transition hover:bg-[#e8a92f]">
            <span aria-hidden="true">＋</span> ثبت ارسال جدید
          </Link>
        </div>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="جنس ارسال‌شده" value={`${fmt(totals.quantity, 3)}`} unit="تن" detail={`${fmt(shipments.length, 0)} ارسال ثبت‌شده`} accent="blue" />
        <Metric label="مجموع کل حساب" value={fmt(totals.amount)} unit={CURRENCY} detail="مجموع ارزش ارسال‌ها" />
        <Metric label="مبلغ تصفیه‌شده" value={fmt(totals.paid)} unit={CURRENCY} detail={`${fmt(paidPercent, 0)}٪ از مجموع حساب`} accent="green" />
        <Metric label="حساب باقی‌مانده" value={fmt(remaining)} unit={CURRENCY} detail="مجموع بدهی گیرنده‌ها" accent="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="font-bold text-[#24313a]">وضعیت حساب‌ها</h2>
          <p className="mt-1 text-xs text-slate-500">نسبت پرداخت به مجموع حساب</p>
          <div className="mt-5 text-center text-4xl font-black text-emerald-700">{fmt(paidPercent, 0)}٪</div>
          <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-[#f7e6c8]" role="progressbar" aria-valuenow={Math.round(paidPercent)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-emerald-700 transition-all" style={{ width: `${paidPercent}%` }} />
          </div>
          <div className="mt-5 flex justify-between text-xs">
            <span className="text-slate-500">تصفیه‌شده <b className="mr-1 text-slate-800">{fmt(totals.paid)}</b></span>
            <span className="text-slate-500">باقی‌مانده <b className="mr-1 text-amber-700">{fmt(remaining)}</b></span>
          </div>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-[#24313a]">روند ارسال جنس</h2>
              <p className="mt-1 text-xs text-slate-500">مقدار ارسال در شش ماه اخیر</p>
            </div>
            <span className="rounded-md bg-amber-50 px-3 py-1.5 text-xs text-amber-700">مجموع {fmt(totals.quantity, 3)} تن</span>
          </div>
          <div className="mt-6 flex h-36 items-end justify-around gap-3 border-b border-slate-100 px-2">
            {monthly.map((month, index) => (
              <div key={month.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <div
                  title={`${month.label}: ${fmt(month.quantity, 3)} تن`}
                  className={`w-full max-w-10 rounded-t-md transition-all ${index === monthly.length - 1 ? 'bg-[#efb342]' : 'bg-[#dce6e3]'}`}
                  style={{ height: `${Math.max(month.quantity ? 8 : 2, (month.quantity / maxQuantity) * 100)}%` }}
                />
                <span className="mb-2 max-w-full truncate text-[10px] text-slate-500">{month.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-bold text-[#24313a]">آخرین ارسال‌ها</h2>
          <Link to="/shipments" className="text-xs font-medium text-emerald-700 hover:underline">مشاهده تمام ارسال‌ها</Link>
        </div>
        <div className="overflow-x-auto px-3 pb-3">
          <table className="w-full min-w-[760px] text-right text-xs">
            <thead className="bg-[#f4f6f7] text-slate-500">
              <tr>
                {['شماره / تاریخ', 'گیرنده', 'مقدار جنس', 'مجموع حساب', 'وضعیت', 'فاکتور'].map((heading) => (
                  <th key={heading} className="whitespace-nowrap px-3 py-3 font-medium">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((shipment) => {
                const status = statusOf(shipment.total_amount, shipment.paid);
                return (
                  <tr key={shipment.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="whitespace-nowrap px-3 py-3">
                      <Link to={`/shipments/${shipment.id}`} className="font-medium text-slate-800 hover:text-emerald-700">#{shipment.id}</Link>
                      <span className="mr-2 text-slate-500">{persianDate(`${shipment.ship_date}T00:00:00`, { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                    </td>
                    <td className="px-3 py-3">{shipment.receiver_name}</td>
                    <td className="whitespace-nowrap px-3 py-3">{fmt(shipment.total_quantity, 3)} {shipment.unit === 'ton' ? 'تن' : 'کیلو'}</td>
                    <td className="whitespace-nowrap px-3 py-3">{fmt(shipment.total_amount)} {CURRENCY}</td>
                    <td className="px-3 py-3"><span className={`rounded-md px-2.5 py-1 ${status.cls}`}>{status.label}</span></td>
                    <td className="px-3 py-3">
                      <button className="font-medium text-emerald-700 hover:underline" onClick={() => void downloadInvoice(shipment.id)}>↓ PDF</button>
                    </td>
                  </tr>
                );
              })}
              {!loading && recent.length === 0 && (
                <tr><td className="px-3 py-8 text-center text-slate-500" colSpan={6}>هنوز ارسالی ثبت نشده است.</td></tr>
              )}
              {loading && (
                <tr><td className="px-3 py-8 text-center text-slate-500" colSpan={6}>در حال دریافت اطلاعات…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, unit, detail, accent = 'default' }: { label: string; value: string; unit: string; detail: string; accent?: 'default' | 'blue' | 'green' | 'amber' }) {
  const valueColor = accent === 'amber' ? 'text-amber-700' : accent === 'green' ? 'text-emerald-700' : accent === 'blue' ? 'text-sky-700' : 'text-[#26333c]';
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <div className={`mt-3 flex flex-wrap items-baseline gap-1.5 font-black ${valueColor}`}>
        <span className="text-2xl tracking-tight">{value}</span>
        <span className="text-xs font-medium">{unit}</span>
      </div>
      <div className="mt-3 text-[11px] text-slate-400">{detail}</div>
    </section>
  );
}
