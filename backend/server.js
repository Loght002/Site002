const express = require('express');
const { query, pool } = require('./postgres-setup');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

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
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new product
app.post('/products', async (req, res) => {
  const { name, retail_price, wholesale_price, quantity } = req.body;
  try {
    const result = await query(
      'INSERT INTO products (name, retail_price, wholesale_price, quantity) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, retail_price, wholesale_price, quantity]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update product
app.put('/products/:id', async (req, res) => {
  const { name, retail_price, wholesale_price, quantity } = req.body;
  const { id } = req.params;
  try {
    const result = await query(
      'UPDATE products SET name = $1, retail_price = $2, wholesale_price = $3, quantity = $4 WHERE id = $5 RETURNING *',
      [name, retail_price, wholesale_price, quantity, id]
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
      SELECT sales.id, products.name as product, sales.quantity, sales.total_price, sales.date, sales.time, sales.price_type
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
  const { product_id, quantity, price_type, date, time } = req.body;
  try {
    const stockResult = await query('SELECT quantity, retail_price, wholesale_price FROM products WHERE id = $1', [product_id]);
    if (stockResult.rowCount === 0) {
      res.status(404).json({ error: 'Produto não encontrado' });
      return;
    }
    const product = stockResult.rows[0];
    if (product.quantity < quantity) {
      res.status(400).json({ error: 'Quantidade insuficiente em estoque' });
      return;
    }

    let unitPrice;
    if (price_type === 'retail') {
      unitPrice = parseFloat(product.retail_price);
    } else if (price_type === 'wholesale') {
      unitPrice = parseFloat(product.wholesale_price);
    } else {
      res.status(400).json({ error: 'Tipo de preço inválido' });
      return;
    }

    const total_price = unitPrice * quantity;
    const newQuantity = product.quantity - quantity;

    await query('UPDATE products SET quantity = $1 WHERE id = $2', [newQuantity, product_id]);

    const insertSql = 'INSERT INTO sales (product_id, quantity, total_price, date, time, price_type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
    const insertResult = await query(insertSql, [product_id, quantity, total_price, date, time, price_type]);
    res.json(insertResult.rows[0]);
  } catch (err) {
    console.error('Erro ao registrar venda:', err);
    res.status(500).json({ error: err.message });
  }
});

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
