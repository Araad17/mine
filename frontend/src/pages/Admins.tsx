import { useCallback, useEffect, useState, type FormEvent } from 'react';
import api from '../api';
import { useAuth } from '../auth';
import type { User } from '../types';
import { errMsg } from '../lib';

type AdminForm = { name: string; email: string; password: string; role: 'admin' | 'super_admin' };
const emptyForm: AdminForm = { name: '', email: '', password: '', role: 'admin' };

export default function Admins() {
  const { user: me } = useAuth();
  const [rows, setRows] = useState<User[]>([]);
  const [form, setForm] = useState<AdminForm>(emptyForm);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<User[]>('/users');
      setRows(data);
    } catch (loadError) {
      setError(errMsg(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const add = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/users', form);
      setForm(emptyForm);
      await load();
    } catch (saveError) {
      setError(errMsg(saveError));
    } finally {
      setSaving(false);
    }
  };

  const patch = async (id: number, body: { is_active?: boolean; password?: string }) => {
    setError('');
    setBusyId(id);
    try {
      await api.patch(`/users/${id}`, body);
      await load();
    } catch (updateError) {
      setError(errMsg(updateError));
    } finally {
      setBusyId(null);
    }
  };

  const changePassword = (id: number) => {
    const password = window.prompt('رمز عبور جدید (حداقل ۸ کاراکتر):');
    if (password === null || !password) return;
    if (password.length < 8) {
      setError('رمز عبور باید حداقل ۸ کاراکتر باشد.');
      return;
    }
    void patch(id, { password });
  };

  const toggleActive = (admin: User) => {
    void patch(admin.id, { is_active: !admin.is_active });
  };

  const remove = async (admin: User) => {
    if (!window.confirm(`حساب «${admin.name}» حذف شود؟`)) return;
    setError('');
    setBusyId(admin.id);
    try {
      await api.delete(`/users/${admin.id}`);
      await load();
    } catch (deleteError) {
      setError(errMsg(deleteError));
    } finally {
      setBusyId(null);
    }
  };

  const filteredRows = rows.filter((admin) => (
    `${admin.name} ${admin.email}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  ));

  return (
    <div className="mx-auto max-w-[1250px] space-y-4">
      <div>
        <h1 className="text-2xl font-black text-[#1b2932]">مدیریت ادمین‌ها</h1>
        <p className="mt-1 text-sm text-slate-500">افزودن همکاران و تنظیم دسترسی به سیستم معدن</p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg bg-[#e8f1ec] px-4 py-3 text-xs text-[#315d50]">
        <b>دسترسی سوپر ادمین</b>
        <span>تنها سوپر ادمین می‌تواند حساب ادمین ایجاد یا غیرفعال کند.</span>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_290px]">
        <div className="space-y-4">
          <section className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
              <h2 className="text-sm font-bold text-slate-800">کاربران سیستم</h2>
              <div className="text-[10px] text-slate-400">{filteredRows.length} کاربر / {rows.filter((admin) => admin.is_active).length} حساب فعال</div>
              <input aria-label="جستجوی کاربران" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جستجوی کاربر..." className="max-w-[220px]" />
            </div>
            <div className="overflow-x-auto px-3 pb-3">
              <table className="w-full min-w-[690px] text-right text-xs">
                <thead className="bg-[#f4f6f7] text-slate-500">
                  <tr>
                    {['نام / ایمیل', 'نقش', 'وضعیت', 'عملیات'].map((heading) => <th key={heading} className="whitespace-nowrap px-3 py-3 font-medium">{heading}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((admin) => {
                    const isSelf = admin.id === me?.id;
                    const isBusy = busyId === admin.id;
                    return (
                      <tr key={admin.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="px-3 py-3">
                          <div className="font-bold text-slate-800">{admin.name}{isSelf && <span className="mr-2 text-[10px] font-normal text-slate-400">حساب شما</span>}</div>
                          <div dir="ltr" className="mt-1 text-right text-[10px] text-slate-400">{admin.email}</div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">{admin.role === 'super_admin' ? 'سوپر ادمین' : 'ادمین'}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-md px-2.5 py-1 text-[10px] ${admin.is_active ? 'bg-[#e9f4ee] text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {admin.is_active ? 'فعال' : 'غیرفعال'}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                            <button type="button" disabled={isBusy} onClick={() => changePassword(admin.id)} className="whitespace-nowrap text-emerald-700 hover:underline disabled:opacity-50">تغییر رمز</button>
                            {!isSelf && (
                              <>
                                <button type="button" disabled={isBusy} onClick={() => toggleActive(admin)} className="whitespace-nowrap text-slate-600 hover:underline disabled:opacity-50">
                                  {admin.is_active ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                                </button>
                                <button type="button" disabled={isBusy} onClick={() => void remove(admin)} className="whitespace-nowrap text-red-600 hover:underline disabled:opacity-50">حذف</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && filteredRows.length === 0 && (
                    <tr><td className="px-3 py-8 text-center text-slate-500" colSpan={4}>کاربری با این مشخصات یافت نشد.</td></tr>
                  )}
                  {loading && (
                    <tr><td className="px-3 py-8 text-center text-slate-500" colSpan={4}>در حال دریافت کاربران…</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-800">حدود دسترسی نقش‌ها</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-xs font-bold text-emerald-700">سوپر ادمین</h3>
                <p className="mt-2 text-[11px] leading-6 text-slate-500">ثبت و ویرایش ارسال‌ها، مدیریت حساب‌ها و گزارش‌ها، ایجاد، ویرایش و غیرفعال‌سازی ادمین‌ها و مدیریت کامل کاربران سیستم.</p>
              </div>
              <div className="border-slate-100 sm:border-r sm:pr-4">
                <h3 className="text-xs font-bold text-slate-700">ادمین</h3>
                <p className="mt-2 text-[11px] leading-6 text-slate-500">ثبت ارسال و دریافت فاکتور، ثبت پرداخت و مشاهده حساب گیرنده‌ها، گزارش‌گیری و دسترسی به مدیریت روزانه کارها.</p>
              </div>
            </div>
          </section>
        </div>

        <form onSubmit={add} className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <div>
            <h2 className="text-sm font-bold text-slate-800">افزودن ادمین جدید</h2>
            <p className="mt-1 text-[10px] leading-5 text-slate-400">برای همکار، یک حساب جدید بسازید.</p>
          </div>
          <div>
            <label htmlFor="admin-name">نام کامل *</label>
            <input id="admin-name" required minLength={2} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="نام و نام خانوادگی" />
          </div>
          <div>
            <label htmlFor="admin-email">ایمیل ورود *</label>
            <input id="admin-email" type="email" required dir="ltr" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="admin@example.com" />
          </div>
          <div>
            <label htmlFor="admin-password">رمز عبور موقت *</label>
            <input id="admin-password" type="password" required minLength={8} dir="ltr" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="حداقل ۸ کاراکتر" />
            <p className="mt-1 text-[10px] text-slate-400">حداقل ۸ کاراکتر برای رمز عبور وارد کنید.</p>
          </div>
          <div>
            <label htmlFor="admin-role">نقش کاربر</label>
            <select id="admin-role" value={form.role} onChange={(event) => {
              const role = event.target.value;
              if (role === 'admin' || role === 'super_admin') setForm({ ...form, role });
            }}>
              <option value="admin">ادمین</option>
              <option value="super_admin">سوپر ادمین</option>
            </select>
          </div>
          <button disabled={saving} className="mt-1 w-full rounded-lg bg-[#f3b33d] px-4 py-2.5 text-xs font-bold text-slate-900 hover:bg-[#e8a92f] disabled:opacity-50">
            {saving ? 'در حال ایجاد…' : 'ایجاد حساب ادمین'}
          </button>
          <p className="text-[10px] leading-5 text-slate-400">اطلاعات ورود را از راه امن با همکار به اشتراک بگذارید.</p>
        </form>
      </div>
    </div>
  );
}
