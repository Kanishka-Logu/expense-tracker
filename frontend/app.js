const API = 'https://expense-tracker-backend-0mwv.onrender.com';

let allExpenses = [];
let pieChart, barChart, monthChart;

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
  document.querySelectorAll('.nav-item')[['dashboard','add','history','charts'].indexOf(name)].classList.add('active');
  const titles = { dashboard: 'Dashboard', add: 'Add Expense', history: 'All Expenses', charts: 'Charts & Analytics' };
  const subs   = { dashboard: "Welcome back! Here's your spending overview.", add: 'Record a new expense entry.', history: 'Browse, search and filter all your expenses.', charts: 'Visual breakdown of your spending habits.' };
  document.getElementById('page-title').textContent = titles[name];
  document.querySelector('.topbar-sub').textContent = subs[name];
  if (name === 'history') {
    document.getElementById('search-input').value = '';
    renderTable('expense-table', allExpenses);
  }
  if (name === 'charts') renderCharts();
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

// 📊 CHARTS
function renderCharts() {
  renderPieChart();
  renderBarChart();
  renderMonthChart();
}

function renderPieChart() {
  const catColors = {
    Food: '#3266ad', Transport: '#1D9E75', Shopping: '#D85A30',
    Health: '#D4537E', Bills: '#7F77DD', Entertainment: '#BA7517', Other: '#888780'
  };
  const byCat = {};
  allExpenses.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
  const labels = Object.keys(byCat);
  const data   = Object.values(byCat);
  const colors = labels.map(l => catColors[l] || '#888');
  const total  = data.reduce((a, b) => a + b, 0);

  // Legend
  document.getElementById('pie-legend').innerHTML = labels.map((l, i) => `
    <span class="legend-item">
      <span class="legend-dot" style="background:${colors[i]}"></span>
      ${l} (${Math.round(data[i] / total * 100)}%)
    </span>
  `).join('');

  if (pieChart) pieChart.destroy();
  pieChart = new Chart(document.getElementById('pieChart'), {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } }
    }
  });
}

function renderBarChart() {
  const last14 = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last14.push(d.toISOString().slice(0, 10));
  }
  const byDate = {};
  allExpenses.forEach(e => { byDate[e.date] = (byDate[e.date] || 0) + e.amount; });
  const data   = last14.map(d => Math.round(byDate[d] || 0));
  const labels = last14.map(d => d.slice(5));

  if (barChart) barChart.destroy();
  barChart = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Spending',
        data,
        backgroundColor: '#4f6ef7',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#888', autoSkip: false, maxRotation: 45 } },
        y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 }, color: '#888', callback: v => '₹' + v.toLocaleString('en-IN') } }
      }
    }
  });
}

function renderMonthChart() {
  const byMonth = {};
  allExpenses.forEach(e => {
    const m = e.date.slice(0, 7);
    byMonth[m] = (byMonth[m] || 0) + e.amount;
  });
  const labels = Object.keys(byMonth).sort().slice(-6);
  const data   = labels.map(m => Math.round(byMonth[m]));

  if (monthChart) monthChart.destroy();
  monthChart = new Chart(document.getElementById('monthChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Monthly Spending',
        data,
        borderColor: '#4f6ef7',
        backgroundColor: 'rgba(79,110,247,0.08)',
        borderWidth: 2,
        pointBackgroundColor: '#4f6ef7',
        pointRadius: 5,
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#888' } },
        y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 }, color: '#888', callback: v => '₹' + v.toLocaleString('en-IN') } }
      }
    }
  });
}

// 🔍 SEARCH
function searchExpenses() {
  const query = document.getElementById('search-input').value.toLowerCase().trim();
  if (!query) { renderTable('expense-table', allExpenses); return; }
  const filtered = allExpenses.filter(e =>
    (e.note && e.note.toLowerCase().includes(query)) ||
    e.category.toLowerCase().includes(query)
  );
  renderTable('expense-table', filtered);
}

function renderTable(containerId, expenses) {
  const container = document.getElementById(containerId);
  if (!expenses.length) {
    container.innerHTML = '<table><tbody><tr class="empty-row"><td colspan="6">No expenses found.</td></tr></tbody></table>';
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
  document.getElementById('search-input').value = '';
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