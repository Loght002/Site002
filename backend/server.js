const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

// Initialize SQLite database
const db = new sqlite3.Database(path.resolve(__dirname, 'joaozinho_celular.db'), (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
  }
});

// Create tables if not exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    price REAL,
    quantity INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    quantity INTEGER,
    total_price REAL,
    date TEXT,
    time TEXT,
    FOREIGN KEY(product_id) REFERENCES products(id)
  )`);
});

// Products endpoints

// Get all products
app.get('/products', (req, res) => {
  db.all('SELECT * FROM products', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Add new product
app.post('/products', (req, res) => {
  const { name, price, quantity } = req.body;
  const sql = 'INSERT INTO products (name, price, quantity) VALUES (?, ?, ?)';
  db.run(sql, [name, price, quantity], function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, name, price, quantity });
  });
});

// Update product
app.put('/products/:id', (req, res) => {
  const { name, price, quantity } = req.body;
  const { id } = req.params;
  const sql = 'UPDATE products SET name = ?, price = ?, quantity = ? WHERE id = ?';
  db.run(sql, [name, price, quantity, id], function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Produto não encontrado' });
      return;
    }
    res.json({ id, name, price, quantity });
  });
});

// Delete product
app.delete('/products/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM products WHERE id = ?';
  db.run(sql, [id], function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Produto não encontrado' });
      return;
    }
    res.json({ message: 'Produto excluído com sucesso' });
  });
});

// Sales endpoints

// Get all sales
app.get('/sales', (req, res) => {
  const sql = `SELECT sales.id, products.name as product, sales.quantity, sales.total_price, sales.date, sales.time
               FROM sales
               JOIN products ON sales.product_id = products.id
               ORDER BY sales.date DESC, sales.time DESC`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Add new sale
app.post('/sales', (req, res) => {
  const { product_id, quantity, total_price, date, time } = req.body;

  // Check stock first
  db.get('SELECT quantity FROM products WHERE id = ?', [product_id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Produto não encontrado' });
      return;
    }
    if (row.quantity < quantity) {
      res.status(400).json({ error: 'Quantidade insuficiente em estoque' });
      return;
    }

    // Update stock
    const newQuantity = row.quantity - quantity;
    db.run('UPDATE products SET quantity = ? WHERE id = ?', [newQuantity, product_id], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      // Insert sale
      const sql = 'INSERT INTO sales (product_id, quantity, total_price, date, time) VALUES (?, ?, ?, ?, ?)';
      db.run(sql, [product_id, quantity, total_price, date, time], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ id: this.lastID, product_id, quantity, total_price, date, time });
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
