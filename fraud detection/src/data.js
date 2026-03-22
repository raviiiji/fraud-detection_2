// ===== Simulated Data for Fraud Detection Platform =====

// Helper functions
const randomId = () => Math.random().toString(36).substring(2, 10).toUpperCase();
const randomAmount = (min, max) => +(min + Math.random() * (max - min)).toFixed(2);
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1));

// ===== ACCOUNTS =====
const jurisdictions = ['USA', 'UK', 'Cayman Islands', 'Switzerland', 'Singapore', 'Panama', 'Hong Kong', 'Luxembourg', 'BVI', 'Netherlands', 'Germany', 'UAE', 'India', 'Nigeria', 'Brazil'];
const accountTypes = ['Personal', 'Business', 'Trust', 'Shell Corp', 'Offshore', 'Investment'];
const riskTiers = ['Low', 'Medium', 'High', 'Critical'];
const firstNames = ['James', 'Elena', 'Viktor', 'Mei', 'Carlos', 'Fatima', 'Raj', 'Olga', 'Hassan', 'Linnea', 'Diego', 'Priya', 'Chen', 'Amara', 'Sergei', 'Yuki', 'Liam', 'Zara', 'Andrei', 'Keiko', 'Marco', 'Anya', 'Tariq', 'Sofia', 'Ivan', 'Nadia', 'Omar', 'Julia', 'Ryu', 'Isla', 'Philippe', 'Leila', 'Nikolai', 'Catalina', 'Dmitri', 'Aisha', 'Mateo', 'Ingrid', 'Kofi', 'Mila', 'Rafael', 'Suki', 'Emir', 'Valentina', 'Hugo', 'Daria', 'Felix', 'Lena', 'Arjun', 'Nina'];
const lastNames = ['Volkov', 'Chen', 'Martinez', 'Al-Rashid', 'Nakamura', 'Johansson', 'Okafor', 'Petrov', 'Gupta', 'Schmidt', 'Da Silva', 'Müller', 'Takahashi', 'Fernandez', 'Kim', 'Bergström', 'Patel', 'Andersen', 'Dubois', 'Novak', 'Kowalski', 'Weber', 'Santos', 'Ivanov', 'Hansen', 'Moreau', 'Bianchi', 'Yamamoto', 'Larsen', 'Fischer', 'Kozlov', 'Laurent', 'Mendez', 'Eriksson', 'Rossi', 'Tanaka', 'Lindberg', 'Popov', 'Delgado', 'Krüger', 'Sokolov', 'Richter', 'Torres', 'Svensson', 'Morozov', 'Bernard', 'Vargas', 'Nilsson', 'Abbas', 'Brunetti'];

export const accounts = Array.from({ length: 50 }, (_, i) => {
  const risk = randomChoice(riskTiers);
  return {
    id: `ACC-${String(i + 1).padStart(4, '0')}`,
    name: `${firstNames[i]} ${lastNames[i]}`,
    jurisdiction: randomChoice(jurisdictions),
    type: randomChoice(accountTypes),
    riskTier: risk,
    riskScore: risk === 'Critical' ? randomInt(85, 99) : risk === 'High' ? randomInt(65, 84) : risk === 'Medium' ? randomInt(35, 64) : randomInt(5, 34),
    balance: randomAmount(1000, 5000000),
    pageRank: +(Math.random() * 0.05 + 0.001).toFixed(4),
    betweenness: +(Math.random()).toFixed(4),
    clusterCoeff: +(Math.random()).toFixed(4),
    createdAt: new Date(2023, randomInt(0, 11), randomInt(1, 28)).toISOString(),
    isSuspicious: risk === 'Critical' || risk === 'High',
  };
});

// ===== TRANSACTIONS =====
const typologies = ['Structuring', 'Smurfing', 'Layering', 'Round-Tripping', 'Phantom FDI', 'Normal', 'Normal', 'Normal', 'Normal', 'Normal'];
const currencies = ['USD', 'EUR', 'GBP', 'CHF', 'SGD', 'AED', 'INR', 'BRL', 'JPY', 'HKD'];
const txStatuses = ['Cleared', 'Under Review', 'Blocked'];

function generateTimestamp(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(randomInt(0, 23), randomInt(0, 59), randomInt(0, 59));
  return date.toISOString();
}

export const transactions = Array.from({ length: 200 }, (_, i) => {
  const senderIdx = randomInt(0, 49);
  let receiverIdx = randomInt(0, 49);
  while (receiverIdx === senderIdx) receiverIdx = randomInt(0, 49);

  const typology = randomChoice(typologies);
  const isFraud = typology !== 'Normal';
  const riskScore = isFraud ? randomInt(60, 99) : randomInt(2, 45);
  const status = isFraud ? (riskScore > 80 ? 'Blocked' : 'Under Review') : 'Cleared';

  return {
    id: `TXN-${String(i + 1).padStart(5, '0')}`,
    timestamp: generateTimestamp(randomInt(0, 90)),
    sender: accounts[senderIdx],
    receiver: accounts[receiverIdx],
    amount: typology === 'Structuring' ? randomAmount(8000, 9999) : typology === 'Smurfing' ? randomAmount(500, 4999) : randomAmount(100, 500000),
    currency: randomChoice(currencies),
    typology,
    isFraud,
    riskScore,
    status,
    deviceFingerprint: `DEV-${randomId()}`,
    ipAddress: `${randomInt(10, 220)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`,
    channel: randomChoice(['Mobile App', 'Web Portal', 'ATM', 'Branch', 'Wire Transfer', 'API']),
  };
}).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

// ===== ALERTS =====
const alertSeverities = ['Critical', 'High', 'Medium', 'Low'];
const alertStatuses = ['New', 'Investigating', 'Escalated', 'Resolved'];
const alertReasons = [
  'Circular payment pattern detected: A→B→C→A within 24 hours',
  '85% overlap in device fingerprint with known smurfing ring',
  'Sequential deposits below $10,000 threshold at 3 branches',
  'Dormant account activated with high-value international transfer',
  'PageRank anomaly: sudden 400% increase in centrality score',
  'Cross-border layering: 7 jurisdictions in 48 hours',
  'Phantom FDI: shell company with zero employees received $2.3M',
  'Velocity violation: 23 transactions in 1-hour window',
  'Beneficiary account linked to sanctioned entity via 3-hop path',
  'Round-tripping: funds returned to origin via Cayman Islands trust',
  'Weakly Connected Component analysis revealed 12-account cluster',
  'ATM-GAD flagged temporal motif: dormant→burst→dormant pattern',
  'Coordinated deposits from 8 unrelated accounts to single beneficiary',
  'Unusual currency conversion pattern: USD→CHF→BTC→EUR',
  'Account opened 48 hours before receiving $450K wire transfer',
  'Graph traversal revealed common beneficial ownership across 5 shells',
  'Synthetic identity detected: SSN/EIN mismatch in CDD pipeline',
  'Transaction amount precisely $9,999 repeated 4 times in 72 hours',
  'IP geolocation inconsistency: login from 3 countries in 2 hours',
  'Unusual merchant category code pattern suggesting trade-based laundering',
];

export const alerts = Array.from({ length: 30 }, (_, i) => {
  const severity = i < 5 ? 'Critical' : i < 12 ? 'High' : i < 22 ? 'Medium' : 'Low';
  const linkedTxns = Array.from({ length: randomInt(2, 6) }, () => randomChoice(transactions));
  return {
    id: `ALT-${String(i + 1).padStart(4, '0')}`,
    severity,
    status: randomChoice(alertStatuses),
    title: `${severity} Alert: ${randomChoice(['Structuring', 'Smurfing Ring', 'Layering Chain', 'Round-Trip', 'Phantom FDI', 'Velocity Violation', 'Network Anomaly', 'Dormant Activation', 'Cross-Border Pattern', 'Synthetic Identity'])} Detected`,
    reason: alertReasons[i % alertReasons.length],
    linkedTransactions: linkedTxns,
    linkedEntities: [...new Set(linkedTxns.flatMap(t => [t.sender.id, t.receiver.id]))].slice(0, 5),
    assignedTo: randomChoice(['Analyst Team A', 'Analyst Team B', 'Senior Investigator', 'Compliance Lead', 'Unassigned']),
    createdAt: generateTimestamp(randomInt(0, 30)),
    updatedAt: generateTimestamp(randomInt(0, 5)),
    totalExposure: linkedTxns.reduce((sum, t) => sum + t.amount, 0),
  };
}).sort((a, b) => {
  const sev = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  return sev[a.severity] - sev[b.severity];
});

// ===== NETWORK GRAPH DATA =====
const fraudRingAccounts = accounts.filter(a => a.isSuspicious).slice(0, 12);
const normalAccounts = accounts.filter(a => !a.isSuspicious);

export const graphData = {
  nodes: accounts.map(acc => ({
    id: acc.id,
    name: acc.name,
    riskTier: acc.riskTier,
    riskScore: acc.riskScore,
    type: acc.type,
    jurisdiction: acc.jurisdiction,
    pageRank: acc.pageRank,
    val: acc.riskTier === 'Critical' ? 12 : acc.riskTier === 'High' ? 9 : acc.riskTier === 'Medium' ? 6 : 4,
    color: acc.riskTier === 'Critical' ? '#ef4444' : acc.riskTier === 'High' ? '#f97316' : acc.riskTier === 'Medium' ? '#f59e0b' : '#10b981',
  })),
  links: transactions.slice(0, 120).map(tx => ({
    source: tx.sender.id,
    target: tx.receiver.id,
    amount: tx.amount,
    isFraud: tx.isFraud,
    typology: tx.typology,
    color: tx.isFraud ? 'rgba(239, 68, 68, 0.4)' : 'rgba(100, 116, 139, 0.15)',
  })),
};

// ===== SAR REPORTS =====
const sarStatuses = ['Draft', 'Submitted', 'Acknowledged'];

export const sarReports = Array.from({ length: 12 }, (_, i) => {
  const linkedAlert = alerts[i % alerts.length];
  const filingDate = generateTimestamp(randomInt(0, 60));
  return {
    id: `SAR-2025-${String(i + 1).padStart(4, '0')}`,
    status: randomChoice(sarStatuses),
    title: `Suspicious Activity Report: ${linkedAlert.title.replace('Alert: ', '')}`,
    narrative: generateSARNarrative(linkedAlert, i),
    linkedAlert,
    filingDate,
    analyst: randomChoice(['Sarah Chen', 'Michael Torres', 'Elena Petrov', 'James Okafor', 'Priya Gupta']),
    totalAmount: linkedAlert.totalExposure,
    entitiesInvolved: linkedAlert.linkedEntities.length,
    jurisdictions: [...new Set(linkedAlert.linkedTransactions.map(t => t.sender.jurisdiction))],
    timelineEvents: linkedAlert.linkedTransactions.map(t => ({
      timestamp: t.timestamp,
      description: `${t.sender.name} → ${t.receiver.name}: ${t.currency} ${t.amount.toLocaleString()}`,
      type: t.typology,
    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
  };
});

function generateSARNarrative(alert, idx) {
  const narratives = [
    `Between ${new Date(alert.createdAt).toLocaleDateString()} and ${new Date(alert.updatedAt).toLocaleDateString()}, a pattern of suspicious activity was observed involving ${alert.linkedEntities.length} entities. The investigation revealed ${alert.reason.toLowerCase()}. Total exposure amounts to $${alert.totalExposure.toLocaleString()}. The pattern is consistent with structured placement of illicit funds designed to avoid Currency Transaction Report (CTR) filing requirements.`,
    `Analysis of transaction data identified a network of ${alert.linkedEntities.length} accounts exhibiting coordinated behavior. ${alert.reason}. The funds were moved through multiple jurisdictions in rapid succession, with the transaction velocity and timing suggesting automated or pre-planned execution. The total value of flagged transactions is $${alert.totalExposure.toLocaleString()}.`,
    `Graph analysis using PageRank and Weakly Connected Component algorithms identified an anomalous cluster of accounts. ${alert.reason}. The structural properties of this network deviate significantly (>3σ) from legitimate commercial patterns, suggesting deliberate obfuscation of fund origins. Cross-referencing with CDD records reveals inconsistencies in declared business activities for ${alert.linkedEntities.length - 1} of the involved entities.`,
    `Temporal pattern analysis (ATM-GAD) detected a dormant-burst-dormant motif across multiple accounts. ${alert.reason}. The burst period coincides with the reporting period end date, suggesting awareness of monitoring cycles. The aggregate transaction volume of $${alert.totalExposure.toLocaleString()} across ${alert.linkedTransactions.length} transactions warrants further investigation and potential law enforcement referral.`,
  ];
  return narratives[idx % narratives.length];
}

// ===== KPI DATA =====
export const kpiData = {
  totalVolume: transactions.reduce((sum, t) => sum + t.amount, 0),
  totalTransactions: transactions.length,
  fraudRate: ((transactions.filter(t => t.isFraud).length / transactions.length) * 100).toFixed(1),
  avgRiskScore: (transactions.reduce((sum, t) => sum + t.riskScore, 0) / transactions.length).toFixed(0),
  activeAlerts: alerts.filter(a => a.status !== 'Resolved').length,
  sarCount: sarReports.length,
  blockedTransactions: transactions.filter(t => t.status === 'Blocked').length,
  highRiskAccounts: accounts.filter(a => a.riskTier === 'Critical' || a.riskTier === 'High').length,
};

// ===== CHART DATA =====
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const volumeOverTime = Array.from({ length: 30 }, (_, i) => ({
  date: `Mar ${i + 1}`,
  volume: randomInt(800000, 3500000),
  flagged: randomInt(20000, 350000),
  blocked: randomInt(5000, 80000),
}));

export const typologyBreakdown = [
  { name: 'Structuring', value: transactions.filter(t => t.typology === 'Structuring').length, color: '#ef4444' },
  { name: 'Smurfing', value: transactions.filter(t => t.typology === 'Smurfing').length, color: '#f97316' },
  { name: 'Layering', value: transactions.filter(t => t.typology === 'Layering').length, color: '#f59e0b' },
  { name: 'Round-Tripping', value: transactions.filter(t => t.typology === 'Round-Tripping').length, color: '#8b5cf6' },
  { name: 'Phantom FDI', value: transactions.filter(t => t.typology === 'Phantom FDI').length, color: '#ec4899' },
  { name: 'Normal', value: transactions.filter(t => t.typology === 'Normal').length, color: '#10b981' },
];

export const riskDistribution = Array.from({ length: 20 }, (_, i) => ({
  range: `${i * 5}-${i * 5 + 4}`,
  count: transactions.filter(t => t.riskScore >= i * 5 && t.riskScore < i * 5 + 5).length,
}));

export const featureImportance = [
  { feature: 'PageRank Score', importance: 0.23, color: '#6366f1' },
  { feature: 'Transaction Velocity', importance: 0.19, color: '#8b5cf6' },
  { feature: 'Betweenness Centrality', importance: 0.15, color: '#a78bfa' },
  { feature: 'Cross-Border Hops', importance: 0.13, color: '#c4b5fd' },
  { feature: 'Amount Deviation', importance: 0.11, color: '#22d3ee' },
  { feature: 'Clustering Coefficient', importance: 0.08, color: '#67e8f9' },
  { feature: 'Account Age', importance: 0.06, color: '#10b981' },
  { feature: 'Device Fingerprint', importance: 0.05, color: '#34d399' },
];

export const temporalAnomalies = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, '0')}:00`,
  normal: randomInt(50, 200),
  anomalous: randomInt(0, i >= 1 && i <= 4 ? 80 : 15),
}));


// ===== LIVE API SERVICE LAYER =====
// Fetches from Express API (port 3001) with JWT auth and falls back to mock data

const API_BASE = '/api';

async function apiFetch(endpoint) {
  try {
    const token = localStorage.getItem('fs_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${endpoint}`, { headers });
    if (res.status === 401) return null; // Not authenticated
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
}

// Check if backend is available
export async function checkBackendStatus() {
  const data = await apiFetch('/health');
  return data || { status: 'offline', neo4j: false, mlApi: false };
}

// Fetch accounts from Neo4j or fall back to mock
export async function fetchAccounts() {
  const result = await apiFetch('/accounts');
  if (result?.source === 'neo4j' && result.data.length > 0) {
    return { source: 'neo4j', data: result.data.map(a => ({
      id: a.accountId,
      name: a.name,
      jurisdiction: a.jurisdiction,
      type: a.type,
      riskTier: a.riskTier,
      riskScore: a.riskScore,
      balance: a.balance,
      pageRank: a.pagerank || 0,
      betweenness: a.betweenness || 0,
      clusterCoeff: a.clusterCoeff || 0,
      createdAt: a.createdAt,
      isSuspicious: a.riskTier === 'Critical' || a.riskTier === 'High',
    }))};
  }
  return { source: 'mock', data: accounts };
}

// Fetch transactions from Neo4j or fall back to mock
export async function fetchTransactions() {
  const result = await apiFetch('/transactions?limit=200');
  if (result?.source === 'neo4j' && result.data.length > 0) {
    return { source: 'neo4j', data: result.data.map(t => ({
      id: t.txId,
      timestamp: t.timestamp,
      sender: { id: t.senderId, name: t.senderName, jurisdiction: t.senderJurisdiction, type: t.senderAccountType },
      receiver: { id: t.receiverId, name: t.receiverName, jurisdiction: t.receiverJurisdiction },
      amount: t.amount,
      currency: t.currency,
      typology: t.typology,
      isFraud: t.isFraud,
      riskScore: t.riskScore,
      status: t.status,
      channel: t.channel,
      deviceFingerprint: t.deviceFingerprint,
      ipAddress: t.ipAddress,
    }))};
  }
  return { source: 'mock', data: transactions };
}

// Fetch graph data from Neo4j or fall back to mock
export async function fetchGraphData(riskTier = 'All') {
  const endpoint = riskTier !== 'All' ? `/graph?riskTier=${riskTier}` : '/graph';
  const result = await apiFetch(endpoint);
  if (result?.source === 'neo4j' && result.nodes.length > 0) {
    return { source: 'neo4j', nodes: result.nodes, links: result.links };
  }
  // Mock fallback with client-side filtering
  let mockNodes = graphData.nodes;
  if (riskTier !== 'All') {
    const validIds = new Set(mockNodes.filter(n => n.riskTier === riskTier).map(n => n.id));
    mockNodes = mockNodes.filter(n => validIds.has(n.id));
  }
  return { source: 'mock', ...graphData };
}

// Fetch analytics/metrics from ML API or fall back to mock
export async function fetchAnalytics() {
  const result = await apiFetch('/analytics');
  if (result?.mlMetrics) {
    const ml = result.mlMetrics;
    return {
      source: 'live',
      recall: (ml.recall * 100).toFixed(1),
      precision: (ml.precision * 100).toFixed(1),
      prAuc: ml.pr_auc,
      featureImportance: ml.feature_importance
        ? Object.entries(ml.feature_importance).slice(0, 8).map(([feature, importance], i) => ({
            feature: feature.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            importance,
            color: ['#6366f1','#8b5cf6','#a78bfa','#c4b5fd','#22d3ee','#67e8f9','#10b981','#34d399'][i],
          }))
        : featureImportance,
      graphStats: result.graphStats,
    };
  }
  return {
    source: 'mock',
    recall: '87.5',
    precision: '96.3',
    prAuc: 0.923,
    featureImportance,
    graphStats: null,
  };
}

// Score a transaction via ML API
export async function scoreTransaction(features) {
  try {
    const res = await fetch(`${API_BASE}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(features),
    });
    if (res.ok) return await res.json();
  } catch { /* silent */ }
  return null;
}

// Fetch circular payment patterns from Neo4j
export async function fetchCircularPayments() {
  const result = await apiFetch('/cypher/circular');
  if (result?.source === 'neo4j') {
    return { source: 'neo4j', data: result.data, count: result.count };
  }
  return { source: 'mock', data: [], count: 0 };
}
