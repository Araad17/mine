import api from './api';
import type { Unit } from './types';

export const CURRENCY = 'افغانی';
export const fmt = (n: number, d = 2) => Number(n).toLocaleString('en-US', { maximumFractionDigits: d });
export const unitFa = (u: Unit) => (u === 'ton' ? 'تن' : 'کیلو');
export const today = () => new Date().toISOString().slice(0, 10);
export const errMsg = (e: any) => e?.response?.data?.error ?? 'خطا در ارتباط با سرور';

export function statusOf(total: number, paid: number) {
  if (paid >= total) return { label: 'تصفیه شده', cls: 'bg-green-100 text-green-800' };
  if (paid > 0) return { label: 'تصفیه جزئی', cls: 'bg-amber-100 text-amber-800' };
  return { label: 'تصفیه نشده', cls: 'bg-red-100 text-red-800' };
}

export async function downloadPdf(url: string, filename: string) {
  const blob = await fetchPdfBlob(url);
  const a = document.createElement('a');
  const objectUrl = URL.createObjectURL(blob);
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
}

export async function fetchPdfBlob(url: string): Promise<Blob> {
  const { data } = await api.get<Blob>(url, { responseType: 'blob' });
  if (!data.size) throw new Error('فایل PDF دریافتی خالی است.');

  const signature = await data.slice(0, 5).text();
  if (signature !== '%PDF-') {
    const body = await data.text();
    let message = body;
    try {
      const parsed = JSON.parse(body);
      if (typeof parsed.error === 'string') message = parsed.error;
    } catch {
      // The response may be plain text rather than a JSON error.
    }
    throw new Error(message || 'پاسخ سرور یک فایل PDF معتبر نیست.');
  }
  return data;
}
