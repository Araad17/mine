import { Router } from 'express';
import { z } from 'zod';
import { getStatement } from '../services/data.js';
import { htmlToPdf, statementHtml } from '../services/pdf.js';

const r = Router();
const q = z.object({ from: z.string().optional(), to: z.string().optional() });

r.get('/:receiverId', async (req, res) => {
  const { from, to } = q.parse(req.query);
  const st = await getStatement(Number(req.params.receiverId), from || undefined, to || undefined);
  st ? res.json(st) : res.status(404).json({ error: 'گیرنده یافت نشد' });
});

r.get('/:receiverId/pdf', async (req, res) => {
  const { from, to } = q.parse(req.query);
  const st = await getStatement(Number(req.params.receiverId), from || undefined, to || undefined);
  if (!st) return res.status(404).json({ error: 'گیرنده یافت نشد' });
  const pdf = await htmlToPdf(statementHtml(st));
  res.type('application/pdf').set('Content-Disposition', `attachment; filename="statement-${st.receiver.id}.pdf"`).send(pdf);
});

export default r;
