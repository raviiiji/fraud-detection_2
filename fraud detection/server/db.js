/**
 * FraudShield — SQLite Database Layer
 *
 * Provides persistent storage for accounts, transactions, alerts, and SAR reports.
 * Auto-seeds on first run with data from the frontend mock data module.
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcryptjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
// On Vercel, only /tmp is writable. Locally, use server directory.
const DB_PATH = process.env.VERCEL ? '/tmp/fraudshield.db' : join(__dirname, 'fraudshield.db');

let db;

export function initDatabase() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  createTables();
  seedIfEmpty();
  console.log('✅ SQLite database initialized');
  return db;
}

export function getDb() {
  return db;
}

// ── Schema ────────────────────────────────────────────────────────────────────

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'analyst',
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS accounts (
      accountId TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      jurisdiction TEXT,
      type TEXT,
      riskTier TEXT,
      riskScore INTEGER DEFAULT 0,
      balance REAL DEFAULT 0,
      pagerank REAL DEFAULT 0,
      betweenness REAL DEFAULT 0,
      clusterCoeff REAL DEFAULT 0,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS transactions (
      txId TEXT PRIMARY KEY,
      senderId TEXT,
      receiverId TEXT,
      senderName TEXT,
      senderJurisdiction TEXT,
      receiverName TEXT,
      receiverJurisdiction TEXT,
      amount REAL,
      currency TEXT,
      timestamp TEXT,
      typology TEXT,
      isFraud INTEGER DEFAULT 0,
      riskScore INTEGER DEFAULT 0,
      status TEXT DEFAULT 'Cleared',
      channel TEXT,
      deviceFingerprint TEXT,
      ipAddress TEXT,
      senderAccountType TEXT,
      FOREIGN KEY (senderId) REFERENCES accounts(accountId),
      FOREIGN KEY (receiverId) REFERENCES accounts(accountId)
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      severity TEXT NOT NULL,
      status TEXT DEFAULT 'New',
      title TEXT NOT NULL,
      reason TEXT,
      assignedTo TEXT,
      totalExposure REAL DEFAULT 0,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS alert_transactions (
      alertId TEXT,
      txId TEXT,
      FOREIGN KEY (alertId) REFERENCES alerts(id),
      FOREIGN KEY (txId) REFERENCES transactions(txId)
    );

    CREATE TABLE IF NOT EXISTS sar_reports (
      id TEXT PRIMARY KEY,
      status TEXT DEFAULT 'Draft',
      title TEXT NOT NULL,
      narrative TEXT,
      alertId TEXT,
      filingDate TEXT,
      analyst TEXT,
      totalAmount REAL DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (alertId) REFERENCES alerts(id)
    );

    CREATE INDEX IF NOT EXISTS idx_tx_timestamp ON transactions(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_tx_risk ON transactions(riskScore DESC);
    CREATE INDEX IF NOT EXISTS idx_tx_fraud ON transactions(isFraud);
    CREATE INDEX IF NOT EXISTS idx_accounts_risk ON accounts(riskScore DESC);
    CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
  `);
}

// ── Seed ──────────────────────────────────────────────────────────────────────

function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) AS cnt FROM accounts').get().cnt;
  if (count > 0) return;

  console.log('  Seeding database with initial data...');

  // Seed default auth users
  const insertUser = db.prepare('INSERT OR IGNORE INTO users (username, password, name, role) VALUES (?, ?, ?, ?)');
  const users = [
    ['admin', bcrypt.hashSync('admin123', 10), 'Admin User', 'admin'],
    ['analyst', bcrypt.hashSync('analyst123', 10), 'Sarah Chen', 'analyst'],
  ];
  for (const u of users) insertUser.run(...u);

  // Seed accounts and transactions using random generation (same logic as frontend)
  const jurisdictions = ['USA', 'UK', 'Cayman Islands', 'Switzerland', 'Singapore', 'Panama', 'Hong Kong', 'Luxembourg', 'BVI', 'Netherlands', 'Germany', 'UAE', 'India', 'Nigeria', 'Brazil'];
  const accountTypes = ['Personal', 'Business', 'Trust', 'Shell Corp', 'Offshore', 'Investment'];
  const riskTiers = ['Low', 'Medium', 'High', 'Critical'];
  const firstNames = ['James','Elena','Viktor','Mei','Carlos','Fatima','Raj','Olga','Hassan','Linnea','Diego','Priya','Chen','Amara','Sergei','Yuki','Liam','Zara','Andrei','Keiko','Marco','Anya','Tariq','Sofia','Ivan','Nadia','Omar','Julia','Ryu','Isla','Philippe','Leila','Nikolai','Catalina','Dmitri','Aisha','Mateo','Ingrid','Kofi','Mila','Rafael','Suki','Emir','Valentina','Hugo','Daria','Felix','Lena','Arjun','Nina'];
  const lastNames = ['Volkov','Chen','Martinez','Al-Rashid','Nakamura','Johansson','Okafor','Petrov','Gupta','Schmidt','Da Silva','Müller','Takahashi','Fernandez','Kim','Bergström','Patel','Andersen','Dubois','Novak','Kowalski','Weber','Santos','Ivanov','Hansen','Moreau','Bianchi','Yamamoto','Larsen','Fischer','Kozlov','Laurent','Mendez','Eriksson','Rossi','Tanaka','Lindberg','Popov','Delgado','Krüger','Sokolov','Richter','Torres','Svensson','Morozov','Bernard','Vargas','Nilsson','Abbas','Brunetti'];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));

  const insertAccount = db.prepare('INSERT INTO accounts (accountId, userId, name, jurisdiction, type, riskTier, riskScore, balance, pagerank, betweenness, clusterCoeff, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
  const accs = [];
  const insertMany = db.transaction(() => {
    for (let i = 0; i < 50; i++) {
      const risk = pick(riskTiers);
      const rs = risk === 'Critical' ? randInt(85,99) : risk === 'High' ? randInt(65,84) : risk === 'Medium' ? randInt(35,64) : randInt(5,34);
      const name = `${firstNames[i]} ${lastNames[i]}`;
      const accId = `ACC-${String(i+1).padStart(4,'0')}`;
      accs.push({ accId, name, jurisdiction: pick(jurisdictions), type: pick(accountTypes) });
      insertAccount.run(accId, `USR-${String(i+1).padStart(4,'0')}`, name, pick(jurisdictions), pick(accountTypes), risk, rs, +(Math.random()*5000000).toFixed(2), +(Math.random()*0.05).toFixed(4), +(Math.random()).toFixed(4), +(Math.random()).toFixed(4), new Date(2023, randInt(0,11), randInt(1,28)).toISOString());
    }
  });
  insertMany();

  // Transactions
  const typologies = ['Structuring','Smurfing','Layering','Round-Tripping','Phantom FDI','Normal','Normal','Normal','Normal','Normal'];
  const currencies = ['USD','EUR','GBP','CHF','SGD','AED','INR','BRL','JPY','HKD'];
  const channels = ['Mobile App','Web Portal','ATM','Branch','Wire Transfer','API'];

  const insertTx = db.prepare('INSERT INTO transactions (txId,senderId,receiverId,senderName,senderJurisdiction,receiverName,receiverJurisdiction,amount,currency,timestamp,typology,isFraud,riskScore,status,channel,deviceFingerprint,ipAddress,senderAccountType) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  const insertTxs = db.transaction(() => {
    for (let i = 0; i < 500; i++) {
      const si = randInt(0,49), ri = (si + randInt(1,49)) % 50;
      const typ = pick(typologies);
      const isFraud = typ !== 'Normal' ? 1 : 0;
      const rs = isFraud ? randInt(60,99) : randInt(2,45);
      const status = isFraud ? (rs > 80 ? 'Blocked' : 'Under Review') : 'Cleared';
      const amount = typ === 'Structuring' ? +(8000 + Math.random()*1999).toFixed(2) : typ === 'Smurfing' ? +(500 + Math.random()*4499).toFixed(2) : +(100 + Math.random()*499900).toFixed(2);
      const d = new Date(); d.setDate(d.getDate() - randInt(0,90)); d.setHours(randInt(0,23), randInt(0,59), randInt(0,59));
      insertTx.run(`TXN-${String(i+1).padStart(5,'0')}`, accs[si].accId, accs[ri].accId, accs[si].name, accs[si].jurisdiction, accs[ri].name, accs[ri].jurisdiction, amount, pick(currencies), d.toISOString(), typ, isFraud, rs, status, pick(channels), `DEV-${Math.random().toString(36).substring(2,10).toUpperCase()}`, `${randInt(10,220)}.${randInt(0,255)}.${randInt(0,255)}.${randInt(1,254)}`, accs[si].type);
    }
  });
  insertTxs();

  // Alerts
  const alertReasons = ['Circular payment pattern detected: A→B→C→A within 24 hours','85% overlap in device fingerprint with known smurfing ring','Sequential deposits below $10,000 threshold at 3 branches','Dormant account activated with high-value international transfer','PageRank anomaly: sudden 400% increase in centrality score','Cross-border layering: 7 jurisdictions in 48 hours','Phantom FDI: shell company with zero employees received $2.3M','Velocity violation: 23 transactions in 1-hour window','Beneficiary account linked to sanctioned entity via 3-hop path','Round-tripping: funds returned to origin via Cayman Islands trust'];
  const alertTitles = ['Structuring','Smurfing Ring','Layering Chain','Round-Trip','Phantom FDI','Velocity Violation','Network Anomaly','Dormant Activation','Cross-Border Pattern','Synthetic Identity'];
  const alertStatuses = ['New','Investigating','Escalated','Resolved'];

  const insertAlert = db.prepare('INSERT INTO alerts (id, severity, status, title, reason, assignedTo, totalExposure, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?)');
  const insertAlerts = db.transaction(() => {
    for (let i = 0; i < 30; i++) {
      const sev = i < 5 ? 'Critical' : i < 12 ? 'High' : i < 22 ? 'Medium' : 'Low';
      const d1 = new Date(); d1.setDate(d1.getDate() - randInt(0,30));
      const d2 = new Date(); d2.setDate(d2.getDate() - randInt(0,5));
      insertAlert.run(`ALT-${String(i+1).padStart(4,'0')}`, sev, pick(alertStatuses), `${sev} Alert: ${pick(alertTitles)} Detected`, alertReasons[i % alertReasons.length], pick(['Analyst Team A','Analyst Team B','Senior Investigator','Compliance Lead','Unassigned']), +(randInt(5000,1500000)).toFixed(2), d1.toISOString(), d2.toISOString());
    }
  });
  insertAlerts();

  console.log('  ✅ Seeded: 2 users, 50 accounts, 500 transactions, 30 alerts');
}

// ── Query Helpers ─────────────────────────────────────────────────────────────

export function getAccounts(limit = 50) {
  return db.prepare('SELECT * FROM accounts ORDER BY riskScore DESC LIMIT ?').all(limit);
}

export function getTransactions({ limit = 200, status, typology, search } = {}) {
  let query = 'SELECT * FROM transactions WHERE 1=1';
  const params = [];
  if (status) { query += ' AND status = ?'; params.push(status); }
  if (typology) { query += ' AND typology = ?'; params.push(typology); }
  if (search) { query += ' AND (txId LIKE ? OR senderName LIKE ? OR receiverName LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  query += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);
  return db.prepare(query).all(...params);
}

export function getAlerts({ severity, status } = {}) {
  let query = 'SELECT * FROM alerts WHERE 1=1';
  const params = [];
  if (severity) { query += ' AND severity = ?'; params.push(severity); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  query += ' ORDER BY CASE severity WHEN \'Critical\' THEN 0 WHEN \'High\' THEN 1 WHEN \'Medium\' THEN 2 ELSE 3 END';
  return db.prepare(query).all(...params);
}

export function updateAlertStatus(alertId, newStatus) {
  return db.prepare('UPDATE alerts SET status = ?, updatedAt = datetime(\'now\') WHERE id = ?').run(newStatus, alertId);
}

export function getSARReports() {
  return db.prepare('SELECT * FROM sar_reports ORDER BY createdAt DESC').all();
}

export function createSARReport(report) {
  return db.prepare('INSERT INTO sar_reports (id, status, title, narrative, alertId, filingDate, analyst, totalAmount) VALUES (?,?,?,?,?,?,?,?)').run(report.id, report.status, report.title, report.narrative, report.alertId, report.filingDate, report.analyst, report.totalAmount);
}

export function getStats() {
  const totalTx = db.prepare('SELECT COUNT(*) AS cnt FROM transactions').get().cnt;
  const fraudTx = db.prepare('SELECT COUNT(*) AS cnt FROM transactions WHERE isFraud = 1').get().cnt;
  const totalAccounts = db.prepare('SELECT COUNT(*) AS cnt FROM accounts').get().cnt;
  const highRisk = db.prepare("SELECT COUNT(*) AS cnt FROM accounts WHERE riskTier IN ('High','Critical')").get().cnt;
  const activeAlerts = db.prepare("SELECT COUNT(*) AS cnt FROM alerts WHERE status != 'Resolved'").get().cnt;
  const totalVolume = db.prepare('SELECT COALESCE(SUM(amount),0) AS total FROM transactions').get().total;
  return { totalTx, fraudTx, totalAccounts, highRisk, activeAlerts, totalVolume, fraudRate: totalTx ? +(fraudTx / totalTx * 100).toFixed(1) : 0 };
}

// Auth helpers
export function getUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

export function createUser(username, passwordHash, name, role) {
  return db.prepare('INSERT INTO users (username, password, name, role) VALUES (?,?,?,?)').run(username, passwordHash, name, role);
}

export function getAllUsers() {
  return db.prepare('SELECT id, username, name, role, createdAt FROM users').all();
}
