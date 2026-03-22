/**
 * FraudShield — Vercel Serverless API
 *
 * Single Express app exported as a Vercel serverless function.
 * Handles: Auth, Transactions, Alerts, Analytics, SAR, Health, Graph, ML Score
 *
 * NOTE: SSE streaming is NOT supported on Vercel serverless.
 * The frontend falls back to polling in production.
 */

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { initDatabase, getAccounts, getTransactions, getAlerts, updateAlertStatus, getStats, getSARReports, createSARReport } from '../server/db.js';
import { registerAuthRoutes, requireAuth, requireRole } from '../server/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

// ── Init DB on cold start ─────────────────────────────────────────
let dbReady = false;
function ensureDB() {
  if (!dbReady) {
    initDatabase();
    dbReady = true;
  }
}

// ── Neo4j (optional, set NEO4J_URI env var in Vercel) ─────────────
let neo4jAvailable = false;
let driver = null;

async function getDriver() {
  if (driver) return driver;
  if (!process.env.NEO4J_URI) return null;
  try {
    const neo4j = (await import('neo4j-driver')).default;
    driver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || '')
    );
    await driver.verifyConnectivity();
    neo4jAvailable = true;
    return driver;
  } catch {
    neo4jAvailable = false;
    return null;
  }
}

async function runQuery(cypher, params = {}) {
  const d = await getDriver();
  if (!d) return null;
  const neo4j = (await import('neo4j-driver')).default;
  const session = d.session();
  try {
    const result = await session.run(cypher, params);
    return result.records.map(r => {
      const obj = {};
      r.keys.forEach(key => {
        const val = r.get(key);
        obj[key] = neo4j.isInt(val) ? val.toNumber() : val;
      });
      return obj;
    });
  } catch { return null; }
  finally { await session.close(); }
}

// ── ML API ────────────────────────────────────────────────────────
const ML_API_URL = process.env.ML_API_URL || null;
let mlApiAvailable = false;

async function checkMlApi() {
  if (!ML_API_URL) return;
  try {
    const res = await fetch(`${ML_API_URL}/health`);
    if (res.ok) mlApiAvailable = true;
  } catch { mlApiAvailable = false; }
}

// ══════════════════════════════════════════════════════════════════
//  ROUTES
// ══════════════════════════════════════════════════════════════════

// Health
app.get('/api/health', (req, res) => {
  ensureDB();
  res.json({
    status: 'ok',
    neo4j: neo4jAvailable,
    mlApi: mlApiAvailable,
    database: 'sqlite',
    environment: process.env.VERCEL ? 'vercel' : 'local',
    timestamp: new Date().toISOString(),
  });
});

// Auth
ensureDB();
registerAuthRoutes(app);

// ── Accounts ──────────────────────────────────────────────────────
app.get('/api/accounts', requireAuth, async (req, res) => {
  ensureDB();
  if (neo4jAvailable) {
    const records = await runQuery(`
      MATCH (u:User)-[:OWNS]->(a:Account)
      RETURN u.userId AS userId, u.name AS name, u.jurisdiction AS jurisdiction,
             a.accountId AS accountId, a.type AS type, a.riskTier AS riskTier,
             a.riskScore AS riskScore, a.balance AS balance
      ORDER BY a.riskScore DESC
    `);
    if (records) return res.json({ source: 'neo4j', data: records });
  }
  res.json({ source: 'sqlite', data: getAccounts() });
});

// ── Transactions ──────────────────────────────────────────────────
app.get('/api/transactions', requireAuth, async (req, res) => {
  ensureDB();
  const { limit = 200, status, typology, search } = req.query;
  const data = getTransactions({ limit: parseInt(limit), status, typology, search });
  res.json({ source: 'sqlite', data: data.map(t => ({
    txId: t.txId, amount: t.amount, currency: t.currency,
    timestamp: t.timestamp, typology: t.typology,
    isFraud: t.isFraud, riskScore: t.riskScore,
    status: t.status, channel: t.channel,
    deviceFingerprint: t.deviceFingerprint, ipAddress: t.ipAddress,
    senderId: t.senderId, senderName: t.senderName, senderJurisdiction: t.senderJurisdiction,
    receiverId: t.receiverId, receiverName: t.receiverName, receiverJurisdiction: t.receiverJurisdiction,
    senderAccountType: t.senderAccountType,
  }))});
});

// ── Graph ─────────────────────────────────────────────────────────
app.get('/api/graph', requireAuth, async (req, res) => {
  ensureDB();
  res.json({ source: 'mock', nodes: [], links: [] });
});

// ── Alerts ────────────────────────────────────────────────────────
app.get('/api/alerts', requireAuth, (req, res) => {
  ensureDB();
  const { severity, status } = req.query;
  res.json({ source: 'sqlite', data: getAlerts({ severity, status }) });
});

app.patch('/api/alerts/:id/status', requireAuth, requireRole('admin', 'analyst'), (req, res) => {
  ensureDB();
  const { status } = req.body;
  if (!['New', 'Investigating', 'Escalated', 'Resolved'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  updateAlertStatus(req.params.id, status);
  res.json({ success: true, alertId: req.params.id, status });
});

// ── Analytics ─────────────────────────────────────────────────────
app.get('/api/analytics', requireAuth, async (req, res) => {
  ensureDB();
  await checkMlApi();
  let mlMetrics = null;
  if (mlApiAvailable && ML_API_URL) {
    try { const r = await fetch(`${ML_API_URL}/model-metrics`); if (r.ok) mlMetrics = await r.json(); } catch {}
  }
  const graphStats = getStats();
  res.json({ source: { neo4j: neo4jAvailable, ml: mlApiAvailable, db: 'sqlite' }, mlMetrics, graphStats });
});

// ── SAR Reports ───────────────────────────────────────────────────
app.get('/api/sar-reports', requireAuth, (req, res) => {
  ensureDB();
  res.json({ source: 'sqlite', data: getSARReports() });
});

app.post('/api/sar-reports', requireAuth, requireRole('admin', 'analyst'), (req, res) => {
  ensureDB();
  const { title, narrative, alertId, analyst, totalAmount } = req.body;
  const id = `SAR-${Date.now()}`;
  createSARReport({ id, status: 'Draft', title, narrative, alertId, filingDate: new Date().toISOString(), analyst: analyst || req.user.name, totalAmount: totalAmount || 0 });
  res.status(201).json({ success: true, id });
});

// ── ML Score ──────────────────────────────────────────────────────
app.post('/api/score', requireAuth, async (req, res) => {
  if (!mlApiAvailable || !ML_API_URL) return res.status(503).json({ error: 'ML API not available' });
  try {
    const r = await fetch(`${ML_API_URL}/predict`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body) });
    if (r.ok) return res.json(await r.json());
  } catch {}
  res.status(503).json({ error: 'ML API error' });
});

// ── SSE fallback (polling endpoint for Vercel) ────────────────────
// Vercel doesn't support long-lived connections. Return a batch of simulated transactions.
const names = ['James Volkov','Elena Chen','Viktor Martinez','Mei Al-Rashid','Carlos Nakamura','Fatima Johansson','Raj Okafor','Olga Petrov','Hassan Gupta','Linnea Schmidt','Diego Da Silva','Priya Müller','Chen Takahashi','Amara Fernandez','Sergei Kim'];
const jurisdictions = ['USA','UK','Switzerland','Singapore','Panama','Hong Kong','India','Germany','UAE','Nigeria'];
const currencies = ['USD','EUR','GBP','CHF','SGD','INR','JPY'];
const channels = ['Mobile App','Web Portal','ATM','Branch','Wire Transfer','API'];
const pick = a => a[Math.floor(Math.random() * a.length)];
const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));

app.get('/api/stream/poll', requireAuth, (req, res) => {
  const count = parseInt(req.query.count) || 3;
  const txns = [];
  for (let i = 0; i < count; i++) {
    const sender = pick(names);
    let receiver = pick(names);
    while (receiver === sender) receiver = pick(names);
    const isFraud = Math.random() < 0.15;
    const riskScore = isFraud ? randInt(60, 99) : randInt(5, 45);
    txns.push({
      id: `TXN-${Date.now()}-${i}`,
      timestamp: new Date().toISOString(),
      sender: { name: sender, jurisdiction: pick(jurisdictions) },
      receiver: { name: receiver, jurisdiction: pick(jurisdictions) },
      amount: +(100 + Math.random() * 50000).toFixed(2),
      currency: pick(currencies),
      channel: pick(channels),
      riskScore,
      isFraud,
      typology: isFraud ? pick(['Structuring','Smurfing','Layering','Round-Tripping','Phantom FDI']) : 'Normal',
      status: riskScore > 80 ? 'Blocked' : riskScore > 50 ? 'Under Review' : 'Cleared',
    });
  }
  res.json(txns);
});

// Export for Vercel
export default app;
