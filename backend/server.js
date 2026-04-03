const express = require('express');
const cors    = require('cors');
const db      = require('./database');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// ➕ ADD a new expense
app.post('/expenses', (req, res) => {
  const { amount, category, note, date, time } = req.body;
  const query = 'INSERT INTO expenses (amount, category, note, date, time) VALUES (?, ?, ?, ?, ?)';
  db.run(query, [amount, category, note || '', date, time], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id: this.lastID });
  });
});

// 📋 GET all expenses (with optional date filter)
app.get('/expenses', (req, res) => {
  const { from, to } = req.query;
  let query = 'SELECT * FROM expenses';
  const params = [];
  if (from && to) {
    query += ' WHERE date >= ? AND date <= ?';
    params.push(from, to);
  }
  query += ' ORDER BY date DESC, time DESC';
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 🗑️ DELETE an expense
app.delete('/expenses/:id', (req, res) => {
  db.run('DELETE FROM expenses WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Start the server on port 3000
app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});