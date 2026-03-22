/**
 * FraudShield — Express API Server v3
 *
 * Integrates: SQLite Database, Neo4j (optional), ML API, JWT Auth, SSE Streaming
 * Port: 3001
 */

import express from 'express';
import cors from 'cors';
import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { initDatabase, getAccounts, getTransactions, getAlerts, updateAlertStatus, getStats, getSARReports, createSARReport } from './db.js';
import { registerAuthRoutes, requireAuth, requireRole } from './auth.js';
import { registerSSERoutes, getSSEClientCount } from './sse.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.EXPRESS_PORT || 3001;
const ML_API_URL = `http://localhost:${process.env.ML_API_PORT || 8000}`;
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'fraud_detection_2025';

// ── Neo4j Driver ──────────────────────────────────────────────────────────────
let driver = null;
let neo4jAvailable = false;

async function initNeo4j() {
  try {
    driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
    await driver.verifyConnectivity();
    neo4jAvailable = true;
    console.log('✅ Connected to Neo4j');
  } catch (err) {
    console.warn('⚠  Neo4j not available — using SQLite fallback');
    neo4jAvailable = false;
  }
}

// ── ML API ────────────────────────────────────────────────────────────────────
let mlApiAvailable = false;

async function checkMlApi() {
  try {
    const res = await fetch(`${ML_API_URL}/health`);
    if (res.ok) { mlApiAvailable = true; console.log('✅ Connected to ML API'); }
  } catch {
    console.warn('⚠  ML API not available');
    mlApiAvailable = false;
  }
}

// ── Neo4j Query Runner ────────────────────────────────────────────────────────
async function runQuery(cypher, params = {}) {
  if (!neo4jAvailable || !driver) return null;
  const session = driver.session();
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
  } catch (err) {
    console.error('Neo4j error:', err.message);
    return null;
  } finally {
    await session.close();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  PUBLIC ROUTES (no auth required)
// ══════════════════════════════════════════════════════════════════════════════

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    neo4j: neo4jAvailable,
    mlApi: mlApiAvailable,
    database: 'sqlite',
    sseClients: getSSEClientCount(),
    timestamp: new Date().toISOString(),
  });
});

// Auth routes (login doesn't require auth)
registerAuthRoutes(app);

// SSE streaming (no auth for simplicity — could add token param)
registerSSERoutes(app);

// ══════════════════════════════════════════════════════════════════════════════
//  PROTECTED ROUTES (auth required)
// ══════════════════════════════════════════════════════════════════════════════

// ── Accounts ──────────────────────────────────────────────────────────────────
app.get('/api/accounts', requireAuth, async (req, res) => {
  // Try Neo4j first
  if (neo4jAvailable) {
    const records = await runQuery(`
      MATCH (u:User)-[:OWNS]->(a:Account)
      RETURN u.userId AS userId, u.name AS name, u.jurisdiction AS jurisdiction,
             a.accountId AS accountId, a.type AS type, a.riskTier AS riskTier,
             a.riskScore AS riskScore, a.balance AS balance,
             a.pagerank AS pagerank, a.betweenness AS betweenness,
             a.clusterCoeff AS clusterCoeff, a.createdAt AS createdAt
      ORDER BY a.riskScore DESC
    `);
    if (records) return res.json({ source: 'neo4j', data: records });
  }

  // SQLite fallback
  const data = getAccounts();
  res.json({ source: 'sqlite', data });
});

// ── Transactions ──────────────────────────────────────────────────────────────
app.get('/api/transactions', requireAuth, async (req, res) => {
  const { limit = 200, status, typology, search } = req.query;

  if (neo4jAvailable) {
    let where = '';
    const params = { limit: neo4j.int(parseInt(limit)) };
    if (status) { where += ' AND t.status = $status'; params.status = status; }
    if (typology) { where += ' AND t.typology = $typology'; params.typology = typology; }

    const records = await runQuery(`
      MATCH (sender:Account)-[:SENT]->(t:Transaction)-[:RECEIVED_BY]->(receiver:Account)
      MATCH (sUser:User)-[:OWNS]->(sender)
      MATCH (rUser:User)-[:OWNS]->(receiver)
      WHERE true ${where}
      RETURN t.txId AS txId, t.amount AS amount, t.currency AS currency,
             t.timestamp AS timestamp, t.typology AS typology,
             t.isFraud AS isFraud, t.riskScore AS riskScore,
             t.status AS status, t.channel AS channel,
             t.deviceFingerprint AS deviceFingerprint, t.ipAddress AS ipAddress,
             sender.accountId AS senderId, sUser.name AS senderName, sUser.jurisdiction AS senderJurisdiction,
             receiver.accountId AS receiverId, rUser.name AS receiverName, rUser.jurisdiction AS receiverJurisdiction,
             sender.type AS senderAccountType
      ORDER BY t.timestamp DESC
      LIMIT $limit
    `, params);
    if (records) return res.json({ source: 'neo4j', data: records });
  }

  // SQLite fallback
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

// ── Graph Data ────────────────────────────────────────────────────────────────
app.get('/api/graph', requireAuth, async (req, res) => {
  const { riskTier } = req.query;

  if (neo4jAvailable) {
    let nodeQuery = riskTier && riskTier !== 'All'
      ? `MATCH (u:User)-[:OWNS]->(a:Account {riskTier: $riskTier}) RETURN a.accountId AS id, u.name AS name, a.riskTier AS riskTier, a.riskScore AS riskScore, a.type AS type, u.jurisdiction AS jurisdiction, a.pagerank AS pagerank`
      : `MATCH (u:User)-[:OWNS]->(a:Account) RETURN a.accountId AS id, u.name AS name, a.riskTier AS riskTier, a.riskScore AS riskScore, a.type AS type, u.jurisdiction AS jurisdiction, a.pagerank AS pagerank`;

    const nodes = await runQuery(nodeQuery, riskTier ? { riskTier } : {});
    const links = await runQuery(`MATCH (s:Account)-[:SENT]->(t:Transaction)-[:RECEIVED_BY]->(r:Account) RETURN s.accountId AS source, r.accountId AS target, t.amount AS amount, t.isFraud AS isFraud, t.typology AS typology LIMIT 300`);

    if (nodes && links) {
      return res.json({
        source: 'neo4j',
        nodes: nodes.map(n => ({ ...n, val: n.riskTier === 'Critical' ? 12 : n.riskTier === 'High' ? 9 : n.riskTier === 'Medium' ? 6 : 4, color: n.riskTier === 'Critical' ? '#ef4444' : n.riskTier === 'High' ? '#f97316' : n.riskTier === 'Medium' ? '#f59e0b' : '#10b981' })),
        links: links.map(l => ({ ...l, color: l.isFraud ? 'rgba(239,68,68,0.4)' : 'rgba(100,116,139,0.15)' })),
      });
    }
  }

  res.json({ source: 'mock', nodes: [], links: [] });
});

// ── Alerts ────────────────────────────────────────────────────────────────────
app.get('/api/alerts', requireAuth, async (req, res) => {
  const { severity, status } = req.query;
  const data = getAlerts({ severity, status });
  res.json({ source: 'sqlite', data });
});

app.patch('/api/alerts/:id/status', requireAuth, requireRole('admin', 'analyst'), (req, res) => {
  const { status } = req.body;
  if (!['New', 'Investigating', 'Escalated', 'Resolved'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  updateAlertStatus(req.params.id, status);
  res.json({ success: true, alertId: req.params.id, status });
});

// ── Circular Payment Detection ────────────────────────────────────────────────
app.get('/api/cypher/circular', requireAuth, async (req, res) => {
  if (!neo4jAvailable) return res.json({ source: 'unavailable', data: [], message: 'Neo4j required for circular payment detection' });

  const records = await runQuery(`
    MATCH path = (a:Account)-[:SENT]->(t1:Transaction)-[:RECEIVED_BY]->(b:Account)
                 -[:SENT]->(t2:Transaction)-[:RECEIVED_BY]->(c:Account)
                 -[:SENT]->(t3:Transaction)-[:RECEIVED_BY]->(a)
    WHERE a <> b AND b <> c AND a <> c
    RETURN a.accountId AS node_a, b.accountId AS node_b, c.accountId AS node_c,
           t1.amount + t2.amount + t3.amount AS totalAmount
    LIMIT 20
  `);
  res.json({ source: 'neo4j', data: records || [], count: records?.length || 0 });
});

// ── ML Score ──────────────────────────────────────────────────────────────────
app.post('/api/score', requireAuth, async (req, res) => {
  if (!mlApiAvailable) return res.status(503).json({ error: 'ML API not available' });
  try {
    const r = await fetch(`${ML_API_URL}/predict`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body) });
    if (r.ok) return res.json(await r.json());
  } catch { /* silent */ }
  res.status(503).json({ error: 'ML API error' });
});

// ── Analytics ─────────────────────────────────────────────────────────────────
app.get('/api/analytics', requireAuth, async (req, res) => {
  let mlMetrics = null;
  if (mlApiAvailable) {
    try { const r = await fetch(`${ML_API_URL}/model-metrics`); if (r.ok) mlMetrics = await r.json(); } catch {}
  }

  const graphStats = neo4jAvailable
    ? (await runQuery(`MATCH (a:Account) WITH count(a) AS totalAccounts MATCH (t:Transaction) WITH totalAccounts, count(t) AS totalTx MATCH (t2:Transaction {isFraud: true}) RETURN totalAccounts, totalTx, count(t2) AS fraudTx`))?.[0] || null
    : getStats();

  res.json({ source: { neo4j: neo4jAvailable, ml: mlApiAvailable, db: 'sqlite' }, mlMetrics, graphStats });
});

// ── SAR Reports ───────────────────────────────────────────────────────────────
app.get('/api/sar-reports', requireAuth, (req, res) => {
  res.json({ source: 'sqlite', data: getSARReports() });
});

app.post('/api/sar-reports', requireAuth, requireRole('admin', 'analyst'), (req, res) => {
  const { title, narrative, alertId, analyst, totalAmount } = req.body;
  const id = `SAR-${Date.now()}`;
  createSARReport({ id, status: 'Draft', title, narrative, alertId, filingDate: new Date().toISOString(), analyst: analyst || req.user.name, totalAmount: totalAmount || 0 });
  res.status(201).json({ success: true, id });
});

// ══════════════════════════════════════════════════════════════════════════════
//  START
// ══════════════════════════════════════════════════════════════════════════════

async function start() {
  initDatabase();
  await initNeo4j();
  await checkMlApi();

  app.listen(PORT, () => {
    console.log(`\n${'═'.repeat(55)}`);
    console.log(`  FraudShield API Server v3`);
    console.log(`  http://localhost:${PORT}`);
    console.log(`${'─'.repeat(55)}`);
    console.log(`  SQLite:  ✅ Connected (persistent)`);
    console.log(`  Neo4j:   ${neo4jAvailable ? '✅ Connected' : '⚠  Unavailable (SQLite fallback)'}`);
    console.log(`  ML API:  ${mlApiAvailable ? '✅ Connected' : '⚠  Unavailable'}`);
    console.log(`  Auth:    ✅ JWT + RBAC (admin/analyst/viewer)`);
    console.log(`  SSE:     ✅ Real-time streaming enabled`);
    console.log(`${'═'.repeat(55)}\n`);
  });
}

start();
