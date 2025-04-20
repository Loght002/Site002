-- Script para verificar e criar as tabelas products e sales no PostgreSQL

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  quantity INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL
);
