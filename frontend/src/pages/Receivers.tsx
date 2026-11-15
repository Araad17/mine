import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import type { Receiver, Statement } from '../types';
import { CURRENCY, downloadPdf, errMsg, fmt, today } from '../lib';

const blankReceiver = { name: '', phone: '', address: '' };
const persianDate = (value: string) => new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(`${value.slice(0, 10)}T00:00:00`));

export default function Receivers() {
  const [params] = useSearchParams();
  const [rows, setRows] = useState<Receiver[]>([]);
  const [selectedId, setSelectedId] = useState(params.get('receiver') ?? '');
  const [search, setSearch] = useState('');
  const [statement, setStatement] = useState<Statement | null>(null);
  const [loadingReceivers, setLoadingReceivers] = useState(true);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  const [receiverForm, setReceiverForm] = useState(blankReceiver);
  const [receiverEditId, setReceiverEditId] = useState<number | null>(null);
  const [showReceiverForm, setShowReceiverForm] = useState(false);
  const [receiverBusy, setReceiverBusy] = useState(false);

  const [shipmentId, setShipmentId] = useState('');
  const [paymentDate, setPaymentDate] = useState(today());
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('نقدی');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentBusy, setPaymentBusy] = useState(false);

  useEffect(() => {
    api.get<Receiver[]>('/receivers')
      .then(({ data }) => {
        setRows(data);
        setSelectedId((current) => current && data.some((receiver) => String(receiver.id) === current)
          ? current
          : data[0] ? String(data[0].id) : '');
      })
      .catch((loadError) => setError(errMsg(loadError)))
      .finally(() => setLoadingReceivers(false));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setStatement(null);
      setLoadingStatement(false);
      return;
    }
    let active = true;
    setLoadingStatement(true);
    setError('');
    api.get<Statement>(`/statement/${selectedId}`)
      .then(({ data }) => {
        if (active) setStatement(data);
      })
      .catch((loadError) => {
        if (active) setError(errMsg(loadError));
      })
      .finally(() => {
        if (active) setLoadingStatement(false);
      });
    return () => { active = false; };
  }, [selectedId, refresh]);

  const selectedReceiver = rows.find((receiver) => String(receiver.id) === selectedId);
  const outstandingShipments = statement?.shipments.filter((shipment) => Number(shipment.remaining) > 0) ?? [];
  const selectedShipment = outstandingShipments.find((shipment) => String(shipment.id) === shipmentId);
  const visibleReceivers = rows.filter((receiver) => receiver.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));

  useEffect(() => {
    setShipmentId((current) => outstandingShipments.some((shipment) => String(shipment.id) === current)
      ? current
      : outstandingShipments[0] ? String(outstandingShipments[0].id) : '');
  }, [statement]);

  const openNewReceiver = () => {
    setReceiverEditId(null);
    setReceiverForm(blankReceiver);
    setError('');
    setShowReceiverForm(true);
  };

  const editReceiver = () => {
    if (!selectedReceiver) return;
    setReceiverEditId(selectedReceiver.id);
    setReceiverForm({
      name: selectedReceiver.name,
      phone: selectedReceiver.phone ?? '',
      address: selectedReceiver.address ?? '',
    });
    setError('');
    setShowReceiverForm(true);
  };

  const saveReceiver = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setReceiverBusy(true);
    try {
      const response = receiverEditId
        ? await api.put(`/receivers/${receiverEditId}`, receiverForm)
        : await api.post('/receivers', receiverForm);
      const saved = response.data as Receiver;
      setRows((current) => receiverEditId
        ? current.map((receiver) => receiver.id === saved.id ? saved : receiver)
        : [...current, saved]);
      setSelectedId(String(saved.id));
      setShowReceiverForm(false);
      setReceiverForm(blankReceiver);
      setReceiverEditId(null);
    } catch (saveError) {
      setError(errMsg(saveError));
    } finally {
      setReceiverBusy(false);
    }
  };

  const savePayment = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedShipment) return;
    setError('');
    setPaymentBusy(true);
    const note = [paymentMethod, paymentNote.trim()].filter(Boolean).join(' - ');
    try {
      await api.post(`/shipments/${selectedShipment.id}/payments`, {
        amount: Number(paymentAmount),
        paid_at: paymentDate,
        note,
      });
      setPaymentAmount('');
      setPaymentNote('');
      setRefresh((value) => value + 1);
    } catch (saveError) {
      setError(errMsg(saveError));
    } finally {
      setPaymentBusy(false);
    }
  };

  const exportStatement = async () => {
    if (!selectedId) return;
    setError('');
    try {
      await downloadPdf(`/statement/${selectedId}/pdf`, `statement-${selectedId}.pdf`);
    } catch (downloadError) {
      setError(errMsg(downloadError));
    }
  };

  return (
    <div className="mx-auto max-w-[1250px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#1b2932]">حساب گیرنده‌ها</h1>
          <p className="mt-1 text-sm text-slate-500">دفتر حساب، تاریخچه ارسال و پرداخت هر گیرنده</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void exportStatement()} disabled={!selectedId} className="rounded-lg bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50">↓ گزارش حساب PDF</button>
          <button type="button" onClick={openNewReceiver} className="rounded-lg bg-[#f3b33d] px-4 py-2.5 text-xs font-bold text-slate-900 shadow-sm hover:bg-[#e8a92f]">＋ گیرنده جدید</button>
        </div>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {showReceiverForm && (
        <form onSubmit={saveReceiver} className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-slate-800">{receiverEditId ? 'ویرایش مشخصات گیرنده' : 'ثبت گیرنده جدید'}</h2>
          <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.5fr_auto]">
            <div><label htmlFor="receiver-name">نام گیرنده *</label><input id="receiver-name" required value={receiverForm.name} onChange={(event) => setReceiverForm({ ...receiverForm, name: event.target.value })} /></div>
            <div><label htmlFor="receiver-phone">تلفن</label><input id="receiver-phone" dir="ltr" value={receiverForm.phone} onChange={(event) => setReceiverForm({ ...receiverForm, phone: event.target.value })} /></div>
            <div><label htmlFor="receiver-address">آدرس</label><input id="receiver-address" value={receiverForm.address} onChange={(event) => setReceiverForm({ ...receiverForm, address: event.target.value })} /></div>
            <div className="flex gap-2">
              <button disabled={receiverBusy} className="rounded-lg bg-[#20332e] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{receiverBusy ? 'در حال ذخیره…' : 'ذخیره'}</button>
              <button type="button" onClick={() => setShowReceiverForm(false)} className="rounded-lg bg-slate-100 px-4 py-2.5 text-xs text-slate-600">انصراف</button>
            </div>
          </div>
        </form>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-4">
          <section className="rounded-xl bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(200px,0.8fr)]">
              <div>
                <label htmlFor="receiver-select">گیرنده / طرف حساب</label>
                <select id="receiver-select" value={selectedId} disabled={loadingReceivers} onChange={(event) => setSelectedId(event.target.value)}>
                  <option value="">{loadingReceivers ? 'در حال بارگذاری…' : 'انتخاب گیرنده'}</option>
                  {visibleReceivers.map((receiver) => <option key={receiver.id} value={receiver.id}>{receiver.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="receiver-search">جستجوی گیرنده</label>
                <input id="receiver-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="نام گیرنده را بنویسید..." />
              </div>
            </div>
          </section>

          {statement && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="مجموع حساب" value={statement.totals.total_amount} />
                <StatCard label="مجموع پرداخت" value={statement.totals.paid} accent="green" />
                <StatCard label="حساب باقی‌مانده" value={statement.totals.remaining} accent="amber" />
              </div>

              <section className="overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-4">
                  <h2 className="text-sm font-bold text-slate-800">گردش حساب گیرنده</h2>
                  <span className="text-[10px] text-slate-400">{statement.from ? persianDate(statement.from) : 'ابتدا'} تا {statement.to ? persianDate(statement.to) : 'امروز'}</span>
                </div>
                <div className="px-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#edf4f0] px-3 py-2.5 text-[10px] text-[#315d50]">
                    <span>{fmt(statement.totals.shipments, 0)} ارسال</span>
                    <span>{fmt(statement.totals.trucks, 0)} موتر</span>
                    <span>مجموع جنس: {fmt(statement.totals.tons, 3)} تن و {fmt(statement.totals.kg, 3)} کیلو</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[650px] text-right text-[11px]">
                      <thead className="bg-[#f4f6f7] text-slate-500">
                        <tr>
                          {['تاریخ', 'شرح تراکنش', 'حساب / افغانی', 'پرداخت / افغانی', 'مانده / افغانی'].map((heading) => <th key={heading} className="whitespace-nowrap px-3 py-3 font-medium">{heading}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {statement.ledger.map((entry) => (
                          <tr key={entry.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                            <td className="whitespace-nowrap px-3 py-3 text-slate-500">{persianDate(entry.date)}</td>
                            <td className="px-3 py-3">
                              <Link to={`/shipments/${entry.shipment_id}`} className="font-medium text-slate-800 hover:text-emerald-700">
                                {entry.type === 'shipment' ? `ارسال جنس / ${entry.note ?? 'بار'} #${entry.shipment_id}` : `رسید پرداخت بابت ارسال #${entry.shipment_id}`}
                              </Link>
                              {entry.type === 'payment' && entry.note && <span className="mr-2 text-[10px] text-slate-400">{entry.note}</span>}
                            </td>
                            <td className="px-3 py-3">{entry.type === 'shipment' ? fmt(entry.amount) : '—'}</td>
                            <td className="px-3 py-3 text-emerald-700">{entry.type === 'payment' ? fmt(entry.amount) : '—'}</td>
                            <td className={`px-3 py-3 font-medium ${entry.balance > 0 ? 'text-amber-700' : 'text-slate-700'}`}>{fmt(entry.balance)}</td>
                          </tr>
                        ))}
                        {!loadingStatement && statement.ledger.length === 0 && (
                          <tr><td className="px-3 py-8 text-center text-slate-500" colSpan={5}>برای این گیرنده هنوز ارسال یا پرداختی ثبت نشده است.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="m-3 flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3 text-xs">
                  <span className="text-amber-800">مانده نهایی حساب</span>
                  <strong className="text-amber-800">{fmt(statement.totals.remaining)} {CURRENCY}</strong>
                </div>
              </section>
            </>
          )}
          {loadingStatement && <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">در حال بارگذاری گردش حساب…</p>}
          {!selectedId && !loadingReceivers && <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">برای مشاهده گردش حساب، یک گیرنده انتخاب کنید.</p>}
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-800">مشخصات گیرنده</h2>
              {selectedReceiver && <button type="button" onClick={editReceiver} className="text-[11px] text-emerald-700 hover:underline">ویرایش</button>}
            </div>
            {selectedReceiver ? (
              <>
                <p className="mt-3 font-bold text-[#27343b]">{selectedReceiver.name}</p>
                <p className="mt-2 text-xs text-slate-500">مسئول حساب: {selectedReceiver.name}</p>
                <p className="mt-1 text-xs text-slate-500">تلفن: {selectedReceiver.phone || 'ثبت نشده'}</p>
                <p className="mt-1 text-xs text-slate-500">آدرس: {selectedReceiver.address || 'ثبت نشده'}</p>
                {statement && <p className="mt-3 text-[10px] text-emerald-700">تعداد ارسال: {fmt(statement.totals.shipments, 0)}</p>}
              </>
            ) : <p className="mt-3 text-xs text-slate-500">ابتدا یک گیرنده انتخاب کنید.</p>}
          </section>

          <form onSubmit={savePayment} className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800">ثبت پرداخت جدید</h2>
            <p className="text-[10px] text-slate-400">{selectedReceiver ? `برای ${selectedReceiver.name}` : 'برای گیرنده انتخاب‌شده'}</p>
            <div>
              <label htmlFor="payment-shipment">ارسال دارای مانده</label>
              <select id="payment-shipment" required value={shipmentId} disabled={!outstandingShipments.length} onChange={(event) => setShipmentId(event.target.value)}>
                {!outstandingShipments.length && <option value="">مانده‌ای برای پرداخت وجود ندارد</option>}
                {outstandingShipments.map((shipment) => <option key={shipment.id} value={shipment.id}>ارسال #{shipment.id} — {fmt(shipment.remaining)} {CURRENCY}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="payment-date">تاریخ پرداخت</label>
              <input id="payment-date" type="date" required value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
            </div>
            <div>
              <label htmlFor="payment-amount">مبلغ پرداخت / {CURRENCY}</label>
              <input id="payment-amount" type="number" min="0.01" max={selectedShipment?.remaining} step="0.01" required dir="ltr" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} placeholder="مبلغ را وارد کنید" />
            </div>
            <div>
              <label htmlFor="payment-method">روش پرداخت</label>
              <select id="payment-method" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                <option>نقدی</option><option>حواله بانکی</option><option>سایر</option>
              </select>
            </div>
            <div>
              <label htmlFor="payment-note">توضیحات پرداخت</label>
              <textarea id="payment-note" rows={2} value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} placeholder="توضیحات اختیاری..." />
            </div>
            {selectedShipment && <p className="text-[11px] text-amber-700">حداکثر پرداخت: {fmt(selectedShipment.remaining)} {CURRENCY}</p>}
            <button disabled={paymentBusy || !selectedShipment} className="w-full rounded-lg bg-[#20332e] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#2c4941] disabled:opacity-50">
              {paymentBusy ? 'در حال ثبت…' : 'ثبت پرداخت'}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent = 'default' }: { label: string; value: number; accent?: 'default' | 'green' | 'amber' }) {
  const color = accent === 'green' ? 'text-emerald-700' : accent === 'amber' ? 'text-amber-700' : 'text-[#26333c]';
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-black ${color}`}>{fmt(value)} <span className="text-[10px] font-medium">{CURRENCY}</span></p>
      <p className="mt-2 text-[10px] text-slate-400">انتخاب‌شده</p>
    </section>
  );
}
