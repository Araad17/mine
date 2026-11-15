import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import type { ShipmentDetail } from '../types';
import { CURRENCY, downloadPdf, errMsg, fmt, statusOf, today, unitFa } from '../lib';

export default function ShipmentView() {
  const { id } = useParams();
  const nav = useNavigate();
  const [s, setS] = useState<ShipmentDetail | null>(null);
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState(today());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { api.get(`/shipments/${id}`).then((r) => setS(r.data)); }, [id]);
  if (!s) return <p>در حال بارگذاری…</p>;
  const st = statusOf(s.total_amount, s.paid);

  const addPayment = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    try {
      const r = await api.post(`/shipments/${id}/payments`, { amount: Number(amount), paid_at: paidAt, note: note || null });
      setS(r.data); setAmount(''); setNote('');
    } catch (err) { setError(errMsg(err)); }
  };
  const downloadInvoice = async () => {
    setError('');
    try {
      await downloadPdf(`/shipments/${s.id}/invoice.pdf`, `invoice-${s.id}.pdf`);
    } catch (downloadError) {
      setError(errMsg(downloadError));
    }
  };
  const delPayment = async (pid: number) => {
    if (!confirm('این پرداخت حذف شود؟')) return;
    setS((await api.delete(`/shipments/${id}/payments/${pid}`)).data);
  };
  const delShipment = async () => {
    if (!confirm('کل این ارسال و پرداخت‌هایش حذف شود؟')) return;
    await api.delete(`/shipments/${id}`); nav('/');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="ml-auto text-xl font-bold">فاکتور شماره {s.id}</h1>
        <Link className="btn btn-ghost" to={`/pdf/invoice/${s.id}`}>پیش‌نمایش PDF</Link>
        <button className="btn btn-accent" onClick={() => void downloadInvoice()}>دانلود PDF</button>
        <Link className="btn btn-ghost" to={`/shipments/${s.id}/edit`}>ویرایش</Link>
        <button className="btn btn-danger" onClick={delShipment}>حذف</button>
      </div>

      <div className="card grid gap-3 md:grid-cols-4">
        <Info k="تاریخ" v={s.ship_date} /><Info k="گیرنده" v={s.receiver_name} />
        <Info k="نوعیت جنس" v={s.material} /><Info k="تعداد موتر" v={String(s.truck_count)} />
        <Info k="مقدار کل" v={`${fmt(s.total_quantity, 3)} ${unitFa(s.unit)}`} />
        <Info k={`فی هر ${unitFa(s.unit)}`} v={`${fmt(s.unit_price)} ${CURRENCY}`} />
        <Info k="مجموع کل حساب" v={`${fmt(s.total_amount)} ${CURRENCY}`} />
        <div><div className="text-sm text-coal-500">وضعیت</div><span className={`rounded px-2 py-0.5 text-sm ${st.cls}`}>{st.label}</span></div>
        <Info k="تصفیه شده" v={`${fmt(s.paid)} ${CURRENCY}`} />
        <Info k="باقی‌مانده" v={`${fmt(s.remaining)} ${CURRENCY}`} />
        {s.notes && <div className="md:col-span-2"><Info k="یادداشت" v={s.notes} /></div>}
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead><tr><th className="th">#</th><th className="th">نام راننده</th><th className="th">نمبر پلیت</th><th className="th">مقدار بار</th></tr></thead>
          <tbody>{s.trucks.map((t, i) => (
            <tr key={i}><td className="td">{i + 1}</td><td className="td">{t.driver_name}</td><td className="td num">{t.plate_number}</td><td className="td num">{fmt(t.load_amount, 3)} {unitFa(s.unit)}</td></tr>
          ))}</tbody>
        </table>
      </div>

      <div className="card space-y-3">
        <h2 className="font-bold">پرداخت‌ها</h2>
        {s.payments.map((p) => (
          <div key={p.id} className="flex items-center gap-4 border-b border-coal-100 pb-2 text-sm">
            <span>{p.paid_at}</span><b className="num">{fmt(p.amount)} {CURRENCY}</b><span className="text-coal-500">{p.note}</span>
            <button className="mr-auto text-red-700" onClick={() => delPayment(p.id)}>حذف</button>
          </div>
        ))}
        {!s.payments.length && <p className="text-sm text-coal-500">هنوز پرداختی ثبت نشده است.</p>}
        {s.remaining > 0 && (
          <form onSubmit={addPayment} className="grid items-end gap-3 md:grid-cols-4">
            <div><label>مبلغ پرداخت</label><input type="number" min="0.01" step="0.01" max={s.remaining} required dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div><label>تاریخ</label><input type="date" required value={paidAt} onChange={(e) => setPaidAt(e.target.value)} /></div>
            <div><label>توضیحات</label><input value={note} onChange={(e) => setNote(e.target.value)} /></div>
            <button className="btn">ثبت پرداخت</button>
          </form>
        )}
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}

const Info = ({ k, v }: { k: string; v: string }) => (<div><div className="text-sm text-coal-500">{k}</div><div className="font-medium">{v}</div></div>);
