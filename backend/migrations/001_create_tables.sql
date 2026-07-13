CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR NOT NULL UNIQUE,
  password VARCHAR NOT NULL,
  name VARCHAR,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE symptoms (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL
);

CREATE TABLE ingredients (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  category VARCHAR,
  upper_limit_mg NUMERIC,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  company_name VARCHAR,
  price INTEGER,
  image_url VARCHAR,
  haccp_certified BOOLEAN NOT NULL DEFAULT FALSE,
  test_report_url VARCHAR,
  smartstore_url VARCHAR,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE diagnoses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  life_pattern VARCHAR,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE diagnosis_symptoms (
  id SERIAL PRIMARY KEY,
  diagnosis_id INTEGER NOT NULL REFERENCES diagnoses(id),
  symptom_id INTEGER NOT NULL REFERENCES symptoms(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE diagnosis_ingredients (
  id SERIAL PRIMARY KEY,
  diagnosis_id INTEGER NOT NULL REFERENCES diagnoses(id),
  ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE product_ingredients (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
  amount_mg NUMERIC,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE user_supplements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
  amount_mg NUMERIC,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
