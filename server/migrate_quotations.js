const db = require('./db');

console.log("Migrating quotations table...");

try {
    db.prepare("ALTER TABLE quotations ADD COLUMN customer_nit TEXT").run();
    console.log("Added customer_nit");
} catch (e) { console.log("customer_nit likely exists"); }

try {
    db.prepare("ALTER TABLE quotations ADD COLUMN customer_contact TEXT").run();
    console.log("Added customer_contact");
} catch (e) { console.log("customer_contact likely exists"); }

try {
    db.prepare("ALTER TABLE quotations ADD COLUMN items_json TEXT").run();
    console.log("Added items_json");
} catch (e) { console.log("items_json likely exists"); }

try {
    db.prepare("ALTER TABLE quotations ADD COLUMN total REAL").run();
    console.log("Added total");
} catch (e) { console.log("total likely exists"); }

console.log("Migration complete.");
