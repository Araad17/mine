import puppeteer, { type Browser } from 'puppeteer';

const COMPANY = process.env.COMPANY_NAME || 'معدن ذغال سنگ';
const CUR = process.env.CURRENCY || 'افغانی';

let browser: Browser | null = null;
type PdfMargins = { top: string; bottom: string; left: string; right: string };
const defaultMargins: PdfMargins = { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' };

async function getBrowser() {
  if (!browser || !browser.connected) {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  }
  return browser;
}

export async function htmlToPdf(html: string, margin: PdfMargins = defaultMargins): Promise<Buffer> {
  const page = await (await getBrowser()).newPage();
  try {
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const n = (v: number, d = 2) => Number(v).toLocaleString('en-US', { maximumFractionDigits: d });
const dateFa = (v: string) => new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: '2-digit', day: '2-digit' })
  .format(new Date(`${String(v).slice(0, 10)}T12:00:00`));
const unitFa = (u: string) => (u === 'ton' ? 'تن' : 'کیلو');
const status = (total: number, paid: number) => (paid >= total ? 'تصفیه شده' : paid > 0 ? 'تصفیه جزئی' : 'تصفیه نشده');

const CSS = `
 @page { size: A4; }
 body { font-family: 'Vazirmatn','Tahoma','Arial',sans-serif; direction: rtl; color:#1f2933; font-size:12px; margin:0; }
 h1 { font-size:20px; margin:0 0 2px; } h2 { font-size:14px; margin:18px 0 6px; }
 .head { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:3px solid #1f2933; padding-bottom:8px; }
 .muted { color:#66727e; }
 .grid { display:grid; grid-template-columns:1fr 1fr; gap:4px 24px; margin-top:12px; }
 table { width:100%; border-collapse:collapse; margin-top:6px; }
 th { background:#1f2933; color:#fff; font-weight:600; }
 th,td { border:1px solid #c9d0d6; padding:5px 7px; text-align:right; }
 td.num, th.num { text-align:left; direction:ltr; font-variant-numeric:tabular-nums; }
 tfoot td { background:#eef1f3; font-weight:700; }
 .totals { margin-top:14px; width:55%; margin-right:auto; }
 .totals td:first-child { background:#eef1f3; font-weight:600; }
 .remain td { background:#fbe9dc !important; font-weight:700; }
 .sign { display:flex; justify-content:space-between; margin-top:60px; }
 .sign div { width:40%; border-top:1px solid #1f2933; padding-top:4px; text-align:center; }
 .invoice { box-sizing:border-box; width:100%; padding:14mm 12mm; font-size:10px; }
 .invoice-topline { height:3px; background:#f3b33d; margin:-14mm -12mm 18px; }
 .invoice-head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid #e3e8e5; padding:0 0 14px; }
 .invoice-head h1 { font-size:17px; margin:0 0 5px; }
 .invoice-title { text-align:left; }
 .invoice-title h2 { font-size:14px; margin:3px 0 4px; }
 .invoice-muted { color:#8a9599; font-size:9px; line-height:1.9; }
 .invoice-meta { display:flex; justify-content:space-between; gap:24px; padding:14px 0 16px; }
 .invoice-meta > div { flex:1; }
 .invoice-meta .date-meta { text-align:left; }
 .invoice-meta p { margin:3px 0; line-height:1.8; }
 .invoice-table { margin-top:4px; font-size:9px; }
 .invoice-table th { background:#eff3f1; color:#66716f; font-weight:600; }
 .invoice-table th, .invoice-table td { border:0; border-bottom:1px solid #e6ebe8; padding:9px 7px; }
 .invoice-table tbody tr { height:42px; }
 .invoice-table tfoot td { border:0; background:#eff3f1; color:#315d50; font-weight:700; }
 .quantity-total { margin-top:12px; border-radius:5px; background:#eff3f1; color:#315d50; padding:10px 12px; text-align:left; font-size:10px; font-weight:700; }
 .invoice-summary { display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-top:16px; align-items:start; }
 .invoice-status h3 { margin:0 0 10px; color:#b96b16; font-size:11px; }
 .invoice-status p { margin:4px 0; color:#67747a; line-height:1.8; }
 .invoice-totals { border-radius:6px; background:#edf3ef; padding:10px 12px; }
 .invoice-totals div { display:flex; justify-content:space-between; gap:10px; border-bottom:1px solid #dfe8e2; padding:7px 0; }
 .invoice-totals div:last-child { border:0; }
 .invoice-totals span { color:#71807b; }
 .invoice-totals b { color:#26333c; }
 .invoice-totals .invoice-remaining b { color:#b96b16; }
 .invoice-footnote { margin-top:20px; color:#879196; font-size:9px; line-height:1.9; text-align:right; }
 .invoice-sign { display:flex; justify-content:space-between; margin-top:52px; }
 .invoice-sign div { width:38%; border-top:1px solid #cbd4d0; padding-top:8px; color:#7a8589; text-align:center; font-size:9px; }
`;
const wrap = (title: string, body: string) => `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body>${body}</body></html>`;

export function invoiceHtml(s: any) {
  const rows = s.trucks.map((t: any) => {
    const tons = s.unit === 'ton' ? n(t.load_amount, 3) : '—';
    const kg = s.unit === 'kg' ? n(t.load_amount, 3) : '—';
    return `<tr>
      <td><b>${esc(t.driver_name)}</b><br><span class="invoice-muted">${esc(t.plate_number)}</span></td>
      <td class="num">${tons}</td><td class="num">${kg}</td><td>${unitFa(s.unit)}</td>
      <td class="num">${n(t.load_amount * s.unit_price)}</td></tr>`;
  }).join('');
  const remaining = Number(s.remaining ?? s.total_amount - s.paid);
  const paymentStatus = status(Number(s.total_amount), Number(s.paid));
  return wrap(`فاکتور ${s.id}`, `
  <div class="invoice">
    <div class="invoice-topline"></div>
    <div class="invoice-head">
      <div>
        <h1>${esc(COMPANY)}</h1>
        <div class="invoice-muted">مدیریت ارسال و حسابات</div>
      </div>
      <div class="invoice-title">
        <h2>فاکتور فروش و ارسال جنس</h2>
        <div class="invoice-muted">شماره ${s.id}</div>
      </div>
    </div>

    <div class="invoice-meta">
      <div class="date-meta">
        <p><b>تاریخ ارسال:</b> ${esc(dateFa(s.ship_date))}</p>
        <p class="invoice-muted">نوعیت جنس: ${esc(s.material)} · واحد: ${unitFa(s.unit)}</p>
        <p class="invoice-muted">تعداد موتر: ${s.truck_count}</p>
      </div>
      <div>
        <p class="invoice-muted">گیرنده / طرف حساب</p>
        <p><b>${esc(s.receiver_name)}</b></p>
        <p class="invoice-muted">مسئول حساب: ${esc(s.receiver_name)}</p>
        <p class="invoice-muted">${esc(s.receiver_phone || '')}${s.receiver_address ? ` · ${esc(s.receiver_address)}` : ''}</p>
      </div>
    </div>

    <table class="invoice-table">
      <thead><tr>
        <th>راننده / نمبر پلیت</th><th class="num">تن</th><th class="num">کیلو</th><th>واحد</th><th class="num">مجموع / افغانی</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="5">جزئیات موتر ثبت نشده است.</td></tr>'}</tbody>
      <tfoot><tr>
        <td>مجموع</td><td class="num">${s.unit === 'ton' ? n(s.total_quantity, 3) : '—'}</td>
        <td class="num">${s.unit === 'kg' ? n(s.total_quantity, 3) : '—'}</td><td>${unitFa(s.unit)}</td>
        <td class="num">${n(s.total_amount)}</td>
      </tr></tfoot>
    </table>
    <div class="quantity-total">مقدار کل: ${s.unit === 'ton' ? `${n(s.total_quantity, 3)} تن` : `${n(s.total_quantity, 3)} کیلو`}</div>

    <div class="invoice-summary">
      <div class="invoice-status">
        <h3>وضعیت: ${paymentStatus}</h3>
        <p>مبنای محاسبه: فی ${unitFa(s.unit)} ${n(s.unit_price)} ${CUR}</p>
        <p>مقدار کل حساب: ${n(s.total_amount)} ${CUR}</p>
        <p>پرداخت‌شده: ${n(s.paid)} ${CUR}</p>
      </div>
      <div class="invoice-totals">
        <div><span>مجموع کل حساب</span><b>${n(s.total_amount)}</b></div>
        <div><span>مبلغ تصفیه‌شده</span><b>${n(s.paid)}</b></div>
        <div class="invoice-remaining"><span>باقی این فاکتور</span><b>${n(remaining)}</b></div>
        <div><span>واحد</span><b>${CUR}</b></div>
      </div>
    </div>

    ${s.notes ? `<p class="invoice-footnote"><b>یادداشت:</b> ${esc(s.notes)}</p>` : ''}
    <p class="invoice-footnote">مبلغ قابل پرداخت این فاکتور: ${n(remaining)} ${CUR}<br>این سند شامل جزئیات بارگیری و وضعیت حساب فاکتور است.</p>
    <div class="invoice-sign"><div>امضای فروشنده</div><div>امضای گیرنده</div></div>
  </div>`);
}

export function statementHtml(st: any) {
  const t = st.totals;
  const rows = st.shipments.map((s: any) => `<tr>
    <td>${s.id}</td><td>${esc(s.ship_date)}</td><td>${esc(s.material)}</td><td class="num">${s.truck_count}</td>
    <td class="num">${n(s.total_quantity, 3)} ${unitFa(s.unit)}</td><td class="num">${n(s.unit_price)}</td>
    <td class="num">${n(s.total_amount)}</td><td class="num">${n(s.paid)}</td><td class="num">${n(s.remaining)}</td><td>${status(s.total_amount, s.paid)}</td></tr>`).join('');
  return wrap(`صورت حساب ${st.receiver.name}`, `
  <div class="head"><div><h1>${esc(COMPANY)}</h1><div class="muted">صورت حساب گیرنده</div></div>
    <div style="text-align:left">${st.from || st.to ? `از ${esc(st.from ?? '—')} تا ${esc(st.to ?? '—')}` : 'تمام دوره‌ها'}</div></div>
  <div class="grid"><div><b>گیرنده:</b> ${esc(st.receiver.name)}</div><div><b>تماس:</b> ${esc(st.receiver.phone)}</div>
    <div><b>آدرس:</b> ${esc(st.receiver.address)}</div><div></div></div>
  <h2>ارسال‌ها</h2>
  <table style="font-size:11px"><tr><th>فاکتور</th><th>تاریخ</th><th>جنس</th><th class="num">موتر</th><th class="num">مقدار</th><th class="num">فی</th>
    <th class="num">مجموع (${CUR})</th><th class="num">تصفیه شده</th><th class="num">باقی‌مانده</th><th>وضعیت</th></tr>${rows || '<tr><td colspan="10">ارسالی ثبت نشده است</td></tr>'}</table>
  <table class="totals">
    <tr><td>تعداد ارسال / موتر</td><td class="num">${t.shipments} / ${t.trucks}</td></tr>
    <tr><td>مقدار ارسال شده</td><td class="num">${n(t.tons, 3)} تن + ${n(t.kg, 3)} کیلو = ${n(t.total_in_tons, 3)} تن</td></tr>
    <tr><td>مجموع کل حساب</td><td class="num">${n(t.total_amount)} ${CUR}</td></tr>
    <tr><td>تصفیه شده (پرداختی)</td><td class="num">${n(t.paid)} ${CUR}</td></tr>
    <tr class="remain"><td>باقی‌مانده</td><td class="num">${n(t.remaining)} ${CUR}</td></tr>
  </table>
  <div class="sign"><div>امضای فروشنده</div><div>امضای گیرنده</div></div>`);
}
