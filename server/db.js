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
    address TEXT,
    phone TEXT,
    rent_status TEXT,
    size_m2 TEXT,
    pros_cons TEXT,
    map_url TEXT,
    other_details TEXT,
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

  CREATE TABLE IF NOT EXISTS quote_item_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    description TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
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

  const storeColumns = db.prepare('PRAGMA table_info(stores)').all();
  if (!storeColumns.some(c => c.name === 'address')) {
    console.log('Migrating: Adding missing detailed columns to stores table');
    db.prepare('ALTER TABLE stores ADD COLUMN address TEXT').run();
    db.prepare('ALTER TABLE stores ADD COLUMN phone TEXT').run();
    db.prepare('ALTER TABLE stores ADD COLUMN rent_status TEXT').run();
    db.prepare('ALTER TABLE stores ADD COLUMN size_m2 TEXT').run();
    db.prepare('ALTER TABLE stores ADD COLUMN pros_cons TEXT').run();
    db.prepare('ALTER TABLE stores ADD COLUMN map_url TEXT').run();
    db.prepare('ALTER TABLE stores ADD COLUMN other_details TEXT').run();
  }
} catch (e) {
  console.error('Migration error:', e);
}

module.exports = db;
