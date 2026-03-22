// ===========================================================
//  FraudShield — Neo4j Schema Setup
//  Run this in Neo4j Browser or via cypher-shell
// ===========================================================

// ── Constraints & Indexes ──────────────────────────────────
CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.userId IS UNIQUE;
CREATE CONSTRAINT account_id IF NOT EXISTS FOR (a:Account) REQUIRE a.accountId IS UNIQUE;
CREATE CONSTRAINT transaction_id IF NOT EXISTS FOR (t:Transaction) REQUIRE t.txId IS UNIQUE;

CREATE INDEX account_risk IF NOT EXISTS FOR (a:Account) ON (a.riskScore);
CREATE INDEX tx_timestamp IF NOT EXISTS FOR (t:Transaction) ON (t.timestamp);
CREATE INDEX tx_amount IF NOT EXISTS FOR (t:Transaction) ON (t.amount);
CREATE INDEX tx_is_fraud IF NOT EXISTS FOR (t:Transaction) ON (t.isFraud);

// ── Node Labels ────────────────────────────────────────────
// :User       { userId, name, jurisdiction }
// :Account    { accountId, type, riskTier, riskScore, balance, pagerank, betweenness, clusterCoeff, createdAt }
// :Transaction { txId, amount, currency, timestamp, typology, isFraud, riskScore, status, channel, deviceFingerprint, ipAddress }

// ── Relationship Types ─────────────────────────────────────
// (:User)-[:OWNS]->(:Account)
// (:Account)-[:SENT]->(:Transaction)
// (:Transaction)-[:RECEIVED_BY]->(:Account)
// (:Account)-[:SAME_CC_AS]->(:Account)  // Temporal Connected Component

// ── Cypher Queries for Fraud Detection ─────────────────────

// 1. Detect circular payments (A→B→C→A) within a time window
// MATCH path = (a:Account)-[:SENT]->(t1:Transaction)-[:RECEIVED_BY]->(b:Account)
//              -[:SENT]->(t2:Transaction)-[:RECEIVED_BY]->(c:Account)
//              -[:SENT]->(t3:Transaction)-[:RECEIVED_BY]->(a)
// WHERE t1.timestamp < t2.timestamp < t3.timestamp
//   AND duration.between(t1.timestamp, t3.timestamp).hours < 24
// RETURN a.accountId, b.accountId, c.accountId,
//        t1.amount + t2.amount + t3.amount AS totalAmount

// 2. Find high-risk clusters (WCC)
// CALL gds.wcc.stream('fraud-graph')
// YIELD nodeId, componentId
// WITH componentId, count(*) AS size, collect(gds.util.asNode(nodeId).accountId) AS members
// WHERE size > 3
// RETURN componentId, size, members ORDER BY size DESC

// 3. PageRank for centrality
// CALL gds.pageRank.stream('fraud-graph')
// YIELD nodeId, score
// WITH gds.util.asNode(nodeId) AS node, score
// SET node.pagerank = score
// RETURN node.accountId, score ORDER BY score DESC LIMIT 20

// 4. Louvain community detection
// CALL gds.louvain.stream('fraud-graph')
// YIELD nodeId, communityId
// WITH gds.util.asNode(nodeId) AS node, communityId
// SET node.communityId = communityId
// RETURN communityId, count(*) AS size ORDER BY size DESC
