# 💰 Expense Tracker

A simple web app to track daily expenses with date/time, categories, and filters.

---

## 📁 Project Structure

```
expense-tracker/
├── backend/
│   ├── server.js       ← Express API server
│   ├── database.js     ← SQLite database setup
│   └── package.json    ← Backend dependencies
└── frontend/
    ├── index.html      ← Main UI
    ├── style.css       ← Styling
    └── app.js          ← Frontend logic
```

---

## 🚀 How to Run Locally

### Step 1 — Install backend dependencies
Open terminal, go into the backend folder:
```bash
cd backend
npm install
```

### Step 2 — Start the backend server
```bash
node server.js
```
You should see: `Server running at http://localhost:3000`

### Step 3 — Open the frontend
Open `frontend/index.html` in your browser.
- On Windows: double-click the file, or right-click → Open with → Chrome

---

## ☁️ Deploy Online (Free)

### Backend → Render.com
1. Push this project to GitHub
2. Go to render.com → New Web Service
3. Set Root Directory: `backend`
4. Build command: `npm install`
5. Start command: `node server.js`
6. Copy the live URL (e.g. https://your-app.onrender.com)

### Frontend → Netlify.com
1. Go to netlify.com → Add new site → Import from Git
2. Set Publish directory: `frontend`
3. Deploy!

### After deploying backend:
In `frontend/app.js`, change line 2:
```js
const API = 'http://localhost:3000';
// Change to:
const API = 'https://your-app.onrender.com';
```

---

## ✅ Features
- Add expenses with amount, category, note, date & time
- View all expenses in a list
- Filter by date range
- See total for any time period
- Delete any expense
- Color-coded by category
