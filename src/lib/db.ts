import Database from "better-sqlite3";
import path from "path";

// Initialize database
const dbPath = path.join(process.cwd(), "data", "cache.db");

// Ensure data directory exists
import fs from "fs";
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS btc_price (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE NOT NULL,
    price REAL NOT NULL,
    market_cap REAL,
    volume_24h REAL,
    percent_change_24h REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS stablecoin_supply (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE NOT NULL,
    total_market_cap REAL NOT NULL,
    usdt_market_cap REAL,
    usdc_market_cap REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tga_balance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE NOT NULL,
    balance REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS rrp_balance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE NOT NULL,
    balance REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    suggestion TEXT NOT NULL,
    email TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_btc_date ON btc_price(date);
  CREATE INDEX IF NOT EXISTS idx_stable_date ON stablecoin_supply(date);
  CREATE INDEX IF NOT EXISTS idx_tga_date ON tga_balance(date);
  CREATE INDEX IF NOT EXISTS idx_rrp_date ON rrp_balance(date);
  CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status);
`);

// BTC Price operations
export function getBtcPrice(date: string) {
  return db.prepare("SELECT * FROM btc_price WHERE date = ?").get(date) as {
    date: string;
    price: number;
    market_cap: number;
    volume_24h: number;
    percent_change_24h: number;
  } | undefined;
}

export function getBtcPriceRange(startDate: string, endDate: string) {
  return db.prepare(
    "SELECT * FROM btc_price WHERE date >= ? AND date <= ? ORDER BY date ASC"
  ).all(startDate, endDate) as Array<{
    date: string;
    price: number;
    market_cap: number;
    volume_24h: number;
    percent_change_24h: number;
  }>;
}

export function upsertBtcPrice(data: {
  date: string;
  price: number;
  market_cap?: number;
  volume_24h?: number;
  percent_change_24h?: number;
}) {
  return db.prepare(`
    INSERT INTO btc_price (date, price, market_cap, volume_24h, percent_change_24h)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      price = excluded.price,
      market_cap = excluded.market_cap,
      volume_24h = excluded.volume_24h,
      percent_change_24h = excluded.percent_change_24h
  `).run(data.date, data.price, data.market_cap ?? null, data.volume_24h ?? null, data.percent_change_24h ?? null);
}

// Stablecoin Supply operations
export function getStablecoinSupply(date: string) {
  return db.prepare("SELECT * FROM stablecoin_supply WHERE date = ?").get(date) as {
    date: string;
    total_market_cap: number;
    usdt_market_cap: number;
    usdc_market_cap: number;
  } | undefined;
}

export function getStablecoinSupplyRange(startDate: string, endDate: string) {
  return db.prepare(
    "SELECT * FROM stablecoin_supply WHERE date >= ? AND date <= ? ORDER BY date ASC"
  ).all(startDate, endDate) as Array<{
    date: string;
    total_market_cap: number;
    usdt_market_cap: number;
    usdc_market_cap: number;
  }>;
}

export function upsertStablecoinSupply(data: {
  date: string;
  total_market_cap: number;
  usdt_market_cap?: number;
  usdc_market_cap?: number;
}) {
  return db.prepare(`
    INSERT INTO stablecoin_supply (date, total_market_cap, usdt_market_cap, usdc_market_cap)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      total_market_cap = excluded.total_market_cap,
      usdt_market_cap = excluded.usdt_market_cap,
      usdc_market_cap = excluded.usdc_market_cap
  `).run(data.date, data.total_market_cap, data.usdt_market_cap ?? null, data.usdc_market_cap ?? null);
}

// TGA Balance operations
export function getTgaBalance(date: string) {
  return db.prepare("SELECT * FROM tga_balance WHERE date = ?").get(date) as {
    date: string;
    balance: number;
  } | undefined;
}

export function getTgaBalanceRange(startDate: string, endDate: string) {
  return db.prepare(
    "SELECT * FROM tga_balance WHERE date >= ? AND date <= ? ORDER BY date ASC"
  ).all(startDate, endDate) as Array<{
    date: string;
    balance: number;
  }>;
}

export function upsertTgaBalance(date: string, balance: number) {
  return db.prepare(`
    INSERT INTO tga_balance (date, balance)
    VALUES (?, ?)
    ON CONFLICT(date) DO UPDATE SET balance = excluded.balance
  `).run(date, balance);
}

// RRP Balance operations
export function getRrpBalance(date: string) {
  return db.prepare("SELECT * FROM rrp_balance WHERE date = ?").get(date) as {
    date: string;
    balance: number;
  } | undefined;
}

export function getRrpBalanceRange(startDate: string, endDate: string) {
  return db.prepare(
    "SELECT * FROM rrp_balance WHERE date >= ? AND date <= ? ORDER BY date ASC"
  ).all(startDate, endDate) as Array<{
    date: string;
    balance: number;
  }>;
}

export function upsertRrpBalance(date: string, balance: number) {
  return db.prepare(`
    INSERT INTO rrp_balance (date, balance)
    VALUES (?, ?)
    ON CONFLICT(date) DO UPDATE SET balance = excluded.balance
  `).run(date, balance);
}

// Get latest cached data
export function getLatestBtcPrice() {
  return db.prepare(
    "SELECT * FROM btc_price ORDER BY date DESC LIMIT 1"
  ).get() as { date: string; price: number; market_cap: number; percent_change_24h: number } | undefined;
}

export function getLatestStablecoinSupply() {
  return db.prepare(
    "SELECT * FROM stablecoin_supply ORDER BY date DESC LIMIT 1"
  ).get() as { date: string; total_market_cap: number; usdt_market_cap: number; usdc_market_cap: number } | undefined;
}

// Check if we need to refresh (older than X hours)
export function needsRefresh(table: string, maxAgeHours: number = 1): boolean {
  const result = db.prepare(`
    SELECT datetime(created_at) as created_at
    FROM ${table}
    ORDER BY created_at DESC
    LIMIT 1
  `).get() as { created_at: string } | undefined;

  if (!result) return true;

  const createdAt = new Date(result.created_at + "Z");
  const now = new Date();
  const ageMs = now.getTime() - createdAt.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  return ageHours > maxAgeHours;
}

// Suggestion operations
export function insertSuggestion(data: {
  suggestion: string;
  email?: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO suggestions (suggestion, email)
    VALUES (?, ?)
  `);
  return stmt.run(data.suggestion, data.email || null);
}

export function getSuggestions(status?: string) {
  if (status) {
    return db.prepare(
      "SELECT * FROM suggestions WHERE status = ? ORDER BY created_at DESC"
    ).all(status) as Array<{
      id: number;
      suggestion: string;
      email: string | null;
      status: string;
      created_at: string;
    }>;
  }
  return db.prepare(
    "SELECT * FROM suggestions ORDER BY created_at DESC"
  ).all() as Array<{
    id: number;
    suggestion: string;
    email: string | null;
    status: string;
    created_at: string;
  }>;
}

export function updateSuggestionStatus(id: number, status: string) {
  const stmt = db.prepare(`
    UPDATE suggestions SET status = ? WHERE id = ?
  `);
  return stmt.run(status, id);
}

export default db;
