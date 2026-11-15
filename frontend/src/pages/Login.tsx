import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { errMsg } from '../lib';

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await login(email, password); nav('/'); } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-[#efefef] px-4 py-8 text-right sm:px-6 lg:px-8" dir="rtl">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1100px] items-center justify-center">
        <div className="w-full rounded-[32px] bg-[#f7f7f7] px-6 py-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 md:px-8 lg:px-10">
          <div className="mx-auto max-w-[620px]">
            <div className="mb-8 flex items-center justify-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0d1f2b] text-3xl font-black text-[#7bd3ff] shadow-[0_10px_25px_rgba(0,0,0,0.15)]">
                م
              </div>
              <div className="text-center">
                <div className="text-[2.1rem] font-black leading-none text-[#1c2a36]">معن دلال سنگ</div>
                <div className="mt-1 text-sm text-[#64748b]">سامانه مدیریت سفارش‌ها</div>
              </div>
            </div>

            <h1 className="text-center text-[3.5rem] font-black leading-[1.35] tracking-[-0.05em] text-[#101828] md:text-[4rem]">
              خوش آمدید
            </h1>
            <p className="mt-4 text-center text-base leading-8 text-[#58636d] md:text-[1.1rem]">
              برای ورود به سیستم، ایمیل و رمز عبور خود را وارد کنید.
            </p>

            <form onSubmit={submit} className="mx-auto mt-10 max-w-[520px] space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#2d3748]">ایمیل</label>
                <input
                  type="email"
                  dir="ltr"
                  required
                  autoComplete="username"
                  value={email}
                  placeholder="name@example.com"
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 rounded-xl border border-[#d7dde3] bg-white px-4 text-base text-[#111827] placeholder:text-[#8a9299] transition focus:border-[#1d90d8] focus:bg-white focus:ring-2 focus:ring-[#9ed5ff]/80"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#2d3748]">رمز عبور</label>
                <input
                  type="password"
                  dir="ltr"
                  required
                  autoComplete="current-password"
                  value={password}
                  placeholder="رمز عبور"
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 rounded-xl border border-[#d7dde3] bg-white px-4 text-base text-[#111827] placeholder:text-[#8a9299] transition focus:border-[#1d90d8] focus:bg-white focus:ring-2 focus:ring-[#9ed5ff]/80"
                />
              </div>

              {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

              <button
                type="submit"
                className="mt-2 h-14 w-full rounded-xl bg-[#f4b229] text-[1.05rem] font-black text-[#1a2025] shadow-[0_12px_30px_rgba(244,178,41,0.25)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#e7a823] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={busy}
              >
                {busy ? 'در حال ورود…' : 'ورود به حساب'}
              </button>
            </form>

            <div className="mt-8 text-center text-xs text-[#7b848b]">
              ورود شما به معنای پذیرفتن قوانین و شرایط سیستم است.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
