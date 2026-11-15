import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export interface AuthUser { id: number; email: string; name: string; role: 'super_admin' | 'admin'; is_active: boolean }
declare module 'express-serve-static-core' { interface Request { user?: AuthUser } }

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'نیاز به ورود به سیستم' });
  try {
    const payload = jwt.verify(h.slice(7), JWT_SECRET) as { id: number };
    const { rows } = await pool.query('SELECT id,email,name,role,is_active FROM users WHERE id=$1', [payload.id]);
    const u = rows[0];
    if (!u || !u.is_active) return res.status(401).json({ error: 'حساب غیرفعال است' });
    req.user = u;
    next();
  } catch {
    res.status(401).json({ error: 'نشست منقضی شده است' });
  }
}

export function requireSuper(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'super_admin') return res.status(403).json({ error: 'فقط سوپر ادمین اجازه دارد' });
  next();
}
