const express   = require('express');
const cors      = require('cors');
const bcrypt    = require('bcryptjs');
const nodemailer = require('nodemailer');
const mailer     = nodemailer.default || nodemailer;
const cron      = require('node-cron');
const db        = require('./database');

const app = express();

app.use(cors({
  origin: 'https://expense-tracker-kanishkaa.netlify.app',
  credentials: true
}));
app.use(express.json());
app.use(express.static('../frontend'));

// ── TOKEN STORE ──
const validTokens = new Set();

// ── ADMIN USER ──
const ADMIN = {
  username: 'admin',
  password: bcrypt.hashSync('admin123', 10),
  email: ''  // ← We will set this via API
};

// ── EMAIL CONFIG ──
// We store email settings in database
function getEmailConfig() {
  return db.get('emailConfig').value() || { email: '', appPassword: '', enabled: false };
}

function createTransporter() {
  const config = getEmailConfig();
  if (!config.email || !config.appPassword) return null;
  return mailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.email,
      pass: config.appPassword
    }
  });
}
// ── WEEKLY EMAIL FUNCTION ──
async function sendWeeklyEmail() {
  const config = getEmailConfig();
  if (!config.enabled || !config.email) {
    console.log('Email not configured or disabled');
    return;
  }

  const transporter = createTransporter();
  if (!transporter) return;

  // Get last 7 days expenses
  const today   = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 7);

  const toDate   = today.toISOString().slice(0, 10);
  const fromDate = weekAgo.toISOString().slice(0, 10);

  const allExp   = db.get('expenses').value();
  const weekExp  = allExp.filter(e => e.date >= fromDate && e.date <= toDate);
  const total    = weekExp.reduce((s, e) => s + e.amount, 0);

  // Last week comparison
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(today.getDate() - 14);
  const lastWeekExp = allExp.filter(e =>
    e.date >= twoWeeksAgo.toISOString().slice(0, 10) && e.date < fromDate
  );
  const lastTotal = lastWeekExp.reduce((s, e) => s + e.amount, 0);
  const diff      = total - lastTotal;
  const diffText  = diff > 0
    ? `<span style="color:#e74c3c">▲ ₹${Math.abs(diff).toLocaleString('en-IN')} more than last week</span>`
    : `<span style="color:#1D9E75">▼ ₹${Math.abs(diff).toLocaleString('en-IN')} less than last week</span>`;

  // Category breakdown
  const byCat = {};
  weekExp.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
  const catColors = {
    Food: '#3266ad', Transport: '#1D9E75', Shopping: '#D85A30',
    Health: '#D4537E', Bills: '#7F77DD', Entertainment: '#BA7517', Other: '#888780'
  };
  const catRows = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0">
          <span style="background:${catColors[cat]||'#888'};color:white;padding:3px 10px;border-radius:12px;font-size:12px">${cat}</span>
        </td>
        <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-weight:600;color:#1a1a2e">
          ₹${amt.toLocaleString('en-IN')}
        </td>
        <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;color:#888;font-size:13px">
          ${Math.round(amt / total * 100)}%
        </td>
      </tr>
    `).join('');

  // Top 5 transactions
  const top5 = weekExp
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((e, i) => `
      <tr>
        <td style="padding:8px 16px;border-bottom:1px solid #f0f0f0;color:#888;font-size:13px">${i + 1}</td>
        <td style="padding:8px 16px;border-bottom:1px solid #f0f0f0;font-weight:500">${e.note || e.category}</td>
        <td style="padding:8px 16px;border-bottom:1px solid #f0f0f0">
          <span style="background:${catColors[e.category]||'#888'};color:white;padding:2px 8px;border-radius:10px;font-size:11px">${e.category}</span>
        </td>
        <td style="padding:8px 16px;border-bottom:1px solid #f0f0f0;color:#888;font-size:12px">${e.date}</td>
        <td style="padding:8px 16px;border-bottom:1px solid #f0f0f0;font-weight:600;color:#1a1a2e">₹${e.amount.toLocaleString('en-IN')}</td>
      </tr>
    `).join('');

  const biggest = weekExp.sort((a, b) => b.amount - a.amount)[0];

  // Build HTML email
  const html = `
  <!DOCTYPE html>
  <html>
  <body style="font-family:Arial,sans-serif;background:#f0f2f7;margin:0;padding:20px">
    <div style="max-width:600px;margin:auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.08)">

      <!-- HEADER -->
      <div style="background:#1a1a2e;padding:32px;text-align:center">
        <div style="background:#4f6ef7;width:48px;height:48px;border-radius:12px;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:24px;line-height:48px">₹</div>
        <h1 style="color:white;margin:0;font-size:22px">Weekly Expense Summary</h1>
        <p style="color:rgba(255,255,255,0.6);margin:8px 0 0;font-size:14px">
          ${fromDate} to ${toDate}
        </p>
      </div>

      <!-- TOTAL CARD -->
      <div style="padding:24px;background:#f8f9ff;border-bottom:1px solid #e8eaf0">
        <div style="text-align:center">
          <p style="color:#888;font-size:13px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px">Total Spent This Week</p>
          <p style="color:#1a1a2e;font-size:40px;font-weight:700;margin:0">₹${total.toLocaleString('en-IN')}</p>
          <p style="margin:8px 0 0;font-size:13px">${diffText}</p>
        </div>
        <div style="display:flex;justify-content:space-around;margin-top:20px">
          <div style="text-align:center">
            <p style="color:#888;font-size:12px;margin:0">Transactions</p>
            <p style="color:#1a1a2e;font-size:20px;font-weight:700;margin:4px 0">${weekExp.length}</p>
          </div>
          <div style="text-align:center">
            <p style="color:#888;font-size:12px;margin:0">Daily Average</p>
            <p style="color:#1a1a2e;font-size:20px;font-weight:700;margin:4px 0">₹${Math.round(total / 7).toLocaleString('en-IN')}</p>
          </div>
          <div style="text-align:center">
            <p style="color:#888;font-size:12px;margin:0">Biggest Expense</p>
            <p style="color:#1a1a2e;font-size:20px;font-weight:700;margin:4px 0">₹${biggest ? biggest.amount.toLocaleString('en-IN') : 0}</p>
          </div>
        </div>
      </div>

      <!-- CATEGORY BREAKDOWN -->
      <div style="padding:24px">
        <h2 style="color:#1a1a2e;font-size:16px;margin:0 0 16px">Spending by Category</h2>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#f8f9ff">
              <th style="padding:10px 16px;text-align:left;font-size:12px;color:#888;font-weight:600;text-transform:uppercase">Category</th>
              <th style="padding:10px 16px;text-align:left;font-size:12px;color:#888;font-weight:600;text-transform:uppercase">Amount</th>
              <th style="padding:10px 16px;text-align:left;font-size:12px;color:#888;font-weight:600;text-transform:uppercase">Share</th>
            </tr>
          </thead>
          <tbody>${catRows}</tbody>
        </table>
      </div>

      <!-- TOP TRANSACTIONS -->
      <div style="padding:0 24px 24px">
        <h2 style="color:#1a1a2e;font-size:16px;margin:0 0 16px">Top 5 Transactions</h2>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#f8f9ff">
              <th style="padding:8px 16px;text-align:left;font-size:12px;color:#888">#</th>
              <th style="padding:8px 16px;text-align:left;font-size:12px;color:#888">Note</th>
              <th style="padding:8px 16px;text-align:left;font-size:12px;color:#888">Category</th>
              <th style="padding:8px 16px;text-align:left;font-size:12px;color:#888">Date</th>
              <th style="padding:8px 16px;text-align:left;font-size:12px;color:#888">Amount</th>
            </tr>
          </thead>
          <tbody>${top5}</tbody>
        </table>
      </div>

      <!-- FOOTER -->
      <div style="background:#f8f9ff;padding:20px;text-align:center;border-top:1px solid #e8eaf0">
        <p style="color:#888;font-size:12px;margin:0">
          This is an automated weekly summary from your ExpenseTrack app.<br/>
          <a href="https://expense-tracker-kanishkaa.netlify.app" style="color:#4f6ef7">Open App →</a>
        </p>
      </div>

    </div>
  </body>
  </html>
  `;

  try {
    await transporter.sendMail({
      from: `"ExpenseTrack" <${config.email}>`,
      to: config.email,
      subject: `📊 Weekly Expense Summary — ₹${total.toLocaleString('en-IN')} spent`,
      html
    });
    console.log('Weekly email sent successfully!');
  } catch (err) {
    console.error('Email error:', err.message);
  }
}

// ── SCHEDULE: Every Monday at 8:00 AM ──
cron.schedule('0 8 * * 1', () => {
  console.log('Sending weekly email...');
  sendWeeklyEmail();
});

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

// ── EMAIL SETTINGS ROUTES ──

// Save email settings
app.post('/settings/email', requireLogin, (req, res) => {
  const { email, appPassword, enabled } = req.body;
  db.set('emailConfig', { email, appPassword, enabled }).write();
  res.json({ success: true });
});

// Get email settings
app.get('/settings/email', requireLogin, (req, res) => {
  const config = getEmailConfig();
  res.json({ email: config.email, enabled: config.enabled });
});

// Send test email
app.post('/settings/email/test', requireLogin, async (req, res) => {
  const config = getEmailConfig();
  if (!config.email || !config.appPassword) {
    return res.status(400).json({ error: 'Email not configured' });
  }
  const transporter = createTransporter();
  try {
    await transporter.sendMail({
      from: `"ExpenseTrack" <${config.email}>`,
      to: config.email,
      subject: '✅ ExpenseTrack Email Test',
      html: `<div style="font-family:Arial;padding:20px;max-width:400px">
        <h2 style="color:#4f6ef7">Email Connected Successfully!</h2>
        <p>Your ExpenseTrack app is now connected to your email.</p>
        <p>You will receive weekly expense summaries every <strong>Monday at 8:00 AM</strong>.</p>
      </div>`
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send weekly email manually
app.post('/settings/email/send-now', requireLogin, async (req, res) => {
  await sendWeeklyEmail();
  res.json({ success: true });
});

// ── EXPENSE ROUTES ──
app.post('/expenses/bulk', requireLogin, (req, res) => {
  const { expenses } = req.body;
  if (!expenses || !expenses.length) return res.status(400).json({ error: 'No expenses' });
  let imported = 0;
  expenses.forEach(e => {
    const id = db.get('nextId').value();
    db.get('expenses').push({ id, amount: e.amount, category: e.category, note: e.note||'', date: e.date, time: e.time||'00:00' }).write();
    db.update('nextId', n => n + 1).write();
    imported++;
  });
  res.json({ success: true, imported });
});

app.post('/expenses', requireLogin, (req, res) => {
  const { amount, category, note, date, time } = req.body;
  const id = db.get('nextId').value();
  db.get('expenses').push({ id, amount, category, note: note||'', date, time }).write();
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
  db.get('expenses').remove({ id: parseInt(req.params.id) }).write();
  res.json({ success: true });
});

app.listen(3000, () => console.log('Server running at http://localhost:3000'));