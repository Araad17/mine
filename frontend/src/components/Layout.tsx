import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';

export default function Layout() {
  const { user, logout } = useAuth();
  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${isActive ? 'bg-[#30413b] font-bold text-[#f4b73f]' : 'text-slate-300 hover:bg-[#26353a] hover:text-white'}`;
  const links = [
    { to: '/', label: 'داشبورد', icon: '▦', end: true },
    { to: '/shipments', label: 'ارسال‌ها', icon: '▰' },
    { to: '/shipments/new', label: 'ارسال جدید', icon: '＋' },
    { to: '/receivers', label: 'حساب گیرنده‌ها', icon: '♧' },
    { to: '/statement', label: 'گزارش‌ها', icon: '▥' },
    ...(user?.role === 'super_admin' ? [{ to: '/admins', label: 'مدیریت ادمین‌ها', icon: '⬡' }] : []),
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f3f4f6]" dir="rtl">
      <header className="flex h-[54px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
        <div className="flex items-center gap-2 text-[#27343b]">
          <span className="text-xl" aria-hidden="true">♧</span>
          <b className="text-sm">معدن ذغال سنگ</b>
        </div>
        <span className="hidden text-[11px] text-slate-400 sm:block">سیستم مدیریت ارسال و حسابات</span>
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span>{user?.name} <span className="text-slate-400">/ {user?.role === 'super_admin' ? 'سوپر ادمین' : 'ادمین'}</span></span>
          <span className="hidden text-base text-slate-700 sm:inline" aria-label="اعلان‌ها">♧</span>
          <button onClick={logout} className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100 md:hidden">خروج</button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <aside className="flex w-full shrink-0 flex-col bg-[#172329] px-4 py-4 text-white md:w-[180px] md:px-4 md:py-5 xl:w-[210px]">
          <p className="mb-4 hidden px-2 text-[10px] text-slate-400 md:block">فضای کاری معدن</p>
          <nav className="flex gap-1 overflow-x-auto md:flex-col md:gap-1.5">
            {links.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={link}>
                <span className="w-5 text-center text-base" aria-hidden="true">{item.icon}</span>
                <span className="whitespace-nowrap">{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto hidden border-t border-slate-700 px-2 pt-4 text-xs text-slate-400 md:block">
            <p className="mb-3 text-slate-200">دسترسی {user?.role === 'super_admin' ? 'سوپر ادمین' : 'ادمین'}</p>
            <p className="mb-4">تمام تغییرات ثبت می‌شوند</p>
            <button onClick={logout} className="flex w-full items-center justify-between rounded px-2 py-2 text-right hover:bg-[#26353a] hover:text-white">
              <span>خروج از حساب</span><span aria-hidden="true">⇥</span>
            </button>
          </div>
        </aside>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 md:p-6 xl:p-7"><Outlet /></main>
      </div>
    </div>
  );
}
