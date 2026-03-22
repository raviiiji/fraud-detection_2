/**
 * FraudShield — Server-Sent Events (SSE) for Real-Time Streaming
 *
 * Streams simulated transactions every 2-5 seconds, scored via ML API.
 * Clients connect via EventSource('/api/stream/transactions').
 */

const ML_API_URL = `http://localhost:${process.env.ML_API_PORT || 8000}`;

// Connected SSE clients
const clients = new Set();

// ── Generate realistic transaction ────────────────────────────────────────────

const names = ['James Volkov','Elena Chen','Viktor Martinez','Mei Al-Rashid','Carlos Nakamura','Fatima Johansson','Raj Okafor','Olga Petrov','Hassan Gupta','Linnea Schmidt','Diego Da Silva','Priya Müller','Chen Takahashi','Amara Fernandez','Sergei Kim'];
const jurisdictions = ['USA','UK','Switzerland','Singapore','Panama','Hong Kong','India','Germany','UAE','Nigeria'];
const currencies = ['USD','EUR','GBP','CHF','SGD','INR','JPY'];
const channels = ['Mobile App','Web Portal','ATM','Branch','Wire Transfer','API'];
const types = ['TRANSFER','CASH_OUT','PAYMENT','CASH_IN','DEBIT'];

const pick = a => a[Math.floor(Math.random() * a.length)];
const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
let txCounter = 10000;

function generateTransaction() {
  txCounter++;
  const isFraudRoll = Math.random();
  const isSuspicious = isFraudRoll < 0.15; // 15% chance of suspicious tx

  const sender = pick(names);
  let receiver = pick(names);
  while (receiver === sender) receiver = pick(names);

  const type = isSuspicious ? pick(['TRANSFER', 'CASH_OUT']) : pick(types);
  const amount = isSuspicious
    ? (Math.random() < 0.3 ? +(8000 + Math.random() * 1999).toFixed(2) : +(50000 + Math.random() * 450000).toFixed(2))
    : +(100 + Math.random() * 25000).toFixed(2);

  const oldBalOrg = +(amount + Math.random() * 50000).toFixed(2);
  const newBalOrg = isSuspicious && Math.random() < 0.5 ? 0 : +(oldBalOrg - amount).toFixed(2);
  const oldBalDest = +(Math.random() * 100000).toFixed(2);
  const newBalDest = +(oldBalDest + amount).toFixed(2);

  return {
    txId: `TXN-${txCounter}`,
    sender,
    senderJurisdiction: pick(jurisdictions),
    receiver,
    receiverJurisdiction: pick(jurisdictions),
    amount,
    currency: pick(currencies),
    timestamp: new Date().toISOString(),
    channel: pick(channels),
    // PaySim-style features for ML scoring
    step: randInt(1, 720),
    type,
    oldbalanceOrg: oldBalOrg,
    newbalanceOrig: newBalOrg,
    oldbalanceDest: oldBalDest,
    newbalanceDest: newBalDest,
    is_merchant_dest: type === 'PAYMENT' ? 1 : 0,
    same_orig_dest: 0,
    tx_count_per_step: isSuspicious ? randInt(3, 12) : randInt(1, 3),
    total_amount_per_step: amount,
    dest_unique_senders: randInt(1, 8),
  };
}

// ── Score transaction via ML API ──────────────────────────────────────────────

async function scoreTransaction(tx) {
  try {
    const res = await fetch(`${ML_API_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        step: tx.step,
        type: tx.type,
        amount: tx.amount,
        oldbalanceOrg: tx.oldbalanceOrg,
        newbalanceOrig: tx.newbalanceOrig,
        oldbalanceDest: tx.oldbalanceDest,
        newbalanceDest: tx.newbalanceDest,
        is_merchant_dest: tx.is_merchant_dest,
        same_orig_dest: tx.same_orig_dest,
        tx_count_per_step: tx.tx_count_per_step,
        total_amount_per_step: tx.total_amount_per_step,
        dest_unique_senders: tx.dest_unique_senders,
      }),
    });
    if (res.ok) return await res.json();
  } catch { /* ML API unavailable */ }
  // Fallback scoring
  return {
    risk_score: randInt(5, 40),
    is_fraud: false,
    probability: Math.random() * 0.3,
    confidence: 'Low',
    explanation: ['ML API unavailable — using fallback score.'],
  };
}

// ── SSE Stream ────────────────────────────────────────────────────────────────

let streamInterval = null;

export function registerSSERoutes(app) {
  // SSE endpoint
  app.get('/api/stream/transactions', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE stream connected' })}\n\n`);

    clients.add(res);
    console.log(`  SSE client connected (total: ${clients.size})`);

    req.on('close', () => {
      clients.delete(res);
      console.log(`  SSE client disconnected (total: ${clients.size})`);
    });
  });

  // Start streaming when first client connects
  startStreaming();
}

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try { client.write(payload); } catch { clients.delete(client); }
  }
}

function startStreaming() {
  if (streamInterval) return;

  streamInterval = setInterval(async () => {
    if (clients.size === 0) return;

    const tx = generateTransaction();
    const mlResult = await scoreTransaction(tx);

    const enrichedTx = {
      id: tx.txId,
      timestamp: tx.timestamp,
      sender: { name: tx.sender, jurisdiction: tx.senderJurisdiction },
      receiver: { name: tx.receiver, jurisdiction: tx.receiverJurisdiction },
      amount: tx.amount,
      currency: tx.currency,
      channel: tx.channel,
      riskScore: mlResult.risk_score,
      isFraud: mlResult.is_fraud,
      probability: mlResult.probability,
      confidence: mlResult.confidence,
      explanation: mlResult.explanation,
      typology: mlResult.is_fraud
        ? pick(['Structuring', 'Smurfing', 'Layering', 'Round-Tripping', 'Phantom FDI'])
        : 'Normal',
      status: mlResult.risk_score > 80 ? 'Blocked' : mlResult.risk_score > 50 ? 'Under Review' : 'Cleared',
    };

    broadcast('transaction', enrichedTx);
  }, randInt(2000, 4000));

  console.log('  📡 SSE transaction stream started');
}

export function getSSEClientCount() {
  return clients.size;
}
