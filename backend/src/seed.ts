import bcrypt from 'bcryptjs';
import { pool } from './db.js';

const { SUPER_ADMIN_NAME = 'Super Admin', SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD } = process.env;
if (!SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD) throw new Error('SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD missing in .env');

const hash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);
await pool.query(
  `INSERT INTO users (name,email,password_hash,role) VALUES ($1,lower($2),$3,'super_admin')
   ON CONFLICT (lower(email)) DO NOTHING`,
  [SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, hash]
);
console.log('Super admin ready:', SUPER_ADMIN_EMAIL);
await pool.end();
