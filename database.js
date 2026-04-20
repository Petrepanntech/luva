/* ============================================
   LUVA — Database Layer (sql.js - Pure JS SQLite)
   ============================================ */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'luva.db');

let db = null;

// Save DB to disk periodically
function saveToDisk() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (e) {
    console.error('DB save error:', e);
  }
}

// Auto-save every 30 seconds
setInterval(saveToDisk, 30000);

async function init() {
  const SQL = await initSqlJs();

  // Load existing DB or create new
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      p1_name TEXT NOT NULL,
      p1_emoji TEXT NOT NULL DEFAULT '😊',
      p2_name TEXT,
      p2_emoji TEXT,
      p1_score INTEGER NOT NULL DEFAULT 0,
      p2_score INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_active TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS game_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_code TEXT NOT NULL,
      game_name TEXT NOT NULL,
      game_icon TEXT NOT NULL,
      winner TEXT NOT NULL,
      played_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS love_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_code TEXT NOT NULL,
      from_player TEXT NOT NULL,
      text TEXT NOT NULL,
      mood TEXT NOT NULL DEFAULT '💖',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Indexes
  try { db.run(`CREATE INDEX IF NOT EXISTS idx_history_room ON game_history(room_code)`); } catch (e) { }
  try { db.run(`CREATE INDEX IF NOT EXISTS idx_notes_room ON love_notes(room_code)`); } catch (e) { }

  saveToDisk();
  console.log('  📦 Database initialized');
  return db;
}

// ---- Helper to get rows from a SELECT ----
function getAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function getOne(sql, params = []) {
  const rows = getAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function run(sql, params = []) {
  db.run(sql, params);
  saveToDisk();
}

// ---- Exported Functions ----
module.exports = {
  init,

  createRoom(code, name, emoji) {
    run(`INSERT INTO rooms (code, p1_name, p1_emoji) VALUES (?, ?, ?)`, [code, name, emoji]);
  },

  getRoom(code) {
    return getOne(`SELECT * FROM rooms WHERE code = ?`, [code]);
  },

  joinRoom(code, name, emoji) {
    run(`UPDATE rooms SET p2_name = ?, p2_emoji = ?, last_active = datetime('now') WHERE code = ?`, [name, emoji, code]);
    return getOne(`SELECT * FROM rooms WHERE code = ?`, [code]);
  },

  updateScores(code, p1Score, p2Score) {
    run(`UPDATE rooms SET p1_score = ?, p2_score = ?, last_active = datetime('now') WHERE code = ?`, [p1Score, p2Score, code]);
  },

  touchRoom(code) {
    run(`UPDATE rooms SET last_active = datetime('now') WHERE code = ?`, [code]);
  },

  addGameHistory(code, gameName, gameIcon, winner) {
    run(`INSERT INTO game_history (room_code, game_name, game_icon, winner) VALUES (?, ?, ?, ?)`, [code, gameName, gameIcon, winner]);
    return getAll(`SELECT * FROM game_history WHERE room_code = ? ORDER BY played_at DESC LIMIT 50`, [code]);
  },

  getGameHistory(code) {
    return getAll(`SELECT * FROM game_history WHERE room_code = ? ORDER BY played_at DESC LIMIT 50`, [code]);
  },

  addNote(code, fromPlayer, text, mood) {
    run(`INSERT INTO love_notes (room_code, from_player, text, mood) VALUES (?, ?, ?, ?)`, [code, fromPlayer, text, mood]);
    return getAll(`SELECT * FROM love_notes WHERE room_code = ? ORDER BY created_at DESC LIMIT 100`, [code]);
  },

  getNotes(code) {
    return getAll(`SELECT * FROM love_notes WHERE room_code = ? ORDER BY created_at DESC LIMIT 100`, [code]);
  },

  deleteNote(id, code) {
    run(`DELETE FROM love_notes WHERE id = ? AND room_code = ?`, [id, code]);
    return getAll(`SELECT * FROM love_notes WHERE room_code = ? ORDER BY created_at DESC LIMIT 100`, [code]);
  },

  cleanOldRooms() {
    try {
      run(`DELETE FROM game_history WHERE room_code IN (SELECT code FROM rooms WHERE last_active < datetime('now', '-30 days'))`);
      run(`DELETE FROM love_notes WHERE room_code IN (SELECT code FROM rooms WHERE last_active < datetime('now', '-30 days'))`);
      run(`DELETE FROM rooms WHERE last_active < datetime('now', '-30 days')`);
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  },

  close() {
    saveToDisk();
    if (db) db.close();
  }
};
