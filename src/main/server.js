const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db;
let serverInstance;

function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'pos_data.db');
  db = new Database(dbPath);

  // Inisialisasi tabel produk
  db.exec(`
    CREATE TABLE IF NOT EXISTS produk (
      id TEXT PRIMARY KEY,
      nama TEXT NOT NULL,
      harga REAL NOT NULL,
      stok INTEGER DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
  `);
}

function startServer(port = 3001) {
  initDatabase();
  const api = express();
  api.use(express.json());

  // Izinkan request dari file lokal renderer
  api.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

  // Ambil semua data produk
  api.get('/api/produk', (req, res) => {
    const rows = db.prepare('SELECT * FROM produk ORDER BY updated_at DESC').all();
    res.json(rows);
  });

  // Tambah / Update produk
  api.post('/api/produk', (req, res) => {
    const { id, nama, harga, stok } = req.body;
    const stmt = db.prepare(`
      INSERT INTO produk (id, nama, harga, stok, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        nama = excluded.nama,
        harga = excluded.harga,
        stok = excluded.stok,
        updated_at = excluded.updated_at
    `);
    
    stmt.run(id || Date.now().toString(), nama, harga, stok || 0, Date.now());
    res.json({ success: true });
  });

  serverInstance = api.listen(port, '127.0.0.1', () => {
    console.log(`[API] Server lokal aktif di port ${port}`);
  });
}

function stopServer() {
  if (serverInstance) serverInstance.close();
  if (db) db.close();
}

module.exports = { startServer, stopServer };
