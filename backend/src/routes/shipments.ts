import { Router } from 'express';
import { z } from 'zod';
import type { PoolClient } from 'pg';
import { pool } from '../db.js';
import { getShipment, listShipments } from '../services/data.js';
import { htmlToPdf, invoiceHtml } from '../services/pdf.js';

const r = Router();

const shipmentSchema = z.object({
  ship_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  receiver_id: z.number().int(),
  material_id: z.number().int(),
  unit: z.enum(['ton', 'kg']),
  unit_price: z.number().nonnegative(),
  notes: z.string().optional().nullable(),
  trucks: z.array(z.object({
    driver_name: z.string().min(1), plate_number: z.string().min(1), load_amount: z.number().positive(),
  })).min(1, 'حداقل یک موتر لازم است'),
  initial_payment: z.number().nonnegative().optional(),
});

async function saveTrucks(c: PoolClient, id: number, trucks: z.infer<typeof shipmentSchema>['trucks']) {
  await c.query('DELETE FROM trucks WHERE shipment_id=$1', [id]);
  for (const t of trucks)
    await c.query('INSERT INTO trucks (shipment_id,driver_name,plate_number,load_amount) VALUES ($1,$2,$3,$4)', [id, t.driver_name.trim(), t.plate_number.trim(), t.load_amount]);
}
const totals = (b: z.infer<typeof shipmentSchema>) => {
  const qty = +b.trucks.reduce((a, t) => a + t.load_amount, 0).toFixed(3);
  return { qty, amount: +(qty * b.unit_price).toFixed(2) };
};

r.get('/', async (req, res) => {
  const q = z.object({ from: z.string().optional(), to: z.string().optional(), receiver_id: z.coerce.number().optional() }).parse(req.query);
  res.json(await listShipments(q));
});

r.get('/:id', async (req, res) => {
  const s = await getShipment(Number(req.params.id));
  s ? res.json(s) : res.status(404).json({ error: 'یافت نشد' });
});

r.post('/', async (req, res) => {
  const b = shipmentSchema.parse(req.body);
  const { qty, amount } = totals(b);
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const id = (await c.query(
      `INSERT INTO shipments (ship_date,material_id,receiver_id,unit,unit_price,total_quantity,total_amount,notes,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [b.ship_date, b.material_id, b.receiver_id, b.unit, b.unit_price, qty, amount, b.notes ?? null, req.user!.id])).rows[0].id;
    await saveTrucks(c, id, b.trucks);
    if (b.initial_payment && b.initial_payment > 0)
      await c.query('INSERT INTO payments (shipment_id,amount,paid_at,created_by,note) VALUES ($1,$2,$3,$4,$5)', [id, b.initial_payment, b.ship_date, req.user!.id, 'پرداخت اولیه']);
    await c.query('COMMIT');
    res.status(201).json(await getShipment(id));
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
});

r.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const b = shipmentSchema.parse(req.body);
  const { qty, amount } = totals(b);
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const u = await c.query(
      `UPDATE shipments SET ship_date=$2,material_id=$3,receiver_id=$4,unit=$5,unit_price=$6,total_quantity=$7,total_amount=$8,notes=$9 WHERE id=$1`,
      [id, b.ship_date, b.material_id, b.receiver_id, b.unit, b.unit_price, qty, amount, b.notes ?? null]);
    if (!u.rowCount) { await c.query('ROLLBACK'); return res.status(404).json({ error: 'یافت نشد' }); }
    await saveTrucks(c, id, b.trucks);
    await c.query('COMMIT');
    res.json(await getShipment(id));
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
});

r.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM shipments WHERE id=$1', [Number(req.params.id)]);
  res.status(204).end();
});

// پرداخت‌ها
r.post('/:id/payments', async (req, res) => {
  const b = z.object({ amount: z.number().positive(), paid_at: z.string().optional(), note: z.string().optional().nullable() }).parse(req.body);
  const id = Number(req.params.id);
  const s = await getShipment(id);
  if (!s) return res.status(404).json({ error: 'یافت نشد' });
  if (b.amount > s.remaining + 0.001) return res.status(400).json({ error: `مبلغ از باقی‌مانده (${s.remaining}) بیشتر است` });
  await pool.query('INSERT INTO payments (shipment_id,amount,paid_at,note,created_by) VALUES ($1,$2,COALESCE($3::date,CURRENT_DATE),$4,$5)',
    [id, b.amount, b.paid_at || null, b.note ?? null, req.user!.id]);
  res.status(201).json(await getShipment(id));
});
r.delete('/:id/payments/:pid', async (req, res) => {
  await pool.query('DELETE FROM payments WHERE id=$1 AND shipment_id=$2', [Number(req.params.pid), Number(req.params.id)]);
  res.json(await getShipment(Number(req.params.id)));
});

// فاکتور PDF
r.get('/:id/invoice.pdf', async (req, res) => {
  const s = await getShipment(Number(req.params.id));
  if (!s) return res.status(404).json({ error: 'یافت نشد' });
  const pdf = await htmlToPdf(invoiceHtml(s), { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' });
  res.type('application/pdf').set('Content-Disposition', `attachment; filename="invoice-${s.id}.pdf"`).send(pdf);
});

export default r;
