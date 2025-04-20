#!/bin/bash

# Export data from SQLite to CSV
echo "Exporting data from SQLite..."

sqlite3 database.sqlite <<EOF
.headers on
.mode csv
.output products.csv
SELECT * FROM products;
.output sales.csv
SELECT * FROM sales;
.quit
EOF

echo "Export completed. CSV files created: products.csv, sales.csv"

# Import data into PostgreSQL
echo "Importing data into PostgreSQL..."

PG_CONN_STRING=$1

if [ -z "$PG_CONN_STRING" ]; then
  echo "Usage: ./migrate_sqlite_to_postgres.sh <PostgreSQL connection string>"
  exit 1
fi

# Create tables in PostgreSQL (adjust schema as needed)
psql "$PG_CONN_STRING" <<EOF
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
EOF

# Import CSV data
psql "$PG_CONN_STRING" -c "\copy products(name, price, quantity) FROM 'products.csv' DELIMITER ',' CSV HEADER;"
psql "$PG_CONN_STRING" -c "\copy sales(product_id, quantity, total_price, date, time) FROM 'sales.csv' DELIMITER ',' CSV HEADER;"

echo "Data import completed."
