const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'sawalife.db');
const db = new Database(dbPath, { verbose: console.log });

// Create Tables
const schema = `
  CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT,
    type TEXT,
    config TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user', -- 'admin', 'user'
    store_id INTEGER,
    is_online INTEGER DEFAULT 0,
    last_seen TEXT,
    FOREIGN KEY(store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT,
    parent_id INTEGER,
    FOREIGN KEY(parent_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS inventory (
    store_id INTEGER,
    product_id INTEGER,
    quantity INTEGER DEFAULT 0,
    expiration_date TEXT,
    PRIMARY KEY (store_id, product_id),
    FOREIGN KEY(store_id) REFERENCES stores(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER,
    user_id INTEGER,
    customer_name TEXT,
    customer_nit TEXT,
    customer_whatsapp TEXT,
    delivery_type TEXT, -- 'store', 'shipping'
    total REAL,
    payment_method TEXT,
    notes TEXT, -- New column for sales notes/extras
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    unit_price REAL,
    FOREIGN KEY(sale_id) REFERENCES sales(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS access_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT,
    ip TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS quotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER,
    customer_name TEXT,
    customer_nit TEXT,
    customer_rs TEXT,
    customer_contact TEXT,
    valid_until TEXT,
    items_json TEXT,
    total REAL,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(store_id) REFERENCES stores(id)
  );
`;

db.exec(schema);

// Migration: Existing and new columns
try {
  const columns = db.prepare('PRAGMA table_info(sales)').all();
  const hasNotes = columns.some(c => c.name === 'notes');
  if (!hasNotes) {
    console.log('Migrating: Adding notes column to sales table');
    db.prepare('ALTER TABLE sales ADD COLUMN notes TEXT').run();
  }

  const prodColumns = db.prepare('PRAGMA table_info(products)').all();
  if (!prodColumns.some(c => c.name === 'parent_id')) {
    console.log('Migrating: Adding parent_id column to products table');
    db.prepare('ALTER TABLE products ADD COLUMN parent_id INTEGER').run();
  }

  const invColumns = db.prepare('PRAGMA table_info(inventory)').all();
  if (!invColumns.some(c => c.name === 'expiration_date')) {
    console.log('Migrating: Adding expiration_date column to inventory table');
    db.prepare('ALTER TABLE inventory ADD COLUMN expiration_date TEXT').run();
  }

  const prodColumns2 = db.prepare('PRAGMA table_info(products)').all();
  if (!prodColumns2.some(c => c.name === 'active')) {
    console.log('Migrating: Adding active column to products table');
    db.prepare('ALTER TABLE products ADD COLUMN active INTEGER DEFAULT 1').run();
  }

  const prodColumns3 = db.prepare('PRAGMA table_info(products)').all();
  if (!prodColumns3.some(c => c.name === 'image_url')) {
    console.log('Migrating: Adding image_url column to products table');
    db.prepare('ALTER TABLE products ADD COLUMN image_url TEXT').run();
  }
} catch (e) {
  console.error('Migration error:', e);
}

// Seed Data
const seed = () => {
  // Check if store exists
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(1);
  if (!store) {
    db.prepare('INSERT INTO stores (name, location, type) VALUES (?, ?, ?)').run('Tienda Central', 'Central', 'Principal');
  }

  // Check if admin exists
  const admin = db.prepare('SELECT * FROM users WHERE username = ?').get('betzalal');
  if (!admin) {
    const hash = bcrypt.hashSync('*MorrowindJustcause_2*', 10);
    db.prepare('INSERT INTO users (username, password, role, store_id) VALUES (?, ?, ?, ?)').run('betzalal', hash, 'admin', 1);
  }

  // Seed Products
  const products = [
    { code: 'E1', name: 'Filtros Stefany', price: 100 },
    { code: 'E2', name: 'Filtro "agua segura"', price: 150 },
    { code: 'E3', name: 'Filtro Tapp', price: 200 },
    { code: 'E4', name: 'Dispensers de agua', price: 500 },
    { code: 'E5', name: 'Botellones 20 litros', price: 50 },
    { code: 'E6', name: 'Botellones 5 litros', price: 20 },
    { code: 'E7', name: 'Grifos', price: 80 }
  ];

  const insertProduct = db.prepare('INSERT OR IGNORE INTO products (code, name, price) VALUES (@code, @name, @price)');
  const insertInventory = db.prepare('INSERT OR IGNORE INTO inventory (store_id, product_id, quantity) VALUES (?, ?, ?)');

  products.forEach(p => {
    insertProduct.run(p);
    const prod = db.prepare('SELECT id FROM products WHERE code = ?').get(p.code);
    insertInventory.run(1, prod.id, 100); // Initial stock 100 for testing
  });
};

seed();

module.exports = db;
