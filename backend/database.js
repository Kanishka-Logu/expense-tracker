const low    = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('expenses.json');
const db      = low(adapter);

db.defaults({ expenses: [], nextId: 1 }).write();

module.exports = db;