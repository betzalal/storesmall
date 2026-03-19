const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'sawalife_secret_key_change_in_prod';

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

// Middleware to update Last Seen
app.use((req, res, next) => {
    const token = req.headers['authorization'];
    if (token) {
        try {
            const decoded = jwt.verify(token.split(' ')[1], SECRET_KEY);
            const now = new Date().toISOString();
            const ip = req.ip || req.connection.remoteAddress;
            db.prepare('UPDATE users SET last_seen = ?, is_online = 1 WHERE id = ?').run(now, decoded.id);
            req.user = decoded; // Attach user to request
            // Also maybe log access occasionally? For now, we log specific actions
        } catch (e) {
            // Ignore invalid tokens here
        }
    }
    next();
});

// Middleware to verify Admin role
const verifyAdmin = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'No token provided' });

    try {
        const decoded = jwt.verify(token.split(' ')[1], SECRET_KEY);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin only.' });
        }
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Auth Routes
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, role: user.role, store_id: user.store_id }, SECRET_KEY, { expiresIn: '12h' });

    // Log login
    const ip = req.ip || req.connection.remoteAddress;
    db.prepare('INSERT INTO access_logs (user_id, action, ip) VALUES (?, ?, ?)').run(user.id, 'LOGIN', ip);
    db.prepare('UPDATE users SET is_online = 1 WHERE id = ?').run(user.id);

    res.json({ token, user: { id: user.id, username: user.username, role: user.role, store_id: user.store_id } });
});

app.post('/api/logout', (req, res) => {
    // Client should discard token. We just mark offline if we know who it is.
    const { userId } = req.body;
    if (userId) {
        db.prepare('UPDATE users SET is_online = 0 WHERE id = ?').run(userId);
    }
    res.json({ success: true });
});

// User Management (Admin)
app.get('/api/users', verifyAdmin, (req, res) => {
    // Check admin role (middleware TODO)
    const storeId = req.query.store_id;
    let query = 'SELECT id, username, role, store_id, is_online, last_seen FROM users';
    if (storeId) query += ` WHERE store_id = ${storeId}`;

    const users = db.prepare(query).all();
    res.json(users);
});

app.post('/api/users', verifyAdmin, (req, res) => {
    const { username, password, role, store_id } = req.body;
    const hash = bcrypt.hashSync(password, 10);
    try {
        const info = db.prepare('INSERT INTO users (username, password, role, store_id) VALUES (?, ?, ?, ?)').run(username, hash, role || 'user', store_id || 1);
        res.json({ id: info.lastInsertRowid });
    } catch (err) {
        res.status(400).json({ error: 'Username likely exists' });
    }
});

app.delete('/api/users/:id', verifyAdmin, (req, res) => {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

app.put('/api/users/:id/password', verifyAdmin, (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.params.id);
    res.json({ success: true });
});

// Logs
app.get('/api/logs', verifyAdmin, (req, res) => {
    const logs = db.prepare('SELECT access_logs.*, users.username FROM access_logs LEFT JOIN users ON access_logs.user_id = users.id ORDER BY timestamp DESC LIMIT 100').all();
    res.json(logs);
});

app.delete('/api/logs', verifyAdmin, (req, res) => {
    db.prepare('DELETE FROM access_logs').run();
    res.json({ success: true });
});

// Stores Management
app.get('/api/stores', (req, res) => {
    const stores = db.prepare('SELECT * FROM stores').all();
    res.json(stores);
});

app.post('/api/stores', verifyAdmin, (req, res) => {
    const { name, location, type, address, phone, rent_status, size_m2, pros_cons, map_url, other_details } = req.body;
    try {
        const info = db.prepare(`
            INSERT INTO stores (name, location, type, address, phone, rent_status, size_m2, pros_cons, map_url, other_details) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(name, location, type, address, phone, rent_status, size_m2, pros_cons, map_url, other_details);

        // Auto-seed inventory for new store with 0 stock
        const products = db.prepare('SELECT id FROM products').all();
        products.forEach(p => {
            db.prepare('INSERT OR IGNORE INTO inventory (store_id, product_id, quantity) VALUES (?, ?, 0)').run(info.lastInsertRowid, p.id);
        });

        res.json({ id: info.lastInsertRowid });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create store' });
    }
});

app.delete('/api/stores/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;
    try {
        const deleteStore = db.transaction(() => {
            // Unlink users, sales, quotations (set store_id to NULL)
            db.prepare('UPDATE users SET store_id = NULL WHERE store_id = ?').run(id);
            db.prepare('UPDATE sales SET store_id = NULL WHERE store_id = ?').run(id);
            db.prepare('UPDATE quotations SET store_id = NULL WHERE store_id = ?').run(id);

            // Delete inventory (strict dependency)
            db.prepare('DELETE FROM inventory WHERE store_id = ?').run(id);

            // Delete store
            return db.prepare('DELETE FROM stores WHERE id = ?').run(id);
        });

        const info = deleteStore();

        if (info.changes === 0) return res.status(404).json({ error: 'Store not found' });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete store' });
    }
});

// Products & Inventory Advanced
app.get('/api/products', (req, res) => {
    const storeId = req.query.store_id || 1;
    const products = db.prepare(`
        SELECT p.*, IFNULL(i.quantity, 0) as quantity, i.expiration_date 
        FROM products p 
        LEFT JOIN inventory i ON p.id = i.product_id AND i.store_id = ?
        WHERE IFNULL(p.active, 1) = 1
    `).all(storeId);
    res.json(products);
});

app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    try {
        db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(id);
        db.prepare('UPDATE products SET active = 0 WHERE parent_id = ?').run(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.post('/api/products', (req, res) => {
    const { name, price, category, parent_id } = req.body;
    // Auto-generate Code: Find max E number
    const last = db.prepare("SELECT code FROM products WHERE code LIKE 'E%' ORDER BY length(code) DESC, code DESC LIMIT 1").get();
    let nextCode = 'E1';
    if (last) {
        const num = parseInt(last.code.substring(1));
        nextCode = 'E' + (num + 1);
    }

    try {
        const info = db.prepare('INSERT INTO products (code, name, price, category, parent_id) VALUES (?, ?, ?, ?, ?)').run(nextCode, name, price, category, parent_id || null);

        // Add 0 stock to all stores
        const stores = db.prepare('SELECT id FROM stores').all();
        stores.forEach(s => {
            db.prepare('INSERT OR IGNORE INTO inventory (store_id, product_id, quantity) VALUES (?, ?, 0)').run(s.id, info.lastInsertRowid);
        });

        res.json({ id: info.lastInsertRowid, code: nextCode });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.post('/api/products/:id/image', (req, res) => {
    const { id } = req.params;
    const { image_data } = req.body;
    
    if (!image_data) return res.status(400).json({ error: 'No image data' });

    try {
        const matches = image_data.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return res.status(400).json({ error: 'Invalid base64 format' });
        }
        
        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const filename = `product_${id}_${Date.now()}.${ext}`;
        const filepath = path.join(uploadDir, filename);
        
        fs.writeFileSync(filepath, buffer);
        
        const imageUrl = `/uploads/${filename}`;
        db.prepare('UPDATE products SET image_url = ? WHERE id = ?').run(imageUrl, id);
        
        res.json({ success: true, image_url: imageUrl });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save image' });
    }
});

app.post('/api/products/price', (req, res) => {
    const { id, price } = req.body;
    db.prepare('UPDATE products SET price = ? WHERE id = ?').run(price, id);
    res.json({ success: true });
});

app.post('/api/inventory/update', (req, res) => {
    // Admin only
    const { store_id, product_id, quantity, expiration_date } = req.body; // New absolute quantity
    const info = db.prepare('INSERT INTO inventory (store_id, product_id, quantity, expiration_date) VALUES (?, ?, ?, ?) ON CONFLICT(store_id, product_id) DO UPDATE SET quantity = excluded.quantity, expiration_date = excluded.expiration_date').run(store_id, product_id, quantity, expiration_date || null);
    res.json(info);
});

// Sales & History
app.get('/api/sales/months', (req, res) => {
    try {
        const months = db.prepare(`
            SELECT DISTINCT strftime('%Y-%m', timestamp) as month 
            FROM sales 
            ORDER BY month DESC
        `).all();
        res.json(months.map(m => m.month).filter(Boolean));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed' });
    }
});

app.get('/api/sales', (req, res) => {
    const storeId = req.query.store_id;
    const month = req.query.month;
    let query = `
        SELECT s.*, u.username as seller 
        FROM sales s 
        LEFT JOIN users u ON s.user_id = u.id 
    `;
    
    const conditions = [];
    if (storeId) conditions.push(`s.store_id = ${storeId}`);
    if (month) conditions.push(`s.timestamp LIKE '${month}%'`);
    if (req.user && req.user.role !== 'admin') {
        conditions.push(`s.user_id = ${req.user.id}`);
    }
    
    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY s.timestamp DESC LIMIT 100';

    const sales = db.prepare(query).all();

    // Fetch items for each sale
    const getItems = db.prepare(`
        SELECT si.quantity, si.unit_price as price, p.name, p.code 
        FROM sale_items si 
        LEFT JOIN products p ON si.product_id = p.id 
        WHERE si.sale_id = ?
    `);

    for (const sale of sales) {
        sale.items = getItems.all(sale.id);
    }

    res.json(sales);
});

app.post('/api/sales', (req, res) => {
    const { store_id, user_id, customer, items, payment_method, total, notes } = req.body;

    // Transaction
    const makeSale = db.transaction(() => {
        const sale = db.prepare(`
            INSERT INTO sales (store_id, user_id, customer_name, customer_nit, customer_whatsapp, delivery_type, total, payment_method, notes)
            VALUES (@store_id, @user_id, @name, @nit, @whatsapp, @delivery, @total, @method, @notes)
        `).run({
            store_id, user_id,
            name: customer.name, nit: customer.nit, whatsapp: customer.whatsapp, delivery: customer.delivery,
            total, method: payment_method, notes: notes || ''
        });

        const saleId = sale.lastInsertRowid;

        for (const item of items) {
            db.prepare('INSERT INTO sale_items (sale_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)').run(saleId, item.id, item.quantity, item.price);

            // Deduct stock
            db.prepare('UPDATE inventory SET quantity = quantity - ? WHERE store_id = ? AND product_id = ?').run(item.quantity, store_id, item.id);
        }
        return saleId;
    });

    try {
        const saleId = makeSale();
        res.json({ success: true, saleId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Transaction failed' });
    }
});

app.delete('/api/sales/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;
    try {
        // We delete items first, then sale. 
        // Note: Inventory is NOT restored automatically based on current requirements.
        db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(id);
        const info = db.prepare('DELETE FROM sales WHERE id = ?').run(id);

        if (info.changes === 0) return res.status(404).json({ error: 'Sale not found' });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete sale' });
    }
});

// Quotations
// Quotations
app.get('/api/quotations/next-number', (req, res) => {
    try {
        const last = db.prepare('SELECT MAX(id) as lastId FROM quotations').get();
        const nextId = (last.lastId || 0) + 1;
        res.json({ nextId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to get next number' });
    }
});

app.post('/api/quotations', (req, res) => {
    console.log('[DEBUG] Quotation POST received:', JSON.stringify(req.body, null, 2));
    const { store_id, customer, items, total } = req.body;
    try {
        if (!store_id) throw new Error('Missing store_id');
        if (!customer) throw new Error('Missing customer data');

        const info = db.prepare(`
            INSERT INTO quotations (store_id, customer_name, customer_nit, customer_rs, customer_contact, valid_until, items_json, total) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(store_id, customer.name, customer.nit, customer.rs || '', customer.contact, customer.validUntil, JSON.stringify(items), total);

        console.log('[DEBUG] Quotation inserted, ID:', info.lastInsertRowid);
        res.json({ id: info.lastInsertRowid });
    } catch (err) {
        console.error('[ERROR] Failed to save quotation:', err.message);
        res.status(500).json({ error: 'Error interno: ' + err.message });
    }
});

app.put('/api/quotations/:id', (req, res) => {
    const { id } = req.params;
    const { customer, items, total } = req.body;
    try {
        const info = db.prepare(`
            UPDATE quotations 
            SET customer_name = ?, customer_nit = ?, customer_rs = ?, customer_contact = ?, items_json = ?, total = ?
            WHERE id = ?
        `).run(customer.name, customer.nit, customer.rs || '', customer.contact, JSON.stringify(items), total, id);

        if (info.changes === 0) return res.status(404).json({ error: 'Quotation not found' });
        res.json({ success: true, id });
    } catch (err) {
        console.error('[ERROR] Failed to update quotation:', err.message);
        res.status(500).json({ error: 'Error interno: ' + err.message });
    }
});

app.get('/api/quotations', (req, res) => {
    const storeId = req.query.store_id; // Optional filter
    try {
        let query = `
            SELECT q.*, s.name as store_name 
            FROM quotations q 
            LEFT JOIN stores s ON q.store_id = s.id 
        `;
        // Admin sees all, or filter by store if needed. For now, fetch all descending.
        query += ' ORDER BY q.timestamp DESC LIMIT 100';

        const list = db.prepare(query).all();
        res.json(list);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch quotations' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log("!!! SERVER UPDATE LOADED: QUOTATIONS ROUTE READY !!!");
});
