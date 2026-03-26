const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const os = require('os');

const Database = require('better-sqlite3');
const { AsyncLocalStorage } = require('async_hooks');
const asyncLocalStorage = new AsyncLocalStorage();

const db = new Proxy({}, {
    get(target, prop) {
        const currentDb = asyncLocalStorage.getStore();
        if (!currentDb) {
            console.error('No database context for this request');
            return undefined;
        }
        const val = currentDb[prop];
        return typeof val === 'function' ? val.bind(currentDb) : val;
    }
});

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || require('crypto').randomBytes(32).toString('hex');

// Security Headers
app.use(helmet({
    contentSecurityPolicy: false // Deactivates basic CSP so frontend doesn't break locally/cross-origin easily, but adds XSS/Frame/HSTS protections.
}));

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Rate Limiters
const recoverLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per window
    message: { error: 'Demasiados intentos de recuperación. Intente de nuevo en 15 minutos.' }
});

const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 Hour
    max: 15, // Limit each IP to 15 sync-uploads per hour
    message: { error: 'Rebasaste el límite de subidas por hora para proteger contra Spam.' }
});

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

const sessionsDir = path.join(__dirname, 'sessions');
if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir);
}

const backupsDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir);
}

// Cleanup backups older than 15 days (runs once a day)
setInterval(() => {
    fs.readdir(backupsDir, (err, files) => {
        if (err) return;
        const now = Date.now();
        const MAX_AGE = 15 * 24 * 60 * 60 * 1000;
        files.forEach(file => {
            const filePath = path.join(backupsDir, file);
            fs.stat(filePath, (err, stats) => {
                if (!err && (now - stats.mtimeMs > MAX_AGE)) {
                    fs.unlink(filePath, () => {});
                }
            });
        });
    });
}, 24 * 60 * 60 * 1000);

const sessionConnections = {};
const pendingConflicts = {};

function getDbConnection(sessionId) {
    if (sessionConnections[sessionId]) return sessionConnections[sessionId];
    const dbPath = path.join(sessionsDir, `${sessionId}.db`);
    if (!fs.existsSync(dbPath)) return null;
    const connection = new Database(dbPath, { verbose: console.log });
    sessionConnections[sessionId] = connection;
    return connection;
}

app.use((req, res, next) => {
    if (req.path.startsWith('/uploads')) return next();
    
    const rawSessionId = req.headers['x-session-id'] || req.query.session_id;
    let sessionId = null;
    
    // Global Security Sanitization (Path Traversal Protection)
    if (rawSessionId) {
        if (!/^[a-zA-Z0-9_-]+$/.test(rawSessionId)) {
            return res.status(400).json({ error: 'Formato de Session ID inválido o peligroso.' });
        }
        sessionId = rawSessionId;
    }

    if (req.path === '/api/system/sync-upload' || req.path === '/api/system/network-info') {
        return next();
    }

    if (!sessionId) {
        return res.status(401).json({ error: 'No Session ID provided' });
    }

    const connection = getDbConnection(sessionId);
    if (!connection) {
        if (req.path === '/api/system/status' || req.path === '/api/system/sync-download' || req.path === '/api/system/recover') {
            return next(); 
        }
        return res.status(404).json({ error: 'Session database not loaded', needs_sync: true });
    }

    asyncLocalStorage.run(connection, () => {
        next();
    });
});

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

// System Status and Setup
app.get('/api/system/network-info', (req, res) => {
    try {
        let localIp = '127.0.0.1';
        try {
            const nets = os.networkInterfaces();
            for (const name of Object.keys(nets)) {
                for (const net of nets[name]) {
                    if (net.family === 'IPv4' && !net.internal) {
                        localIp = net.address;
                        break;
                    }
                }
                if (localIp !== '127.0.0.1') break;
            }
        } catch(e) { console.error(e); }
        
        let status = 'waiting_data';
        const raws = req.headers['x-session-id'] || req.query.session_id;
        const sID = raws && /^[a-zA-Z0-9_-]+$/.test(raws) ? raws : null;
        
        if (sID) {
            const connection = getDbConnection(sID);
            if (connection) {
                try {
                    const check = connection.prepare('SELECT count(*) as count FROM users').get();
                    if (check && check.count > 0) status = 'ready';
                } catch (e) { }
            }
        }

        return res.json({ ip: localIp, port: PORT, status });
    } catch(err) {
        console.error('network-info error:', err);
        return res.status(500).json({ error: 'Internal Error' });
    }
});

app.post('/api/system/sync-upload', uploadLimiter, express.raw({ type: '*/*', limit: '50mb' }), (req, res) => {
    const rawSessionId = req.headers['x-session-id'] || req.query.session_id;
    if (!rawSessionId || !/^[a-zA-Z0-9_-]+$/.test(rawSessionId)) return res.status(400).json({ error: 'Invalid or missing session specified' });
    const sessionId = rawSessionId;

    try {
        if (!req.body || req.body.length === 0) {
            return res.status(400).json({ error: 'No file provided' });
        }
        
        if (sessionConnections[sessionId]) {
            sessionConnections[sessionId].close();
            delete sessionConnections[sessionId];
        }

        const dbPath = path.join(sessionsDir, `${sessionId}.db`);
        fs.writeFileSync(dbPath, req.body);

        // Backup mechanism: open DB, find users, save copies and detect conflicts
        try {
            const tempDb = new Database(dbPath);
            const userRow = tempDb.prepare("SELECT username FROM users WHERE role='admin' LIMIT 1").get() || tempDb.prepare("SELECT username FROM users LIMIT 1").get();
            
            if (userRow && userRow.username) {
                const username = userRow.username;
                const uploadedSales = tempDb.prepare('SELECT count(*) as count FROM sales').get().count;
                tempDb.close();
                
                const validFilename = username.replace(/[^a-zA-Z0-9]/g, '_');
                const backupPath = path.join(backupsDir, `${validFilename}.db`);
                
                if (fs.existsSync(backupPath)) {
                    // Check backup sales to avoid unintentional overwrite
                    try {
                        const backupDb = new Database(backupPath);
                        const backupSales = backupDb.prepare('SELECT count(*) as count FROM sales').get().count;
                        backupDb.close();
                        
                        if (backupSales > uploadedSales) {
                            pendingConflicts[sessionId] = { username, backupSales, uploadedSales, uploadedDbPath: dbPath, backupPath };
                            return res.json({ success: true, message: 'Upload paused. Conflict detected.' });
                        }
                    } catch (e) { console.error('Error reading backup DB for conflict', e); }
                }
                
                fs.copyFileSync(dbPath, backupPath);
            } else {
                tempDb.close();
            }
        } catch (backupErr) {
            console.error('Backup failed during sync', backupErr);
        }

        res.json({ success: true, message: 'Database updated successfully' });
    } catch (error) {
        console.error('Error in sync-upload:', error);
        res.status(500).json({ error: 'Failed to sync database' });
    }
});

app.post('/api/system/resolve-conflict', (req, res) => {
    const { session_id, action } = req.body;
    if (!session_id || !/^[a-zA-Z0-9_-]+$/.test(session_id) || !action || !pendingConflicts[session_id]) {
        return res.status(400).json({ error: 'No active conflict found for this session' });
    }
    
    const conflict = pendingConflicts[session_id];
    
    try {
        if (sessionConnections[session_id]) {
            sessionConnections[session_id].close();
            delete sessionConnections[session_id];
        }

        if (action === 'recover') {
            fs.copyFileSync(conflict.backupPath, conflict.uploadedDbPath);
        } else if (action === 'overwrite') {
            fs.copyFileSync(conflict.uploadedDbPath, conflict.backupPath);
        }
        
        delete pendingConflicts[session_id];
        res.json({ success: true });
    } catch (e) {
        console.error('Error resolving conflict', e);
        res.status(500).json({ error: 'Conflict resolution failed' });
    }
});

app.post('/api/system/recover', recoverLimiter, (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });

    const validFilename = username.replace(/[^a-zA-Z0-9]/g, '_');
    const backupPath = path.join(backupsDir, `${validFilename}.db`);

    if (!fs.existsSync(backupPath)) {
        return res.status(404).json({ error: 'No se encontró un respaldo (15 días de inactividad o usuario erróneo)' });
    }

    try {
        const tempDb = new Database(backupPath);
        const user = tempDb.prepare('SELECT * FROM users WHERE username = ?').get(username);
        
        if (!user || !bcrypt.compareSync(password, user.password)) {
            tempDb.close();
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }
        
        tempDb.close();

        // Generate a new session for the recovered DB
        const newSessionId = require('crypto').randomBytes(16).toString('hex');
        const newSessionPath = path.join(sessionsDir, `${newSessionId}.db`);
        
        // Copy the backup into the new active session
        fs.copyFileSync(backupPath, newSessionPath);

        res.json({ success: true, session_id: newSessionId });
    } catch (e) {
        console.error('Recovery error', e);
        res.status(500).json({ error: 'Falló la recuperación' });
    }
});

app.get('/api/system/sync-download', (req, res) => {
    const rawSessionId = req.headers['x-session-id'] || req.query.session_id;
    if (!rawSessionId || !/^[a-zA-Z0-9_-]+$/.test(rawSessionId)) return res.status(400).json({ error: 'Invalid or missing session specified' });
    const sessionId = rawSessionId;

    const dbPath = path.join(sessionsDir, `${sessionId}.db`);
    if (fs.existsSync(dbPath)) {
        res.download(dbPath, 'empresa.db', (err) => {
            if (!err) {
                if (sessionConnections[sessionId]) {
                    sessionConnections[sessionId].close();
                    delete sessionConnections[sessionId];
                }
                setTimeout(() => {
                    try { fs.unlinkSync(dbPath); } catch (e) {}
                }, 1000);
            }
        });
    } else {
        res.status(404).json({ error: 'Database not found' });
    }
});

app.get('/api/system/status', (req, res) => {
    const rawSessionId = req.headers['x-session-id'] || req.query.session_id;
    if (!rawSessionId || !/^[a-zA-Z0-9_-]+$/.test(rawSessionId)) return res.json({ isSetupComplete: false });
    const sessionId = rawSessionId;
    
    if (pendingConflicts[sessionId]) {
        return res.json({ 
            isSetupComplete: false, 
            hasConflict: true, 
            conflictData: pendingConflicts[sessionId] 
        });
    }
    
    const connection = getDbConnection(sessionId);
    if (!connection) return res.json({ isSetupComplete: false });
    
    try {
        const userCount = connection.prepare('SELECT count(*) as count FROM users').get();
        res.json({ isSetupComplete: userCount.count > 0 });
    } catch (e) {
        res.json({ isSetupComplete: false });
    }
});

app.post('/api/system/setup', (req, res) => {
    const { companyName, tagline, logoData, username, password } = req.body;
    if (!username || !password || !companyName) {
        return res.status(400).json({ error: 'Faltan campos obligatorios (Nombre, Usuario, Contraseña).' });
    }

    try {
        const userCount = db.prepare('SELECT count(*) as count FROM users').get();
        if (userCount.count > 0) {
            return res.status(403).json({ error: 'System already setup' });
        }

        db.transaction(() => {
            const setConfig = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
            setConfig.run('companyName', companyName);
            setConfig.run('companyTagline', tagline || '');

            let logoUrl = '/assets/logo.jpg';
            if (logoData && typeof logoData === 'string' && logoData.startsWith('data:image/')) {
                const matches = logoData.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                    const buffer = Buffer.from(matches[2], 'base64');
                    const safeName = require('crypto').randomBytes(8).toString('hex');
                    const filename = `logo_${safeName}.${ext}`;
                    fs.writeFileSync(path.join(uploadDir, filename), buffer);
                    logoUrl = `/uploads/${filename}`;
                }
            }
            setConfig.run('logoUrl', logoUrl);

            const storeInfo = db.prepare('INSERT INTO stores (name, location, type) VALUES (?, ?, ?)').run('Tienda Principal', 'Central', 'Matriz');
            const storeId = storeInfo.lastInsertRowid;

            const hash = bcrypt.hashSync(password, 10);
            db.prepare('INSERT INTO users (username, password, role, store_id) VALUES (?, ?, ?, ?)').run(username, hash, 'admin', storeId);
        })();

        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        const token = jwt.sign({ id: user.id, role: user.role, store_id: user.store_id }, SECRET_KEY, { expiresIn: '12h' });
        
        res.json({ success: true, token, user: { id: user.id, username: user.username, role: user.role, store_id: user.store_id } });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed during setup' });
    }
});

app.get('/api/system/company', (req, res) => {
    try {
        const getSetting = (key, defaultVal) => {
            const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
            return row ? row.value : defaultVal;
        };

        res.json({
            name: getSetting('companyName', 'SAWALIFE'),
            tagline: getSetting('companyTagline', 'Filtros purificadores de agua'),
            logoUrl: getSetting('logoUrl', '/assets/logo.jpg')
        });
    } catch (e) {
        res.json({ name: 'SAWALIFE', tagline: 'Filtros purificadores de agua', logoUrl: '/assets/logo.jpg' });
    }
});

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

// Quotation Templates
app.get('/api/quotations/templates', (req, res) => {
    try {
        const templates = db.prepare('SELECT * FROM quote_item_templates').all();
        res.json(templates);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

app.post('/api/quotations/templates', (req, res) => {
    const { label, description } = req.body;
    try {
        const info = db.prepare('INSERT INTO quote_item_templates (label, description) VALUES (?, ?)').run(label, description);
        res.json({ id: info.lastInsertRowid, label, description });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save template' });
    }
});

app.delete('/api/quotations/templates/:id', (req, res) => {
    const { id } = req.params;
    try {
        db.prepare('DELETE FROM quote_item_templates WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete template' });
    }
});

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

// Serve static frontend files in production
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
        return res.status(404).json({ error: 'Route not found' });
    }
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log("!!! SERVER UPDATE LOADED: QUOTATIONS ROUTE READY !!!");
});
