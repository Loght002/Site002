-- Script para verificar e criar as tabelas products e sales no PostgreSQL

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  retail_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  wholesale_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  price_type VARCHAR(10) NOT NULL CHECK (price_type IN ('retail', 'wholesale'))
);
