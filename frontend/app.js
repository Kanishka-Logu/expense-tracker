const API = 'https://expense-tracker-backend-0mwv.onrender.com';

let allExpenses    = [];
let pieChart, barChart, monthChart;
let currentTableData = [];
let authToken      = localStorage.getItem('expense_token') || '';
let importPreview  = [];
let selectedBank   = 'generic';

// ── HELPERS ──
function authHeaders() {
  return { 'Content-Type': 'application/json', 'x-auth-token': authToken };
}

// ── ON PAGE LOAD ──
window.onload = async () => {
  const now = new Date();
  document.getElementById('today-date').textContent = now.toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  if (authToken) {
    const res  = await fetch(`${API}/auth/status`, { headers: authHeaders() });
    const data = await res.json();
    if (data.loggedIn) { showApp(data.username); return; }
  }
  showLoginPage();
};

// ── LOGIN ──
async function login() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  if (!username || !password) { errEl.textContent = 'Please enter username and password!'; return; }
  const res  = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (data.success) {
    authToken = data.token;
    localStorage.setItem('expense_token', authToken);
    showApp(username);
  } else {
    errEl.textContent = 'Invalid username or password!';
  }
}

// ── LOGOUT ──
async function logout() {
  await fetch(`${API}/auth/logout`, { method: 'POST', headers: authHeaders() });
  authToken = '';
  localStorage.removeItem('expense_token');
  showLoginPage();
}

function showLoginPage() {
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('app').style.display        = 'none';
  document.getElementById('login-username').value     = '';
  document.getElementById('login-password').value     = '';
  document.getElementById('login-error').textContent  = '';
}

function showApp(username) {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app').style.display        = 'flex';
  document.getElementById('user-name').textContent    = username;
  document.getElementById('user-avatar').textContent  = username.charAt(0).toUpperCase();
  const now = new Date();
  document.getElementById('date').value = now.toISOString().slice(0, 10);
  document.getElementById('time').value = now.toTimeString().slice(0, 5);
  fetchAll();
}

// ── SECTIONS ──
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('section-' + name).classList.add('active');
  const navNames = ['dashboard','add','history','charts','import','settings'];
  document.querySelectorAll('.nav-item')[navNames.indexOf(name)].classList.add('active');
  const titles = {
    dashboard: 'Dashboard', add: 'Add Expense',
    history: 'All Expenses', charts: 'Charts & Analytics',
    import: 'Import Bank Statement', settings: 'Email Settings'
  };
  const subs = {
    dashboard: "Welcome back! Here's your spending overview.",
    add: 'Record a new expense entry.',
    history: 'Browse, search and filter all your expenses.',
    charts: 'Visual breakdown of your spending habits.',
    import: 'Upload your bank statement to auto-import transactions.',
    settings: 'Configure weekly email summary settings.'
  };
  document.getElementById('page-title').textContent = titles[name];
  document.querySelector('.topbar-sub').textContent = subs[name];
  if (name === 'history') {
    document.getElementById('search-input').value = '';
    currentTableData = allExpenses;
    renderTable('expense-table', allExpenses);
  }
  if (name === 'charts') renderCharts();
  if (name === 'settings') loadEmailSettings();
}

// ── FETCH ALL ──
async function fetchAll() {
  const res = await fetch(`${API}/expenses`, { headers: authHeaders() });
  if (res.status === 401) { showLoginPage(); return; }
  allExpenses      = await res.json();
  currentTableData = allExpenses;
  updateStats();
  renderTable('dashboard-table', allExpenses.slice(0, 8));
}

// ── STATS ──
function updateStats() {
  const td = new Date().toISOString().slice(0, 10);
  const ym = td.slice(0, 7);
  const yr = td.slice(0, 4);
  const sum = arr => arr.reduce((a, e) => a + e.amount, 0);
  const todayExp = allExpenses.filter(e => e.date === td);
  const monthExp = allExpenses.filter(e => e.date.startsWith(ym));
  const yearExp  = allExpenses.filter(e => e.date.startsWith(yr));
  document.getElementById('stat-today').textContent       = fmt(sum(todayExp));
  document.getElementById('stat-today-count').textContent = todayExp.length + ' transactions';
  document.getElementById('stat-month').textContent       = fmt(sum(monthExp));
  document.getElementById('stat-month-count').textContent = monthExp.length + ' transactions';
  document.getElementById('stat-year').textContent        = fmt(sum(yearExp));
  document.getElementById('stat-year-count').textContent  = yearExp.length + ' transactions';
  document.getElementById('stat-total').textContent       = fmt(sum(allExpenses));
  document.getElementById('stat-total-count').textContent = allExpenses.length + ' transactions';
}

// ── ADD EXPENSE ──
async function addExpense() {
  const amount   = parseFloat(document.getElementById('amount').value);
  const category = document.getElementById('category').value;
  const note     = document.getElementById('note').value;
  const date     = document.getElementById('date').value;
  const time     = document.getElementById('time').value;
  const msg      = document.getElementById('form-msg');
  if (!amount || amount <= 0) {
    msg.style.color = '#e74c3c'; msg.textContent = 'Please enter a valid amount!'; return;
  }
  await fetch(`${API}/expenses`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ amount, category, note, date, time })
  });
  document.getElementById('amount').value = '';
  document.getElementById('note').value   = '';
  msg.style.color = '#1D9E75';
  msg.textContent = '✓ Expense added successfully!';
  setTimeout(() => msg.textContent = '', 3000);
  fetchAll();
}

// ── FILTER ──
async function loadExpenses() {
  const from = document.getElementById('from').value;
  const to   = document.getElementById('to').value;
  let url    = `${API}/expenses`;
  if (from && to) url += `?from=${from}&to=${to}`;
  const res      = await fetch(url, { headers: authHeaders() });
  const expenses = await res.json();
  const total    = expenses.reduce((s, e) => s + e.amount, 0);
  const el       = document.getElementById('total-display');
  el.style.display = 'block';
  el.textContent = `Total: ${fmt(total)} across ${expenses.length} expense(s)` +
    (from && to ? ` from ${from} to ${to}` : '');
  currentTableData = expenses;
  renderTable('expense-table', expenses);
}

function clearFilter() {
  document.getElementById('from').value = '';
  document.getElementById('to').value   = '';
  document.getElementById('search-input').value = '';
  document.getElementById('total-display').style.display = 'none';
  currentTableData = allExpenses;
  renderTable('expense-table', allExpenses);
}

// ── DELETE ──
async function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  await fetch(`${API}/expenses/${id}`, { method: 'DELETE', headers: authHeaders() });
  await fetchAll();
  currentTableData = allExpenses;
  renderTable('expense-table', allExpenses);
}

// ── SEARCH ──
function searchExpenses() {
  const query = document.getElementById('search-input').value.toLowerCase().trim();
  if (!query) { currentTableData = allExpenses; renderTable('expense-table', allExpenses); return; }
  const filtered = allExpenses.filter(e =>
    (e.note && e.note.toLowerCase().includes(query)) ||
    e.category.toLowerCase().includes(query)
  );
  currentTableData = filtered;
  renderTable('expense-table', filtered);
}

// ── RENDER TABLE ──
function renderTable(containerId, expenses) {
  const container = document.getElementById(containerId);
  if (!expenses.length) {
    container.innerHTML = '<table><tbody><tr class="empty-row"><td colspan="6">No expenses found.</td></tr></tbody></table>';
    return;
  }
  container.innerHTML = `
    <table>
      <thead><tr><th>#</th><th>Note</th><th>Category</th><th>Date & Time</th><th>Amount</th><th></th></tr></thead>
      <tbody>
        ${expenses.map((e, i) => `
          <tr>
            <td style="color:#bbb;font-size:12px">${i + 1}</td>
            <td style="font-weight:500">${e.note || '—'}</td>
            <td><span class="badge badge-${e.category}">${e.category}</span></td>
            <td style="color:#888;font-size:13px">${e.date} &nbsp; ${e.time}</td>
            <td class="amount-cell">${fmt(e.amount)}</td>
            <td><button class="del-btn" onclick="deleteExpense(${e.id})">✕</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// ── EXPORT TO EXCEL ──
function exportToExcel() {
  if (!currentTableData.length) { alert('No expenses to export!'); return; }
  const data = currentTableData.map((e, i) => ({
    'S.No': i+1, 'Date': e.date, 'Time': e.time,
    'Category': e.category, 'Note': e.note||'-', 'Amount (₹)': e.amount
  }));
  data.push({ 'S.No':'','Date':'','Time':'','Category':'','Note':'TOTAL',
    'Amount (₹)': currentTableData.reduce((s,e)=>s+e.amount,0) });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
  ws['!cols'] = [{wch:6},{wch:12},{wch:8},{wch:14},{wch:28},{wch:12}];
  XLSX.writeFile(wb, `expenses-${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ── EMAIL SETTINGS ──
async function loadEmailSettings() {
  const res  = await fetch(`${API}/settings/email`, { headers: authHeaders() });
  const data = await res.json();
  document.getElementById('setting-email').value   = data.email || '';
  document.getElementById('setting-enabled').checked = data.enabled || false;
}

async function saveEmailSettings() {
  const email       = document.getElementById('setting-email').value.trim();
  const appPassword = document.getElementById('setting-password').value.trim();
  const enabled     = document.getElementById('setting-enabled').checked;
  const msg         = document.getElementById('settings-msg');
  if (!email) { msg.style.color = '#e74c3c'; msg.textContent = 'Please enter your email!'; return; }
  if (!appPassword) { msg.style.color = '#e74c3c'; msg.textContent = 'Please enter your App Password!'; return; }
  const res  = await fetch(`${API}/settings/email`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ email, appPassword, enabled })
  });
  const data = await res.json();
  if (data.success) {
    msg.style.color = '#1D9E75';
    msg.textContent = '✓ Email settings saved successfully!';
    setTimeout(() => msg.textContent = '', 3000);
  }
}

async function sendTestEmail() {
  const msg = document.getElementById('settings-msg');
  msg.style.color   = '#888';
  msg.textContent   = 'Sending test email...';
  const res  = await fetch(`${API}/settings/email/test`, {
    method: 'POST', headers: authHeaders()
  });
  const data = await res.json();
  if (data.success) {
    msg.style.color = '#1D9E75';
    msg.textContent = '✓ Test email sent! Check your inbox.';
  } else {
    msg.style.color = '#e74c3c';
    msg.textContent = 'Error: ' + (data.error || 'Failed to send email');
  }
}

async function sendNowEmail() {
  const msg = document.getElementById('settings-msg');
  msg.style.color   = '#888';
  msg.textContent   = 'Sending weekly report...';
  const res  = await fetch(`${API}/settings/email/send-now`, {
    method: 'POST', headers: authHeaders()
  });
  const data = await res.json();
  if (data.success) {
    msg.style.color = '#1D9E75';
    msg.textContent = '✓ Weekly report sent! Check your inbox.';
  } else {
    msg.style.color = '#e74c3c';
    msg.textContent = 'Failed to send report. Check your email settings.';
  }
}

// ── BANK IMPORT ──
function selectBank(el, bank) {
  document.querySelectorAll('.bank-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  selectedBank = bank;
}

function handleFile(input) {
  const file = input.files[0];
  if (!file) return;
  document.getElementById('file-name').textContent = '📄 ' + file.name;
  const reader = new FileReader();
  reader.onload = (e) => {
    const data     = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    const rows     = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    parseStatement(rows);
  };
  reader.readAsArrayBuffer(file);
}

function parseStatement(rows) {
  importPreview = [];
  let headerIdx = 0;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i].map(c => String(c).toLowerCase());
    if (row.some(c => c.includes('date')) && row.some(c => c.includes('amount') || c.includes('debit'))) {
      headerIdx = i; break;
    }
  }
  const headers  = rows[headerIdx].map(c => String(c).toLowerCase().trim());
  const dateIdx  = headers.findIndex(h => h.includes('date'));
  const debitIdx = headers.findIndex(h => h.includes('debit') || h.includes('withdrawal') || h.includes('amount'));
  const descIdx  = headers.findIndex(h => h.includes('description') || h.includes('narration') || h.includes('particulars') || h.includes('details') || h.includes('remarks'));

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row    = rows[i];
    if (!row || !row[dateIdx]) continue;
    const rawAmt = parseFloat(String(row[debitIdx]).replace(/[^0-9.]/g, ''));
    if (!rawAmt || rawAmt <= 0) continue;
    const date = parseDate(String(row[dateIdx]).trim());
    if (!date) continue;
    const note     = descIdx >= 0 ? String(row[descIdx]).trim() : 'Bank Transaction';
    const category = detectCategory(note);
    importPreview.push({ amount: rawAmt, category, note, date, time: '00:00' });
  }

  if (!importPreview.length) { alert('No debit transactions found!'); return; }
  showPreview();
}

function parseDate(raw) {
  if (!raw) return null;
  let d;
  if (/^\d{2}[-\/]\d{2}[-\/]\d{4}$/.test(raw)) {
    const [dd, mm, yyyy] = raw.split(/[-\/]/);
    d = new Date(`${yyyy}-${mm}-${dd}`);
  } else if (/^\d{4}[-\/]\d{2}[-\/]\d{2}$/.test(raw)) {
    d = new Date(raw);
  } else {
    d = new Date(raw);
  }
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function detectCategory(note) {
  const n = note.toLowerCase();
  if (/ola|uber|auto|cab|bus|train|metro|rapido|redbus|irctc|flight|airways/.test(n)) return 'Transport';
  if (/swiggy|zomato|hotel|restaurant|cafe|food|kitchen|biryani|pizza|burger|eat|mess|canteen|bhavan|diner/.test(n)) return 'Food';
  if (/amazon|flipkart|mall|bazaar|mart|shop|store|myntra|nykaa|meesho|ajio/.test(n)) return 'Shopping';
  if (/hospital|pharmacy|medical|doctor|clinic|health|medicine|labs|diagnostic/.test(n)) return 'Health';
  if (/electricity|water|gas|airtel|jio|bsnl|vodafone|broadband|bill|recharge|insurance|lic/.test(n)) return 'Bills';
  if (/netflix|spotify|prime|hotstar|cinema|movie|theatre|concert|game/.test(n)) return 'Entertainment';
  return 'Other';
}

function showPreview() {
  document.getElementById('step-preview').style.display = 'flex';
  document.getElementById('preview-count').textContent =
    `Found ${importPreview.length} debit transactions ready to import`;
  document.getElementById('preview-table').innerHTML = `
    <table>
      <thead><tr><th>#</th><th>Note</th><th>Category</th><th>Date</th><th>Amount</th></tr></thead>
      <tbody>
        ${importPreview.map((e, i) => `
          <tr>
            <td style="color:#bbb;font-size:12px">${i + 1}</td>
            <td style="font-weight:500;font-size:13px">${e.note.slice(0,40)}${e.note.length>40?'...':''}</td>
            <td><span class="badge badge-${e.category}">${e.category}</span></td>
            <td style="color:#888;font-size:13px">${e.date}</td>
            <td class="amount-cell">${fmt(e.amount)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  document.getElementById('import-msg').textContent = '';
}

async function importAll() {
  if (!importPreview.length) return;
  const msg = document.getElementById('import-msg');
  msg.style.color = '#888'; msg.textContent = 'Importing...';
  const res  = await fetch(`${API}/expenses/bulk`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ expenses: importPreview })
  });
  const data = await res.json();
  if (data.success) {
    msg.style.color = '#1D9E75';
    msg.textContent = `✓ Successfully imported ${data.imported} transactions!`;
    importPreview   = [];
    fetchAll();
    setTimeout(() => {
      document.getElementById('step-preview').style.display = 'none';
      document.getElementById('file-name').textContent = '';
      document.getElementById('file-input').value = '';
      showSection('history');
    }, 2000);
  } else {
    msg.style.color = '#e74c3c';
    msg.textContent = 'Import failed. Please try again.';
  }
}

function cancelImport() {
  importPreview = [];
  document.getElementById('step-preview').style.display = 'none';
  document.getElementById('file-name').textContent = '';
  document.getElementById('file-input').value = '';
}

// ── CHARTS ──
function renderCharts() { renderPieChart(); renderBarChart(); renderMonthChart(); }

function renderPieChart() {
  const catColors = { Food:'#3266ad',Transport:'#1D9E75',Shopping:'#D85A30',Health:'#D4537E',Bills:'#7F77DD',Entertainment:'#BA7517',Other:'#888780' };
  const byCat = {};
  allExpenses.forEach(e => { byCat[e.category]=(byCat[e.category]||0)+e.amount; });
  const labels = Object.keys(byCat);
  const data   = Object.values(byCat);
  const colors = labels.map(l => catColors[l]||'#888');
  const total  = data.reduce((a,b)=>a+b,0);
  document.getElementById('pie-legend').innerHTML = labels.map((l,i) => `
    <span class="legend-item"><span class="legend-dot" style="background:${colors[i]}"></span>${l} (${Math.round(data[i]/total*100)}%)</span>
  `).join('');
  if (pieChart) pieChart.destroy();
  pieChart = new Chart(document.getElementById('pieChart'), {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }] },
    options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}} }
  });
}

function renderBarChart() {
  const last14 = [];
  for (let i=13;i>=0;i--) { const d=new Date(); d.setDate(d.getDate()-i); last14.push(d.toISOString().slice(0,10)); }
  const byDate = {};
  allExpenses.forEach(e => { byDate[e.date]=(byDate[e.date]||0)+e.amount; });
  if (barChart) barChart.destroy();
  barChart = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: { labels:last14.map(d=>d.slice(5)), datasets:[{data:last14.map(d=>Math.round(byDate[d]||0)),backgroundColor:'#4f6ef7',borderRadius:6}] },
    options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
      scales:{ x:{grid:{display:false},ticks:{font:{size:11},color:'#888',autoSkip:false,maxRotation:45}},
        y:{grid:{color:'rgba(0,0,0,0.05)'},ticks:{font:{size:11},color:'#888',callback:v=>'₹'+v.toLocaleString('en-IN')}} } }
  });
}

function renderMonthChart() {
  const byMonth = {};
  allExpenses.forEach(e => { const m=e.date.slice(0,7); byMonth[m]=(byMonth[m]||0)+e.amount; });
  const labels = Object.keys(byMonth).sort().slice(-6);
  if (monthChart) monthChart.destroy();
  monthChart = new Chart(document.getElementById('monthChart'), {
    type: 'line',
    data: { labels, datasets:[{ data:labels.map(m=>Math.round(byMonth[m])), borderColor:'#4f6ef7',
      backgroundColor:'rgba(79,110,247,0.08)', borderWidth:2, pointBackgroundColor:'#4f6ef7',
      pointRadius:5, tension:0.4, fill:true }] },
    options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
      scales:{ x:{grid:{display:false},ticks:{font:{size:11},color:'#888'}},
        y:{grid:{color:'rgba(0,0,0,0.05)'},ticks:{font:{size:11},color:'#888',callback:v=>'₹'+v.toLocaleString('en-IN')}} } }
  });
}

function fmt(n) {
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits:0, maximumFractionDigits:0 });
}
// ── KEEP SERVER AWAKE ──
// Pings backend every 10 minutes to prevent Render from sleeping
setInterval(async () => {
  try {
    await fetch(`${API}/auth/status`, { headers: authHeaders() });
  } catch (e) {}
}, 10 * 60 * 1000);