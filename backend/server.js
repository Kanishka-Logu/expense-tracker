const express = require('express');
const cors    = require('cors');
const db      = require('./database');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// ➕ ADD expense
app.post('/expenses', (req, res) => {
  const { amount, category, note, date, time } = req.body;
  const id = db.get('nextId').value();
  const expense = { id, amount, category, note: note || '', date, time };
  db.get('expenses').push(expense).write();
  db.update('nextId', n => n + 1).write();
  res.json({ success: true, id });
});

// 📋 GET expenses
app.get('/expenses', (req, res) => {
  const { from, to } = req.query;
  let expenses = db.get('expenses').value();
  if (from && to) {
    expenses = expenses.filter(e => e.date >= from && e.date <= to);
  }
  expenses = expenses.slice().reverse();
  res.json(expenses);
});

// 🗑️ DELETE expense
app.delete('/expenses/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.get('expenses').remove({ id }).write();
  res.json({ success: true });
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});