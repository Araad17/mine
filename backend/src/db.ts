import 'dotenv/config';
import pg from 'pg';

pg.types.setTypeParser(1700, (v) => parseFloat(v)); // NUMERIC -> number
pg.types.setTypeParser(1082, (v) => v);             // DATE -> 'YYYY-MM-DD'

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
