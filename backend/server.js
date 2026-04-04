const express  = require('express');
const cors     = require('cors');
const bcrypt   = require('bcryptjs');
const session  = require('express-session');
const db       = require('./database');

const app = express();

app.use(cors({
  origin: 'https://expense-tracker-kanishkaa.netlify.app',
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: 'expense-tracker-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'none',
    secure: true
  }
}));
app.use(express.static('../frontend'));

// ── DEFAULT ADMIN USER ──
// Username: admin   Password: admin123
// Change this after first login!
const ADMIN = {
  username: 'admin',
  password: bcrypt.hashSync('admin123', 10)
};

// ── AUTH MIDDLEWARE ──
function requireLogin(req, res, next) {
  if (req.session && req.session.loggedIn) return next();
  res.status(401).json({ error: 'Not logged in' });
}

// ── AUTH ROUTES ──

// Check if logged in
app.get('/auth/status', (req, res) => {
  res.json({ loggedIn: !!req.session.loggedIn, username: req.session.username || '' });
});

// Login
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN.username && bcrypt.compareSync(password, ADMIN.password)) {
    req.session.loggedIn  = true;
    req.session.username  = username;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid username or password' });
  }
});

// Logout
app.post('/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// ── EXPENSE ROUTES (protected) ──

// ➕ ADD expense
app.post('/expenses', requireLogin, (req, res) => {
  const { amount, category, note, date, time } = req.body;
  const id = db.get('nextId').value();
  const expense = { id, amount, category, note: note || '', date, time };
  db.get('expenses').push(expense).write();
  db.update('nextId', n => n + 1).write();
  res.json({ success: true, id });
});

// 📋 GET expenses
app.get('/expenses', requireLogin, (req, res) => {
  const { from, to } = req.query;
  let expenses = db.get('expenses').value();
  if (from && to) {
    expenses = expenses.filter(e => e.date >= from && e.date <= to);
  }
  expenses = expenses.slice().reverse();
  res.json(expenses);
});

// 🗑️ DELETE expense
app.delete('/expenses/:id', requireLogin, (req, res) => {
  const id = parseInt(req.params.id);
  db.get('expenses').remove({ id }).write();
  res.json({ success: true });
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});