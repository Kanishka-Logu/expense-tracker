const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('expenses.db');

db.run(`
  CREATE TABLE IF NOT EXISTS expenses (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    amount     REAL    NOT NULL,
    category   TEXT    NOT NULL,
    note       TEXT,
    date       TEXT    NOT NULL,
    time       TEXT    NOT NULL,
    created_at TEXT    DEFAULT (datetime('now'))
  )
`);

module.exports = db;