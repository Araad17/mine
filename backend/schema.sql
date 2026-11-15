CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin','admin')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_uq ON users (lower(email));

CREATE TABLE IF NOT EXISTS materials (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS receivers (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT,
  address    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shipments (
  id             SERIAL PRIMARY KEY,           -- شماره فاکتور
  ship_date      DATE NOT NULL,
  material_id    INT REFERENCES materials(id),
  receiver_id    INT NOT NULL REFERENCES receivers(id),
  unit           TEXT NOT NULL CHECK (unit IN ('ton','kg')),
  unit_price     NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),  -- قیمت فی به ازای همان واحد
  total_quantity NUMERIC(14,3) NOT NULL,
  total_amount   NUMERIC(16,2) NOT NULL,
  notes          TEXT,
  created_by     INT REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shipments_date_idx ON shipments (ship_date);
CREATE INDEX IF NOT EXISTS shipments_receiver_idx ON shipments (receiver_id);

CREATE TABLE IF NOT EXISTS trucks (
  id          SERIAL PRIMARY KEY,
  shipment_id INT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  driver_name TEXT NOT NULL,
  plate_number TEXT NOT NULL,
  load_amount NUMERIC(14,3) NOT NULL CHECK (load_amount > 0)  -- به واحد shipment.unit
);

CREATE TABLE IF NOT EXISTS payments (
  id          SERIAL PRIMARY KEY,
  shipment_id INT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  amount      NUMERIC(16,2) NOT NULL CHECK (amount > 0),
  paid_at     DATE NOT NULL DEFAULT CURRENT_DATE,
  note        TEXT,
  created_by  INT REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO materials (name) VALUES
  ('ذغال سنگ درشت'), ('ذغال سنگ ریزه'), ('ذغال سنگ شسته'), ('پودر ذغال')
ON CONFLICT DO NOTHING;
