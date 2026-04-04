const express = require('express');
const cors    = require('cors');
const bcrypt  = require('bcryptjs');
const db      = require('./database');

const app = express();

app.use(cors({
  origin: 'https://expense-tracker-kanishkaa.netlify.app',
  credentials: true
}));
app.use(express.json());
app.use(express.static('../frontend'));

// Simple token store
const validTokens = new Set();

// Default admin — username: admin  password: admin123
const ADMIN = {
  username: 'admin',
  password: bcrypt.hashSync('admin123', 10)
};

// ── AUTH MIDDLEWARE ──
function requireLogin(req, res, next) {
  const token = req.headers['x-auth-token'];
  if (token && validTokens.has(token)) return next();
  res.status(401).json({ error: 'Not logged in' });
}

// ── AUTH ROUTES ──
app.get('/auth/status', (req, res) => {
  const token = req.headers['x-auth-token'];
  if (token && validTokens.has(token)) {
    res.json({ loggedIn: true, username: 'admin' });
  } else {
    res.json({ loggedIn: false });
  }
});

app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN.username && bcrypt.compareSync(password, ADMIN.password)) {
    const token = Math.random().toString(36).slice(2) + Date.now();
    validTokens.add(token);
    res.json({ success: true, token });
  } else {
    res.status(401).json({ error: 'Invalid username or password' });
  }
});

app.post('/auth/logout', (req, res) => {
  const token = req.headers['x-auth-token'];
  validTokens.delete(token);
  res.json({ success: true });
});

// ── EXPENSE ROUTES ──
app.post('/expenses', requireLogin, (req, res) => {
  const { amount, category, note, date, time } = req.body;
  const id = db.get('nextId').value();
  const expense = { id, amount, category, note: note || '', date, time };
  db.get('expenses').push(expense).write();
  db.update('nextId', n => n + 1).write();
  res.json({ success: true, id });
});

app.get('/expenses', requireLogin, (req, res) => {
  const { from, to } = req.query;
  let expenses = db.get('expenses').value();
  if (from && to) expenses = expenses.filter(e => e.date >= from && e.date <= to);
  res.json(expenses.slice().reverse());
});

app.delete('/expenses/:id', requireLogin, (req, res) => {
  const id = parseInt(req.params.id);
  db.get('expenses').remove({ id }).write();
  res.json({ success: true });
});

app.listen(3000, () => console.log('Server running at http://localhost:3000'));