const express = require('express');
const { query, pool } = require('./postgres-setup');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;  // Alterado para 10000 para coincidir com o ambiente Render

// Allow CORS from localhost for development and from production domain
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = ['https://site002.onrender.com', 'http://127.0.0.1:5500', 'http://localhost:5500', 'https://joaozinho-celular.onrender.com'];
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
    // Convert price to number before sending response
    const products = result.rows.map(product => ({
      ...product,
      price: parseFloat(product.price)
    }));
    res.json(products);
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
    // Check if product is referenced in sales
    const salesCheck = await query('SELECT COUNT(*) FROM sales WHERE product_id = $1', [id]);
    if (parseInt(salesCheck.rows[0].count) > 0) {
      res.status(400).json({ error: 'Não é possível excluir produto que possui vendas registradas.' });
      return;
    }
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
    // Accept date in yyyy-mm-dd format directly
    const insertResult = await query(insertSql, [product_id, quantity, total_price, date, time]);
    res.json(insertResult.rows[0]);
  } catch (err) {
    console.error('Erro ao registrar venda:', err);
    res.status(500).json({ error: err.message });
  }
});

const fs = require('fs');
const path = require('path');

app.listen(PORT, async () => {
  console.log(`Servidor rodando na porta ${PORT}`);

  // Executa o script SQL para criar as tabelas se não existirem
  const sqlPath = path.join(__dirname, 'check_and_create_tables.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  try {
    await query(sql);
    console.log('Tabelas verificadas/criadas com sucesso.');
  } catch (err) {
    console.error('Erro ao criar/verificar tabelas:', err);
  }
});