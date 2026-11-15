import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db.js';

const r = Router(); // فقط سوپر ادمین (در index.ts محافظت می‌شود)
const COLS = 'id,name,email,role,is_active,created_at';

r.get('/', async (_req, res) => {
  res.json((await pool.query(`SELECT ${COLS} FROM users ORDER BY id`)).rows);
});

r.post('/', async (req, res) => {
  const b = z.object({
    name: z.string().min(2), email: z.string().email(), password: z.string().min(8, 'رمز عبور حداقل ۸ کاراکتر'),
    role: z.enum(['admin', 'super_admin']).default('admin'),
  }).parse(req.body);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (name,email,password_hash,role) VALUES ($1,lower($2),$3,$4) RETURNING ${COLS}`,
      [b.name, b.email, await bcrypt.hash(b.password, 12), b.role]);
    res.status(201).json(rows[0]);
  } catch (e: any) {
    if (e.code === '23505') return res.status(409).json({ error: 'این ایمیل قبلاً ثبت شده است' });
    throw e;
  }
});

r.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const b = z.object({
    name: z.string().min(2).optional(), is_active: z.boolean().optional(), password: z.string().min(8).optional(),
  }).parse(req.body);
  if (id === req.user!.id && b.is_active === false) return res.status(400).json({ error: 'نمی‌توانید حساب خود را غیرفعال کنید' });
  const hash = b.password ? await bcrypt.hash(b.password, 12) : null;
  const { rows } = await pool.query(
    `UPDATE users SET name=COALESCE($2,name), is_active=COALESCE($3,is_active), password_hash=COALESCE($4,password_hash)
     WHERE id=$1 RETURNING ${COLS}`, [id, b.name ?? null, b.is_active ?? null, hash]);
  if (!rows[0]) return res.status(404).json({ error: 'یافت نشد' });
  res.json(rows[0]);
});

r.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user!.id) return res.status(400).json({ error: 'نمی‌توانید حساب خود را حذف کنید' });
  try {
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
    res.status(204).end();
  } catch (e: any) {
    if (e.code === '23503') return res.status(409).json({ error: 'این کاربر سابقه ثبت دارد؛ به جای حذف، غیرفعال کنید' });
    throw e;
  }
});

export default r;
