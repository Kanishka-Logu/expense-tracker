const API = 'https://expense-tracker-backend-0mwv.onrender.com';

let allExpenses = [];

window.onload = () => {
  const now = new Date();
  document.getElementById('date').value = now.toISOString().slice(0, 10);
  document.getElementById('time').value = now.toTimeString().slice(0, 5);
  document.getElementById('today-date').textContent = now.toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  fetchAll();
};

function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('section-' + name).classList.add('active');
  document.querySelectorAll('.nav-item')[['dashboard','add','history'].indexOf(name)].classList.add('active');
  const titles = { dashboard: 'Dashboard', add: 'Add Expense', history: 'All Expenses' };
  const subs   = { dashboard: "Welcome back! Here's your spending overview.", add: 'Record a new expense entry.', history: 'Browse and filter all your expenses.' };
  document.getElementById('page-title').textContent = titles[name];
  document.querySelector('.topbar-sub').textContent = subs[name];
  if (name === 'history') renderTable('expense-table', allExpenses);
}

async function fetchAll() {
  const res = await fetch(`${API}/expenses`);
  allExpenses = await res.json();
  updateStats();
  renderTable('dashboard-table', allExpenses.slice(0, 8));
}

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

function renderTable(containerId, expenses) {
  const container = document.getElementById(containerId);
  if (!expenses.length) {
    container.innerHTML = '<table><tbody><tr class="empty-row"><td colspan="6">No expenses found. Add your first expense!</td></tr></tbody></table>';
    return;
  }
  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Note</th>
          <th>Category</th>
          <th>Date & Time</th>
          <th>Amount</th>
          <th></th>
        </tr>
      </thead>
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

async function addExpense() {
  const amount   = parseFloat(document.getElementById('amount').value);
  const category = document.getElementById('category').value;
  const note     = document.getElementById('note').value;
  const date     = document.getElementById('date').value;
  const time     = document.getElementById('time').value;
  const msg      = document.getElementById('form-msg');

  if (!amount || amount <= 0) {
    msg.style.color = '#e74c3c';
    msg.textContent = 'Please enter a valid amount!';
    return;
  }

  await fetch(`${API}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, category, note, date, time })
  });

  document.getElementById('amount').value = '';
  document.getElementById('note').value   = '';
  msg.style.color = '#1D9E75';
  msg.textContent = '✓ Expense added successfully!';
  setTimeout(() => msg.textContent = '', 3000);
  fetchAll();
}

async function loadExpenses() {
  const from = document.getElementById('from').value;
  const to   = document.getElementById('to').value;
  let url    = `${API}/expenses`;
  if (from && to) url += `?from=${from}&to=${to}`;
  const res      = await fetch(url);
  const expenses = await res.json();
  const total    = expenses.reduce((s, e) => s + e.amount, 0);
  const el       = document.getElementById('total-display');
  el.style.display = 'block';
  el.textContent = `Total: ${fmt(total)} across ${expenses.length} expense(s)` +
    (from && to ? ` from ${from} to ${to}` : '');
  renderTable('expense-table', expenses);
}

function clearFilter() {
  document.getElementById('from').value = '';
  document.getElementById('to').value   = '';
  document.getElementById('total-display').style.display = 'none';
  renderTable('expense-table', allExpenses);
}

async function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  await fetch(`${API}/expenses/${id}`, { method: 'DELETE' });
  await fetchAll();
  renderTable('expense-table', allExpenses);
}

function fmt(n) {
  return '₹' + Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: 0, maximumFractionDigits: 0
  });
}