import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { errMsg, fetchPdfBlob } from '../lib';

export default function PdfPreview() {
  const { kind, id } = useParams();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const isInvoice = kind === 'invoice';
  const backTo = isInvoice && id ? `/shipments/${id}` : '/statement';
  const fileName = isInvoice ? `invoice-${id}.pdf` : `statement-${id}.pdf`;

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    setLoading(true);
    setError('');
    setPdfUrl('');

    if (!id || !Number.isInteger(Number(id)) || Number(id) <= 0 || !['invoice', 'statement'].includes(kind ?? '')) {
      setError('آدرس پیش‌نمایش PDF معتبر نیست.');
      setLoading(false);
      return () => { active = false; };
    }

    const endpoint = isInvoice ? `/shipments/${id}/invoice.pdf` : `/statement/${id}/pdf`;
    fetchPdfBlob(endpoint)
      .then((data) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(data);
        setPdfUrl(objectUrl);
      })
      .catch((loadError) => {
        if (active) setError(errMsg(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, kind, isInvoice]);

  return (
    <div className="flex h-[calc(100vh-130px)] min-h-[480px] flex-col overflow-hidden rounded-xl bg-[#e8ebee] shadow-sm md:h-[calc(100vh-150px)]">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 bg-[#172329] px-4 py-2.5 text-white">
        <h1 className="text-sm font-bold">پیش‌نمایش {isInvoice ? 'فاکتور' : 'گزارش حساب'}</h1>
        <div className="flex items-center gap-2">
          <Link to={backTo} className="rounded px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10">← بازگشت</Link>
          <button type="button" disabled={!pdfUrl} onClick={() => frameRef.current?.contentWindow?.print()} className="rounded px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10 disabled:opacity-40">چاپ</button>
          <a href={pdfUrl || undefined} download={fileName} aria-disabled={!pdfUrl} className={`rounded-lg bg-[#f3b33d] px-4 py-1.5 text-xs font-bold text-slate-900 hover:bg-[#e8a92f] ${!pdfUrl ? 'pointer-events-none opacity-50' : ''}`}>↓ دانلود PDF</a>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-5">
        {loading && <div className="flex h-full items-center justify-center text-sm text-slate-500">در حال بارگذاری PDF…</div>}
        {error && <div role="alert" className="mx-auto mt-8 max-w-lg rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">{error}</div>}
        {pdfUrl && !loading && (
          <iframe
            ref={frameRef}
            title={isInvoice ? 'پیش‌نمایش فاکتور' : 'پیش‌نمایش گزارش حساب'}
            src={pdfUrl}
            className="mx-auto block h-full min-h-[420px] w-full max-w-[900px] border-0 bg-white shadow-md"
          />
        )}
      </div>
    </div>
  );
}
