import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';

const r = Router();

// نوعیت جنس (منوی کشویی)
r.get('/materials', async (_q, res) => res.json((await pool.query('SELECT * FROM materials ORDER BY name')).rows));
r.post('/materials', async (req, res) => {
  const { name } = z.object({ name: z.string().min(1) }).parse(req.body);
  const { rows } = await pool.query('INSERT INTO materials (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING *', [name.trim()]);
  res.status(201).json(rows[0]);
});

// گیرنده‌ها (طرف حساب)
const receiverSchema = z.object({ name: z.string().min(1), phone: z.string().optional().nullable(), address: z.string().optional().nullable() });
r.get('/receivers', async (_q, res) => res.json((await pool.query('SELECT * FROM receivers ORDER BY name')).rows));
r.post('/receivers', async (req, res) => {
  const b = receiverSchema.parse(req.body);
  const { rows } = await pool.query('INSERT INTO receivers (name,phone,address) VALUES ($1,$2,$3) RETURNING *', [b.name.trim(), b.phone ?? null, b.address ?? null]);
  res.status(201).json(rows[0]);
});
r.put('/receivers/:id', async (req, res) => {
  const b = receiverSchema.parse(req.body);
  const { rows } = await pool.query('UPDATE receivers SET name=$2,phone=$3,address=$4 WHERE id=$1 RETURNING *', [Number(req.params.id), b.name.trim(), b.phone ?? null, b.address ?? null]);
  if (!rows[0]) return res.status(404).json({ error: 'یافت نشد' });
  res.json(rows[0]);
});

export default r;
