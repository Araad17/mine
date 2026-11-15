import { pool } from '../db.js';

export interface Filters { from?: string; to?: string; receiver_id?: number }

export async function listShipments(f: Filters = {}) {
  const where: string[] = [];
  const vals: unknown[] = [];
  if (f.from) { vals.push(f.from); where.push(`s.ship_date >= $${vals.length}`); }
  if (f.to) { vals.push(f.to); where.push(`s.ship_date <= $${vals.length}`); }
  if (f.receiver_id) { vals.push(f.receiver_id); where.push(`s.receiver_id = $${vals.length}`); }
  const { rows } = await pool.query(
    `SELECT s.*, m.name AS material, r.name AS receiver_name,
            (SELECT count(*) FROM trucks t WHERE t.shipment_id = s.id)::int AS truck_count,
            COALESCE((SELECT sum(p.amount) FROM payments p WHERE p.shipment_id = s.id), 0) AS paid
     FROM shipments s
     JOIN receivers r ON r.id = s.receiver_id
     LEFT JOIN materials m ON m.id = s.material_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY s.ship_date DESC, s.id DESC`, vals);
  return rows.map((r) => ({ ...r, remaining: +(r.total_amount - r.paid).toFixed(2) }));
}

export async function getShipment(id: number) {
  const base = (await pool.query(
    `SELECT s.*, m.name AS material, r.name AS receiver_name, r.phone AS receiver_phone, r.address AS receiver_address,
            (SELECT count(*) FROM trucks t WHERE t.shipment_id = s.id)::int AS truck_count,
            COALESCE((SELECT sum(p.amount) FROM payments p WHERE p.shipment_id = s.id), 0) AS paid
     FROM shipments s JOIN receivers r ON r.id = s.receiver_id LEFT JOIN materials m ON m.id = s.material_id
     WHERE s.id = $1`, [id])).rows[0];
  if (!base) return null;
  const trucks = (await pool.query('SELECT driver_name, plate_number, load_amount FROM trucks WHERE shipment_id=$1 ORDER BY id', [id])).rows;
  const payments = (await pool.query('SELECT id, amount, paid_at, note FROM payments WHERE shipment_id=$1 ORDER BY paid_at, id', [id])).rows;
  return { ...base, remaining: +(base.total_amount - base.paid).toFixed(2), trucks, payments };
}

export async function getStatement(receiverId: number, from?: string, to?: string) {
  const receiver = (await pool.query('SELECT * FROM receivers WHERE id=$1', [receiverId])).rows[0];
  if (!receiver) return null;
  const shipments = await listShipments({ receiver_id: receiverId, from, to });
  const payments = shipments.length
    ? (await pool.query(
      'SELECT p.id, p.shipment_id, p.amount, p.paid_at, p.note FROM payments p WHERE p.shipment_id = ANY($1::int[]) ORDER BY p.paid_at, p.id',
      [shipments.map((shipment) => shipment.id)],
    )).rows
    : [];
  const ledger = [
    ...shipments.map((shipment) => ({
      id: `shipment-${shipment.id}`,
      shipment_id: shipment.id,
      date: shipment.ship_date,
      type: 'shipment' as const,
      amount: Number(shipment.total_amount),
      note: shipment.material,
    })),
    ...payments.map((payment) => ({
      id: `payment-${payment.id}`,
      shipment_id: payment.shipment_id,
      date: payment.paid_at,
      type: 'payment' as const,
      amount: Number(payment.amount),
      note: payment.note,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date)
    || (a.type === b.type ? a.id.localeCompare(b.id) : a.type === 'shipment' ? -1 : 1));
  let balance = 0;
  for (const entry of ledger) {
    balance += entry.type === 'shipment' ? entry.amount : -entry.amount;
    Object.assign(entry, { balance: +balance.toFixed(2) });
  }
  ledger.reverse();
  const sum = (fn: (s: any) => number) => +shipments.reduce((a, s) => a + fn(s), 0).toFixed(3);
  const tons = sum((s) => (s.unit === 'ton' ? s.total_quantity : 0));
  const kg = sum((s) => (s.unit === 'kg' ? s.total_quantity : 0));
  const total_amount = sum((s) => s.total_amount);
  const paid = sum((s) => s.paid);
  return {
    receiver, from: from ?? null, to: to ?? null, shipments, ledger,
    totals: {
      shipments: shipments.length,
      trucks: sum((s) => s.truck_count),
      tons, kg, total_in_tons: +(tons + kg / 1000).toFixed(3),
      total_amount, paid, remaining: +(total_amount - paid).toFixed(2),
    },
  };
}
