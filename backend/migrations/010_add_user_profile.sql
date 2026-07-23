ALTER TABLE users
  ADD COLUMN gender VARCHAR CHECK (gender IN ('male', 'female', 'other')),
  ADD COLUMN birth_year INTEGER,
  ADD COLUMN is_pregnant_or_lactating BOOLEAN,
  ADD COLUMN height_cm NUMERIC,
  ADD COLUMN weight_kg NUMERIC;
