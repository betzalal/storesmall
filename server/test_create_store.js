const db = require('./db');

try {
    const name = "Test Store";
    const location = "Test Location";
    const type = "Test Type";
    const address = "Test Address";
    const phone = "123456";
    const rent_status = "rent";
    const size_m2 = "100";
    const pros_cons = "None";
    const map_url = "http://maps.google.com";
    const other_details = "None";

    console.log("Attempting to insert store...");
    const info = db.prepare(`
        INSERT INTO stores (name, location, type, address, phone, rent_status, size_m2, pros_cons, map_url, other_details) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, location, type, address, phone, rent_status, size_m2, pros_cons, map_url, other_details);

    console.log("Store created successfully with ID:", info.lastInsertRowid);

    // Auto-seed inventory logic from index.js
    console.log("Attempting to seed inventory...");
    const products = db.prepare('SELECT id FROM products').all();
    products.forEach(p => {
        db.prepare('INSERT OR IGNORE INTO inventory (store_id, product_id, quantity) VALUES (?, ?, 0)').run(info.lastInsertRowid, p.id);
    });
    console.log("Inventory seeded.");

} catch (err) {
    console.error("FAILED to create store:");
    console.error(err);
}
