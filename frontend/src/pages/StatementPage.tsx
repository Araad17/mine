import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import type { Receiver, Statement } from '../types';
import { CURRENCY, downloadPdf, errMsg, fmt, unitFa } from '../lib';

const persianDate = (value: string) => new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(`${value.slice(0, 10)}T00:00:00`));

export default function StatementPage() {
  const [params] = useSearchParams();
  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [receiverId, setReceiverId] = useState(params.get('receiver') ?? '');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [applied, setApplied] = useState<{ receiverId: string; from: string; to: string } | null>(null);
  const [statement, setStatement] = useState<Statement | null>(null);
  const [loadingReceivers, setLoadingReceivers] = useState(true);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api.get<Receiver[]>('/receivers')
      .then(({ data }) => {
        setReceivers(data);
        const queryReceiver = params.get('receiver');
        const initialId = queryReceiver && data.some((receiver) => String(receiver.id) === queryReceiver)
          ? queryReceiver
          : data[0] ? String(data[0].id) : '';
        if (initialId) {
          setReceiverId(initialId);
          setApplied({ receiverId: initialId, from: '', to: '' });
        }
      })
      .catch((loadError) => setError(errMsg(loadError)))
      .finally(() => setLoadingReceivers(false));
  }, [params]);

  useEffect(() => {
    if (!applied) {
      setStatement(null);
      setLoadingStatement(false);
      return;
    }
    let active = true;
    setLoadingStatement(true);
    setError('');
    api.get<Statement>(`/statement/${applied.receiverId}`, {
      params: { from: applied.from || undefined, to: applied.to || undefined },
    })
      .then(({ data }) => {
        if (active) setStatement(data);
      })
      .catch((loadError) => {
        if (active) {
          setStatement(null);
          setError(errMsg(loadError));
        }
      })
      .finally(() => {
        if (active) setLoadingStatement(false);
      });
    return () => { active = false; };
  }, [applied]);

  const receiver = receivers.find((item) => String(item.id) === applied?.receiverId);
  const showReport = (event: FormEvent) => {
    event.preventDefault();
    setApplied({ receiverId, from, to });
  };

  const exportPdf = async () => {
    if (!applied) return;
    setError('');
    setDownloading(true);
    const query = new URLSearchParams({
      ...(applied.from && { from: applied.from }),
      ...(applied.to && { to: applied.to }),
    }).toString();
    try {
      await downloadPdf(`/statement/${applied.receiverId}/pdf${query ? `?${query}` : ''}`, `statement-${applied.receiverId}.pdf`);
    } catch (downloadError) {
      setError(errMsg(downloadError));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1250px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#1b2932]">گزارش ارسال و حساب گیرنده</h1>
          <p className="mt-1 text-sm text-slate-500">مقدار جنس، جزئیات ارسال و نتیجه حساب در بازه دلخواه</p>
        </div>
        <button type="button" onClick={() => void exportPdf()} disabled={!applied || loadingStatement || downloading} className="rounded-lg bg-[#f3b33d] px-5 py-3 text-xs font-bold text-slate-900 shadow-sm hover:bg-[#e8a92f] disabled:opacity-50">
          {downloading ? 'در حال آماده‌سازی…' : '↓ دانلود گزارش کامل PDF'}
        </button>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <form onSubmit={showReport} className="rounded-xl bg-white p-4 shadow-sm">
        <div className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_auto]">
          <div>
            <label htmlFor="report-receiver">گیرنده</label>
            <select id="report-receiver" required value={receiverId} disabled={loadingReceivers} onChange={(event) => setReceiverId(event.target.value)}>
              <option value="">{loadingReceivers ? 'در حال بارگذاری…' : 'انتخاب گیرنده'}</option>
              {receivers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="report-from">از تاریخ</label>
            <input id="report-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </div>
          <div>
            <label htmlFor="report-to">تا تاریخ</label>
            <input id="report-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
          <button type="submit" disabled={!receiverId || loadingStatement} className="h-10 rounded-lg bg-[#20332e] px-8 text-xs font-bold text-white hover:bg-[#2c4941] disabled:opacity-50">نمایش گزارش</button>
        </div>
      </form>

      {loadingStatement && <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">در حال تهیه گزارش…</p>}
      {statement && !loadingStatement && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="مجموع جنس" value={`${fmt(statement.totals.tons, 3)} تن و ${fmt(statement.totals.kg, 3)} کیلو`} detail={`${fmt(statement.totals.shipments, 0)} ارسال / ${fmt(statement.totals.trucks, 0)} موتر`} />
            <Stat label="مجموع حساب" value={fmt(statement.totals.total_amount)} unit={CURRENCY} />
            <Stat label="پرداخت‌شده" value={fmt(statement.totals.paid)} unit={CURRENCY} accent="green" />
            <Stat label="حساب باقی‌مانده" value={fmt(statement.totals.remaining)} unit={CURRENCY} accent="amber" />
          </div>

          <section className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2 px-4 py-4">
              <div>
                <h2 className="text-sm font-bold text-slate-800">صورت‌حساب {receiver?.name ?? statement.receiver.name}</h2>
                <p className="mt-1 text-[10px] text-slate-400">
                  {statement.receiver.address || 'آدرس ثبت نشده'} · واحد حساب: {CURRENCY} · مانده ابتدایی: صفر
                </p>
              </div>
              <span className="text-[10px] text-slate-400">
                {applied?.from ? persianDate(applied.from) : 'ابتدا'} — {applied?.to ? persianDate(applied.to) : 'امروز'}
              </span>
            </div>
            <div className="overflow-x-auto px-3">
              <table className="w-full min-w-[900px] text-right text-[11px]">
                <thead className="bg-[#f4f6f7] text-slate-500">
                  <tr>
                    {['ارسال / تاریخ', 'نوعیت جنس', 'موتر', 'مقدار کل', 'فی / افغانی', 'مجموع / افغانی', 'پرداخت / افغانی', 'باقی / افغانی', 'وضعیت'].map((heading) => (
                      <th key={heading} className="whitespace-nowrap px-3 py-3 font-medium">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {statement.shipments.map((shipment) => {
                    const paymentStatus = shipment.paid >= shipment.total_amount
                      ? { label: 'تصفیه‌شده', cls: 'bg-emerald-50 text-emerald-700' }
                      : shipment.paid > 0
                        ? { label: 'پرداخت قسمی', cls: 'bg-amber-50 text-amber-700' }
                        : { label: 'پرداخت‌نشده', cls: 'bg-red-50 text-red-700' };
                    return (
                      <tr key={shipment.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="whitespace-nowrap px-3 py-4">
                          <Link to={`/shipments/${shipment.id}`} className="font-medium text-slate-800 hover:text-emerald-700">#{shipment.id}</Link>
                          <span className="mr-2 text-slate-500">{persianDate(shipment.ship_date)}</span>
                        </td>
                        <td className="px-3 py-4">{shipment.material}</td>
                        <td className="px-3 py-4">{fmt(shipment.truck_count, 0)}</td>
                        <td className="whitespace-nowrap px-3 py-4">{fmt(shipment.total_quantity, 3)} {unitFa(shipment.unit)}</td>
                        <td className="whitespace-nowrap px-3 py-4">{fmt(shipment.unit_price)}</td>
                        <td className="whitespace-nowrap px-3 py-4">{fmt(shipment.total_amount)}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-emerald-700">{fmt(shipment.paid)}</td>
                        <td className={`whitespace-nowrap px-3 py-4 ${shipment.remaining > 0 ? 'text-amber-700' : 'text-slate-500'}`}>{fmt(shipment.remaining)}</td>
                        <td className="px-3 py-4"><span className={`whitespace-nowrap rounded-md px-2 py-1 ${paymentStatus.cls}`}>{paymentStatus.label}</span></td>
                      </tr>
                    );
                  })}
                  {!statement.shipments.length && (
                    <tr><td className="px-3 py-10 text-center text-slate-500" colSpan={9}>در این بازه ارسالی ثبت نشده است.</td></tr>
                  )}
                </tbody>
                {!!statement.shipments.length && (
                  <tfoot className="bg-[#edf4f0] font-bold text-[#315d50]">
                    <tr>
                      <td className="px-3 py-3" colSpan={2}>مجموع</td>
                      <td className="px-3 py-3">{fmt(statement.totals.trucks, 0)}</td>
                      <td className="whitespace-nowrap px-3 py-3">{fmt(statement.totals.tons, 3)} تن / {fmt(statement.totals.kg, 3)} کیلو</td>
                      <td className="px-3 py-3">—</td>
                      <td className="whitespace-nowrap px-3 py-3">{fmt(statement.totals.total_amount)}</td>
                      <td className="whitespace-nowrap px-3 py-3">{fmt(statement.totals.paid)}</td>
                      <td className="whitespace-nowrap px-3 py-3">{fmt(statement.totals.remaining)}</td>
                      <td className="px-3 py-3"> </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <p className="px-4 py-3 text-[10px] text-slate-400">این گزارش شامل اطلاعات کامل ارسال‌ها و خلاصه پرداخت‌ها در بازه انتخاب‌شده است.</p>
          </section>
        </>
      )}
      {!loadingReceivers && !receivers.length && <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">برای تهیه گزارش، ابتدا یک گیرنده ثبت کنید.</p>}
    </div>
  );
}

function Stat({ label, value, unit, detail, accent = 'default' }: { label: string; value: string; unit?: string; detail?: string; accent?: 'default' | 'green' | 'amber' }) {
  const color = accent === 'green' ? 'text-emerald-700' : accent === 'amber' ? 'text-amber-700' : 'text-[#26333c]';
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-black ${color}`}>{value} {unit && <span className="text-[10px] font-medium">{unit}</span>}</p>
      {detail ? <p className="mt-2 text-[10px] text-slate-400">{detail}</p> : <p className="mt-2 text-[10px] text-slate-400">انتخاب‌شده</p>}
    </section>
  );
}
