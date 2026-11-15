import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import type { Material, Receiver, ShipmentDetail, Truck, Unit } from '../types';
import { CURRENCY, downloadPdf, errMsg, fmt, today, unitFa } from '../lib';

type TruckInput = Omit<Truck, 'load_amount'> & { load_amount: number | '' };
const emptyTruck = (): TruckInput => ({ driver_name: '', plate_number: '', load_amount: '' });
const persianCalendar = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric' });
const parsePersianNumber = (value: string) => Number(value.replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))));

function persianParts(date: Date) {
  const parts = persianCalendar.formatToParts(date);
  return {
    day: parsePersianNumber(parts.find((part) => part.type === 'day')?.value ?? ''),
    month: parts.find((part) => part.type === 'month')?.value ?? '',
    year: parsePersianNumber(parts.find((part) => part.type === 'year')?.value ?? ''),
  };
}

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calendarMonthStart(date: Date) {
  const first = new Date(date);
  first.setDate(first.getDate() - persianParts(first).day + 1);
  return first;
}

function DateCalendar({ value, onChange }: { value: string; onChange: (date: string) => void }) {
  const selectedDate = new Date(`${value}T12:00:00`);
  const [monthDate, setMonthDate] = useState(() => calendarMonthStart(selectedDate));

  useEffect(() => setMonthDate(calendarMonthStart(selectedDate)), [value]);

  const monthStart = calendarMonthStart(monthDate);
  const offset = (monthStart.getDay() + 1) % 7;
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(monthStart);
    date.setDate(monthStart.getDate() - offset + index);
    const parts = persianParts(date);
    const currentParts = persianParts(monthStart);
    return {
      date,
      day: parts.day,
      isCurrentMonth: parts.month === currentParts.month && parts.year === currentParts.year,
      isSelected: toDateInput(date) === value,
    };
  });
  const monthLabel = persianCalendar.format(monthStart);
  const moveMonth = (amount: number) => {
    const next = new Date(monthStart);
    next.setDate(next.getDate() + amount * 35);
    setMonthDate(calendarMonthStart(next));
  };
  const weekdays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

  return (
    <section className="rounded-xl bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-1">
        <button type="button" aria-label="ماه قبل" onClick={() => moveMonth(-1)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100">‹</button>
        <h2 className="text-sm font-bold text-slate-800">{monthLabel}</h2>
        <button type="button" aria-label="ماه بعد" onClick={() => moveMonth(1)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100">›</button>
      </div>
      <div className="mt-3 grid grid-cols-7 text-center text-[10px] text-slate-400">
        {weekdays.map((day) => <span key={day} className="py-1">{day}</span>)}
      </div>
      <div className="grid grid-cols-7 text-center">
        {cells.map(({ date, day, isCurrentMonth, isSelected }) => (
          <button
            key={toDateInput(date)}
            type="button"
            disabled={!isCurrentMonth}
            onClick={() => onChange(toDateInput(date))}
            className={`mx-auto my-0.5 flex h-6 w-6 items-center justify-center rounded-md text-[10px] ${
              isSelected ? 'bg-[#f3b33d] font-bold text-slate-900' : isCurrentMonth ? 'text-slate-700 hover:bg-amber-50' : 'text-slate-300'
            }`}
          >
            {fmt(day, 0)}
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-[10px] text-emerald-700">{persianCalendar.format(selectedDate)}</p>
    </section>
  );
}

export default function ShipmentForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const savePdfAfterSubmit = useRef(false);
  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [date, setDate] = useState(today());
  const [receiverId, setReceiverId] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [unit, setUnit] = useState<Unit>('ton');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [initialPay, setInitialPay] = useState('');
  const [paid, setPaid] = useState(0);
  const [trucks, setTrucks] = useState<TruckInput[]>([emptyTruck()]);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const loadForm = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const [receiverResponse, materialResponse] = await Promise.all([
          api.get('/receivers'),
          api.get('/materials'),
        ]);
        setReceivers(receiverResponse.data);
        setMaterials(materialResponse.data);
        if (id) {
          const { data: shipment } = await api.get<ShipmentDetail>(`/shipments/${id}`);
          setDate(shipment.ship_date);
          setReceiverId(String(shipment.receiver_id));
          setMaterialId(String(shipment.material_id));
          setUnit(shipment.unit);
          setPrice(String(shipment.unit_price));
          setNotes(shipment.notes ?? '');
          setPaid(Number(shipment.paid));
          setTrucks(shipment.trucks.map((truck) => ({ ...truck })));
        }
      } catch (loadErr) {
        setLoadError(errMsg(loadErr));
      } finally {
        setLoading(false);
      }
    };
    void loadForm();
  }, [id]);

  const qty = trucks.reduce((sum, truck) => sum + (Number(truck.load_amount) || 0), 0);
  const total = qty * (Number(price) || 0);
  const currentPaid = id ? paid : Number(initialPay) || 0;
  const remaining = Math.max(0, total - currentPaid);

  const setTruck = (index: number, patch: Partial<TruckInput>) =>
    setTrucks((current) => current.map((truck, itemIndex) => itemIndex === index ? { ...truck, ...patch } : truck));

  const quickAdd = async (kind: 'receivers' | 'materials') => {
    const name = window.prompt(kind === 'receivers' ? 'نام گیرنده جدید:' : 'نام نوعیت جنس جدید:');
    if (!name?.trim()) return;
    try {
      const { data } = await api.post(`/${kind}`, { name });
      if (kind === 'receivers') {
        setReceivers((current) => [...current, data]);
        setReceiverId(String(data.id));
      } else {
        setMaterials((current) => [...current, data]);
        setMaterialId(String(data.id));
      }
    } catch (addError) {
      setError(errMsg(addError));
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    const shouldDownloadPdf = savePdfAfterSubmit.current;
    savePdfAfterSubmit.current = false;
    const body = {
      ship_date: date,
      receiver_id: Number(receiverId),
      material_id: Number(materialId),
      unit,
      unit_price: Number(price),
      notes: notes || null,
      trucks: trucks.map((truck) => ({ ...truck, load_amount: Number(truck.load_amount) })),
      ...(id ? {} : { initial_payment: Number(initialPay) || 0 }),
    };
    try {
      const response = id
        ? await api.put(`/shipments/${id}`, body)
        : await api.post('/shipments', body);
      if (shouldDownloadPdf) {
        await downloadPdf(`/shipments/${response.data.id}/invoice.pdf`, `invoice-${response.data.id}.pdf`);
      }
      nav(`/shipments/${response.data.id}`);
    } catch (submitError) {
      setError(errMsg(submitError));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="p-4 text-sm text-slate-500">در حال بارگذاری فرم…</p>;

  return (
    <div className="mx-auto max-w-[1180px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-1 text-[11px] text-slate-400">ارسال‌ها / ارسال جدید / {id ? `ویرایش شماره ${id}` : 'شماره خودکار'}</div>
          <h1 className="text-2xl font-black text-[#1b2932]">{id ? `ویرایش ارسال شماره ${id}` : 'ثبت ارسال جدید'}</h1>
        </div>
        <Link to="/shipments" className="rounded-lg bg-white px-4 py-2.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50">← بازگشت به ارسال‌ها</Link>
      </div>

      {loadError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</p>}

      <form ref={formRef} onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_168px]">
          <section className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-800">۱. مشخصات ارسال و گیرنده</h2>
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
              <div>
                <label htmlFor="shipment-receiver">گیرنده / طرف حساب *</label>
                <div className="flex gap-2">
                  <select id="shipment-receiver" required value={receiverId} onChange={(event) => setReceiverId(event.target.value)}>
                    <option value="">انتخاب گیرنده</option>
                    {receivers.map((receiver) => <option key={receiver.id} value={receiver.id}>{receiver.name}</option>)}
                  </select>
                  <button type="button" title="افزودن گیرنده" onClick={() => void quickAdd('receivers')} className="shrink-0 rounded-lg bg-[#edf4f0] px-3 text-xs font-bold text-emerald-800">＋</button>
                </div>
              </div>
              <div>
                <label htmlFor="shipment-material">نوعیت جنس *</label>
                <div className="flex gap-2">
                  <select id="shipment-material" required value={materialId} onChange={(event) => setMaterialId(event.target.value)}>
                    <option value="">انتخاب نوعیت جنس</option>
                    {materials.map((material) => <option key={material.id} value={material.id}>{material.name}</option>)}
                  </select>
                  <button type="button" title="افزودن نوعیت جنس" onClick={() => void quickAdd('materials')} className="shrink-0 rounded-lg bg-[#edf4f0] px-3 text-xs font-bold text-emerald-800">＋</button>
                </div>
              </div>
              <div>
                <label htmlFor="shipment-date">تاریخ ارسال *</label>
                <input id="shipment-date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
              </div>
              <div>
                <label>تعداد موتر</label>
                <div className="flex h-[42px] items-center rounded-lg bg-[#f5f6f7] px-3 text-sm text-slate-700">{fmt(trucks.length, 0)} موتر</div>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="shipment-notes">توضیحات / یادداشت</label>
                <input id="shipment-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="در صورت نیاز توضیحی بنویسید..." />
              </div>
            </div>
          </section>
          <DateCalendar value={date} onChange={setDate} />
        </div>

        <section className="rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-800">۲. مشخصات موترها و مقدار بار</h2>
            <button type="button" onClick={() => setTrucks((current) => [...current, emptyTruck()])} className="rounded-lg bg-[#edf4f0] px-4 py-2 text-xs font-bold text-emerald-800 hover:bg-[#e1eee8]">＋ افزودن موتر</button>
          </div>
          <div className="space-y-3">
            {trucks.map((truck, index) => (
              <div key={index} className="grid items-end gap-2 sm:grid-cols-[2rem_1.2fr_1.1fr_0.8fr_1fr_auto]">
                <span className="pb-3 text-center text-xs text-slate-400">{fmt(index + 1, 0)}</span>
                <div>
                  <label htmlFor={`driver-${index}`}>اسم راننده *</label>
                  <input id={`driver-${index}`} required value={truck.driver_name} onChange={(event) => setTruck(index, { driver_name: event.target.value })} placeholder="نام راننده" />
                </div>
                <div>
                  <label htmlFor={`plate-${index}`}>نمبر پلیت *</label>
                  <input id={`plate-${index}`} required dir="ltr" value={truck.plate_number} onChange={(event) => setTruck(index, { plate_number: event.target.value })} placeholder="نمبر پلیت" />
                </div>
                <div>
                  <label htmlFor={`load-${index}`}>بار / {unitFa(unit)} *</label>
                  <input id={`load-${index}`} type="number" min="0.001" step="0.001" required dir="ltr" value={truck.load_amount} onChange={(event) => setTruck(index, { load_amount: event.target.value === '' ? '' : Number(event.target.value) })} placeholder="۰" />
                </div>
                <div>
                  <label>مجموع بار</label>
                  <div className="flex h-[42px] items-center rounded-lg bg-[#f5f6f7] px-3 text-xs text-slate-600">{truck.load_amount ? `${fmt(Number(truck.load_amount), 3)} ${unitFa(unit)}` : '—'}</div>
                </div>
                <button type="button" aria-label={`حذف موتر ${index + 1}`} disabled={trucks.length <= 1} onClick={() => setTrucks((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="mb-1 rounded px-2 py-2 text-xs text-red-600 hover:bg-red-50 disabled:invisible">حذف</button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-slate-800">۳. قیمت‌گذاری و وضعیت حساب</h2>
          <div className="grid items-end gap-3 md:grid-cols-3">
            <div>
              <label>واحد محاسبه</label>
              <div className="flex h-[42px] items-center gap-5 rounded-lg bg-[#f5f6f7] px-3">
                {(['ton', 'kg'] as Unit[]).map((value) => (
                  <label key={value} className="mb-0 flex items-center gap-2 text-xs">
                    <input type="radio" name="shipment-unit" checked={unit === value} onChange={() => setUnit(value)} />
                    {unitFa(value)}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="shipment-price">قیمت فی هر {unitFa(unit)} / {CURRENCY} *</label>
              <input id="shipment-price" type="number" min="0" step="0.01" required dir="ltr" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="۰" />
            </div>
            {!id && (
              <div>
                <label htmlFor="initial-payment">مبلغ پرداخت‌شده / {CURRENCY}</label>
                <input id="initial-payment" type="number" min="0" max={total || undefined} step="0.01" dir="ltr" value={initialPay} onChange={(event) => setInitialPay(event.target.value)} placeholder="۰" />
              </div>
            )}
          </div>
          <p className="mt-3 text-[11px] text-slate-400">قیمت فی بر اساس واحد انتخاب‌شده محاسبه می‌شود.</p>
          <div className="mt-4 grid gap-2 rounded-lg bg-[#edf4f0] p-4 sm:grid-cols-3">
            <Summary label="مقدار کل" value={`${fmt(qty, 3)} ${unitFa(unit)}`} />
            <Summary label="مجموع حساب" value={`${fmt(total)} ${CURRENCY}`} />
            <Summary label={id ? 'باقی حساب' : 'حساب باقی‌مانده'} value={`${fmt(remaining)} ${CURRENCY}`} accent />
          </div>
        </section>

        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm">
          <span className="text-[11px] text-slate-400">پس از ذخیره، شماره ارسال به‌صورت خودکار ایجاد می‌شود.</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => nav(-1)} className="rounded-lg bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200">انصراف</button>
            <button type="submit" disabled={busy || !!loadError} className="rounded-lg bg-[#20332e] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#2c4941] disabled:opacity-60">{busy ? 'در حال ذخیره…' : 'ثبت ارسال'}</button>
            <button
              type="button"
              disabled={busy || !!loadError}
              onClick={() => {
                if (formRef.current?.reportValidity()) {
                  savePdfAfterSubmit.current = true;
                  formRef.current.requestSubmit();
                }
              }}
              className="rounded-lg bg-[#f3b33d] px-5 py-2.5 text-xs font-bold text-slate-900 hover:bg-[#e8a92f] disabled:opacity-60"
            >
              ثبت و دریافت فاکتور PDF
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Summary({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="text-center">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-black ${accent ? 'text-amber-700' : 'text-[#26333c]'}`}>{value}</p>
    </div>
  );
}
