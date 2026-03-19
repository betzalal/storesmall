const db = require('./server/db');

console.log("Checking 'stores' table info:");
const storesInfo = db.prepare("PRAGMA table_info(stores)").all();
console.log(storesInfo.map(c => c.name));

console.log("\nChecking 'sales' table info:");
const salesInfo = db.prepare("PRAGMA table_info(sales)").all();
console.log(salesInfo.map(c => c.name));

console.log("\nChecking 'users' table info:");
const usersInfo = db.prepare("PRAGMA table_info(users)").all();
console.log(usersInfo.map(c => c.name));
