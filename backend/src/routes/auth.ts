import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../db.js';
import { JWT_SECRET, requireAuth } from '../auth.js';

const r = Router();

r.post('/login', async (req, res) => {
  const { email, password } = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
  const u = (await pool.query('SELECT * FROM users WHERE lower(email)=lower($1)', [email])).rows[0];
  if (!u || !u.is_active || !(await bcrypt.compare(password, u.password_hash)))
    return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است' });
  const token = jwt.sign({ id: u.id }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, user: { id: u.id, name: u.name, email: u.email, role: u.role } });
});

r.get('/me', requireAuth, (req, res) => res.json(req.user));

export default r;
