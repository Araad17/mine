import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import type { Shipment } from '../types';
import { CURRENCY, downloadPdf, errMsg, fmt, statusOf, unitFa } from '../lib';

const pageSize = 6;

const persianDate = (value: string) => new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(`${value}T00:00:00`));

export default function Shipments() {
  const [rows, setRows] = useState<Shipment[]>([]);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/shipments')
      .then((response) => setRows(response.data))
      .catch(() => setError('دریافت فهرست ارسال‌ها ناموفق بود. لطفاً دوباره تلاش کنید.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredRows = useMemo(() => rows.filter((shipment) => {
    const text = search.trim().toLocaleLowerCase();
    const matchesText = !text || [
      String(shipment.id), shipment.receiver_name, shipment.material,
    ].some((value) => value.toLocaleLowerCase().includes(text));
    const matchesFrom = !from || shipment.ship_date >= from;
    const matchesTo = !to || shipment.ship_date <= to;
    const paidStatus = shipment.paid >= shipment.total_amount ? 'paid' : shipment.paid > 0 ? 'partial' : 'unpaid';
    return matchesText && matchesFrom && matchesTo && (!status || paidStatus === status);
  }), [rows, search, from, to, status]);

  useEffect(() => setPage(1), [search, from, to, status]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totals = filteredRows.reduce((sum, shipment) => ({
    quantity: sum.quantity + Number(shipment.total_quantity),
    amount: sum.amount + Number(shipment.total_amount),
    remaining: sum.remaining + Number(shipment.remaining),
    trucks: sum.trucks + Number(shipment.truck_count),
    ton: sum.ton + (shipment.unit === 'ton' ? Number(shipment.total_quantity) : 0),
    kg: sum.kg + (shipment.unit === 'kg' ? Number(shipment.total_quantity) : 0),
  }), { quantity: 0, amount: 0, remaining: 0, trucks: 0, ton: 0, kg: 0 });
  const downloadInvoice = async (shipmentId: number) => {
    setError('');
    try {
      await downloadPdf(`/shipments/${shipmentId}/invoice.pdf`, `invoice-${shipmentId}.pdf`);
    } catch (downloadError) {
      setError(errMsg(downloadError));
    }
  };

  const clearFilters = () => {
    setSearch('');
    setFrom('');
    setTo('');
    setStatus('');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1b2932]">ارسال‌های معدن</h1>
          <p className="mt-1 text-sm text-slate-500">تمام بارنامه‌ها، مقادیر و وضعیت حساب در یک‌جا</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/shipments/new" className="rounded-lg bg-[#f3b33d] px-5 py-3 text-sm font-bold text-[#202b32] shadow-sm transition hover:bg-[#e8a92f]">
            ＋ ثبت ارسال جدید
          </Link>
          <button type="button" onClick={() => window.print()} className="rounded-lg bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 print:hidden">
            ↓ خروجی PDF
          </button>
        </div>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section className="rounded-xl bg-white p-4 shadow-sm print:hidden">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_auto] xl:items-end">
          <div>
            <label htmlFor="shipment-search">جستجو</label>
            <input id="shipment-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="شماره ارسال، گیرنده یا جنس..." />
          </div>
          <div>
            <label htmlFor="shipment-from">از تاریخ</label>
            <input id="shipment-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </div>
          <div>
            <label htmlFor="shipment-to">تا تاریخ</label>
            <input id="shipment-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
          <div>
            <label htmlFor="shipment-status">وضعیت حساب</label>
            <select id="shipment-status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">همه وضعیت‌ها</option>
              <option value="paid">تصفیه‌شده</option>
              <option value="partial">پرداخت قسمی</option>
              <option value="unpaid">پرداخت‌نشده</option>
            </select>
          </div>
          <button type="button" onClick={clearFilters} className="h-10 rounded-lg bg-[#20332e] px-5 text-sm font-bold text-white transition hover:bg-[#2c4941]">
            پاک‌کردن فیلتر
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-bold text-[#24313a]">فهرست ارسال‌ها</h2>
          <span className="text-xs text-slate-500">{fmt(filteredRows.length, 0)} ارسال</span>
        </div>
        <div className="shipments-table-scroll overflow-x-auto px-3">
          <table className="w-full min-w-[880px] text-right text-xs">
            <thead className="bg-[#f4f6f7] text-slate-500">
              <tr>
                {['شماره / تاریخ', 'گیرنده', 'موتر', 'مقدار کل', `مجموع / ${CURRENCY}`, `باقی / ${CURRENCY}`, 'وضعیت', 'عملیات'].map((heading) => (
                  <th key={heading} className="whitespace-nowrap px-3 py-3 font-medium">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((shipment) => {
                const paymentStatus = statusOf(shipment.total_amount, shipment.paid);
                return (
                  <tr key={shipment.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="whitespace-nowrap px-3 py-3">
                      <Link to={`/shipments/${shipment.id}`} className="font-medium text-slate-800 hover:text-emerald-700">{shipment.id}</Link>
                      <span className="mr-2 text-slate-500">{persianDate(shipment.ship_date)}</span>
                    </td>
                    <td className="px-3 py-3">{shipment.receiver_name}</td>
                    <td className="px-3 py-3">{fmt(shipment.truck_count, 0)}</td>
                    <td className="whitespace-nowrap px-3 py-3">{fmt(shipment.total_quantity, 3)} {unitFa(shipment.unit)}</td>
                    <td className="whitespace-nowrap px-3 py-3">{fmt(shipment.total_amount)}</td>
                    <td className={`whitespace-nowrap px-3 py-3 ${shipment.remaining > 0 ? 'text-amber-700' : 'text-slate-500'}`}>{fmt(shipment.remaining)}</td>
                    <td className="px-3 py-3"><span className={`inline-block whitespace-nowrap rounded-md px-2.5 py-1 ${paymentStatus.cls}`}>{paymentStatus.label}</span></td>
                    <td className="px-3 py-3">
                      <button className="whitespace-nowrap font-medium text-emerald-700 hover:underline" onClick={() => void downloadInvoice(shipment.id)}>↓ PDF</button>
                    </td>
                  </tr>
                );
              })}
              {!loading && visibleRows.length === 0 && (
                <tr><td className="px-3 py-10 text-center text-slate-500" colSpan={8}>ارسالی با این مشخصات یافت نشد.</td></tr>
              )}
              {loading && (
                <tr><td className="px-3 py-10 text-center text-slate-500" colSpan={8}>در حال دریافت فهرست ارسال‌ها…</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 print:hidden">
          <span className="text-xs text-slate-400">
            نمایش {filteredRows.length ? (currentPage - 1) * pageSize + 1 : 0} تا {Math.min(currentPage * pageSize, filteredRows.length)} از {fmt(filteredRows.length, 0)} ارسال
          </span>
          <div className="flex items-center gap-2" dir="ltr">
            <button type="button" aria-label="صفحه قبل" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="h-8 w-8 rounded-md border border-slate-200 text-slate-600 disabled:opacity-40">‹</button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
              <button key={pageNumber} type="button" aria-label={`صفحه ${pageNumber}`} aria-current={pageNumber === currentPage ? 'page' : undefined} onClick={() => setPage(pageNumber)} className={`h-8 min-w-8 rounded-md px-2 text-xs ${pageNumber === currentPage ? 'bg-[#f3b33d] font-bold text-[#26333c]' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {fmt(pageNumber, 0)}
              </button>
            ))}
            <button type="button" aria-label="صفحه بعد" disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="h-8 w-8 rounded-md border border-slate-200 text-slate-600 disabled:opacity-40">›</button>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#e8f0ed] px-4 py-3 text-xs text-[#315d50]">
        <span>جمع مقدار: {fmt(totals.ton, 3)} تن و {fmt(totals.kg, 3)} کیلو</span>
        <span>مجموع حساب: {fmt(totals.amount)} {CURRENCY}</span>
        <span>باقی: {fmt(totals.remaining)} {CURRENCY}</span>
      </div>
    </div>
  );
}
