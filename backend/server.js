const express = require('express');
const { query, pool } = require('./postgres-setup');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;  // Alterado para 10000 para coincidir com o ambiente Render

// Allow CORS from localhost for development and from production domain
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = ['https://site002.onrender.com', 'http://127.0.0.1:5500', 'http://localhost:5500'];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(bodyParser.json());

// Products endpoints

// Get all products
app.get('/products', async (req, res) => {
  try {
    const result = await query('SELECT * FROM products');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new product
app.post('/products', async (req, res) => {
  const { name, price, quantity } = req.body;
  try {
    const result = await query(
      'INSERT INTO products (name, price, quantity) VALUES ($1, $2, $3) RETURNING *',
      [name, price, quantity]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update product
app.put('/products/:id', async (req, res) => {
  const { name, price, quantity } = req.body;
  const { id } = req.params;
  try {
    const result = await query(
      'UPDATE products SET name = $1, price = $2, quantity = $3 WHERE id = $4 RETURNING *',
      [name, price, quantity, id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Produto não encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete product
app.delete('/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('DELETE FROM products WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Produto não encontrado' });
      return;
    }
    res.json({ message: 'Produto excluído com sucesso' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Sales endpoints

// Get all sales
app.get('/sales', async (req, res) => {
  try {
    const sql = `
      SELECT sales.id, products.name as product, sales.quantity, sales.total_price, sales.date, sales.time
      FROM sales
      JOIN products ON sales.product_id = products.id
      ORDER BY sales.date DESC, sales.time DESC
    `;
    const result = await query(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new sale
app.post('/sales', async (req, res) => {
  const { product_id, quantity, total_price, date, time } = req.body;
  try {
    // Check stock
    const stockResult = await query('SELECT quantity FROM products WHERE id = $1', [product_id]);
    if (stockResult.rowCount === 0) {
      res.status(404).json({ error: 'Produto não encontrado' });
      return;
    }
    const stockQuantity = stockResult.rows[0].quantity;
    if (stockQuantity < quantity) {
      res.status(400).json({ error: 'Quantidade insuficiente em estoque' });
      return;
    }

    // Update stock
    const newQuantity = stockQuantity - quantity;
    await query('UPDATE products SET quantity = $1 WHERE id = $2', [newQuantity, product_id]);

    // Insert sale
    const insertSql = 'INSERT INTO sales (product_id, quantity, total_price, date, time) VALUES ($1, $2, $3, $4, $5) RETURNING *';
    const insertResult = await query(insertSql, [product_id, quantity, total_price, date, time]);
    res.json(insertResult.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
