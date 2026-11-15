# سیستم مدیریت معدن ذغال سنگ

React + TypeScript + Tailwind (frontend) · Node.js + Express + PostgreSQL (backend)

## راه‌اندازی
1. یک دیتابیس بسازید:  `createdb coalmine`
2. بک‌اند:
   ```
   cd backend
   cp .env.example .env      # DATABASE_URL, JWT_SECRET و اطلاعات سوپر ادمین را ویرایش کنید
   npm install
   npm run db:init           # ساخت جدول‌ها
   npm run seed              # ساخت اولین سوپر ادمین
   npm run dev               # http://localhost:4000
   ```
3. فرانت‌اند:
   ```
   cd frontend
   npm install
   npm run dev               # http://localhost:5173
   ```
4. با ایمیل/رمز سوپر ادمین وارد شوید؛ از بخش «ادمین‌ها» ادمین‌های دیگر را اضافه کنید.

## نکته‌ها
- PDF با Puppeteer (Chromium) ساخته می‌شود تا فارسی و راست‌به‌چپ درست نمایش داده شود.
  برای ظاهر بهتر، فونت Vazirmatn را روی سرور نصب کنید.
- ارز در `backend/.env` (CURRENCY) و `frontend/src/lib.ts` تنظیم می‌شود.
- در محیط واقعی: HTTPS، JWT_SECRET قوی، و محدودسازی تعداد تلاش ورود (express-rate-limit) را فعال کنید.
