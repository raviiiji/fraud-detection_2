"""
FraudShield — Neo4j Seed Script

Populates Neo4j with realistic accounts, transactions, and relationships,
including fraud patterns (circular payments, smurfing clusters, layering chains).
"""

import os
import sys
import random
import datetime
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "fraud_detection_2025")

try:
    from neo4j import GraphDatabase
except ImportError:
    print("❌ neo4j driver not installed. Run: pip install neo4j")
    sys.exit(1)

# ── Configuration ──────────────────────────────────────────────────────────────
random.seed(42)
N_USERS = 50
N_TRANSACTIONS = 500

JURISDICTIONS = ['USA', 'UK', 'Cayman Islands', 'Switzerland', 'Singapore',
                 'Panama', 'Hong Kong', 'Luxembourg', 'BVI', 'Netherlands',
                 'Germany', 'UAE', 'India', 'Nigeria', 'Brazil']
ACCOUNT_TYPES = ['Personal', 'Business', 'Trust', 'Shell Corp', 'Offshore', 'Investment']
RISK_TIERS = ['Low', 'Medium', 'High', 'Critical']
CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'SGD', 'AED', 'INR', 'BRL', 'JPY', 'HKD']
CHANNELS = ['Mobile App', 'Web Portal', 'ATM', 'Branch', 'Wire Transfer', 'API']
TYPOLOGIES = ['Structuring', 'Smurfing', 'Layering', 'Round-Tripping', 'Phantom FDI',
              'Normal', 'Normal', 'Normal', 'Normal', 'Normal']

FIRST_NAMES = ['James', 'Elena', 'Viktor', 'Mei', 'Carlos', 'Fatima', 'Raj', 'Olga',
               'Hassan', 'Linnea', 'Diego', 'Priya', 'Chen', 'Amara', 'Sergei',
               'Yuki', 'Liam', 'Zara', 'Andrei', 'Keiko', 'Marco', 'Anya',
               'Tariq', 'Sofia', 'Ivan', 'Nadia', 'Omar', 'Julia', 'Ryu', 'Isla',
               'Philippe', 'Leila', 'Nikolai', 'Catalina', 'Dmitri', 'Aisha',
               'Mateo', 'Ingrid', 'Kofi', 'Mila', 'Rafael', 'Suki', 'Emir',
               'Valentina', 'Hugo', 'Daria', 'Felix', 'Lena', 'Arjun', 'Nina']
LAST_NAMES = ['Volkov', 'Chen', 'Martinez', 'Al-Rashid', 'Nakamura', 'Johansson',
              'Okafor', 'Petrov', 'Gupta', 'Schmidt', 'Da Silva', 'Müller',
              'Takahashi', 'Fernandez', 'Kim', 'Bergström', 'Patel', 'Andersen',
              'Dubois', 'Novak', 'Kowalski', 'Weber', 'Santos', 'Ivanov',
              'Hansen', 'Moreau', 'Bianchi', 'Yamamoto', 'Larsen', 'Fischer',
              'Kozlov', 'Laurent', 'Mendez', 'Eriksson', 'Rossi', 'Tanaka',
              'Lindberg', 'Popov', 'Delgado', 'Krüger', 'Sokolov', 'Richter',
              'Torres', 'Svensson', 'Morozov', 'Bernard', 'Vargas', 'Nilsson',
              'Abbas', 'Brunetti']


def random_timestamp(days_ago_max=90):
    now = datetime.datetime.now()
    delta = datetime.timedelta(
        days=random.randint(0, days_ago_max),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
    )
    return (now - delta).isoformat()


def generate_accounts():
    accounts = []
    for i in range(N_USERS):
        risk = random.choice(RISK_TIERS)
        risk_score = (
            random.randint(85, 99) if risk == 'Critical'
            else random.randint(65, 84) if risk == 'High'
            else random.randint(35, 64) if risk == 'Medium'
            else random.randint(5, 34)
        )
        accounts.append({
            "userId": f"USR-{i+1:04d}",
            "name": f"{FIRST_NAMES[i]} {LAST_NAMES[i]}",
            "jurisdiction": random.choice(JURISDICTIONS),
            "accountId": f"ACC-{i+1:04d}",
            "type": random.choice(ACCOUNT_TYPES),
            "riskTier": risk,
            "riskScore": risk_score,
            "balance": round(random.uniform(1000, 5000000), 2),
            "createdAt": random_timestamp(365),
        })
    return accounts


def generate_transactions(accounts):
    transactions = []

    # Regular transactions
    for i in range(N_TRANSACTIONS):
        sender_idx = random.randint(0, N_USERS - 1)
        receiver_idx = random.randint(0, N_USERS - 1)
        while receiver_idx == sender_idx:
            receiver_idx = random.randint(0, N_USERS - 1)

        typology = random.choice(TYPOLOGIES)
        is_fraud = typology != 'Normal'

        if typology == 'Structuring':
            amount = round(random.uniform(8000, 9999), 2)
        elif typology == 'Smurfing':
            amount = round(random.uniform(500, 4999), 2)
        else:
            amount = round(random.uniform(100, 500000), 2)

        risk_score = random.randint(60, 99) if is_fraud else random.randint(2, 45)
        status = 'Blocked' if risk_score > 80 else 'Under Review' if is_fraud else 'Cleared'

        transactions.append({
            "txId": f"TXN-{i+1:05d}",
            "senderId": accounts[sender_idx]["accountId"],
            "receiverId": accounts[receiver_idx]["accountId"],
            "amount": amount,
            "currency": random.choice(CURRENCIES),
            "timestamp": random_timestamp(90),
            "typology": typology,
            "isFraud": is_fraud,
            "riskScore": risk_score,
            "status": status,
            "channel": random.choice(CHANNELS),
            "deviceFingerprint": f"DEV-{random.randint(10000000, 99999999):08X}",
            "ipAddress": f"{random.randint(10,220)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}",
        })

    # Inject circular payment pattern (A→B→C→A)
    for ring_start in range(0, 9, 3):
        base_ts = datetime.datetime.now() - datetime.timedelta(days=random.randint(1, 30))
        for step in range(3):
            s = ring_start + step
            r = ring_start + ((step + 1) % 3)
            ts = base_ts + datetime.timedelta(hours=step * 2)
            transactions.append({
                "txId": f"TXN-RING-{ring_start}-{step}",
                "senderId": accounts[s]["accountId"],
                "receiverId": accounts[r]["accountId"],
                "amount": round(random.uniform(50000, 200000), 2),
                "currency": "USD",
                "timestamp": ts.isoformat(),
                "typology": "Round-Tripping",
                "isFraud": True,
                "riskScore": random.randint(80, 99),
                "status": "Blocked",
                "channel": "Wire Transfer",
                "deviceFingerprint": f"DEV-RING-{ring_start:02d}",
                "ipAddress": f"10.0.{ring_start}.{step+1}",
            })

    return transactions


def seed_database():
    print("=" * 60)
    print("  FraudShield — Neo4j Seed Script")
    print("=" * 60)
    print(f"\n  Connecting to: {NEO4J_URI}")

    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

    try:
        driver.verify_connectivity()
        print("  ✅ Connected to Neo4j!\n")
    except Exception as e:
        print(f"  ❌ Connection failed: {e}")
        print("\n  Make sure Neo4j is running and credentials are correct.")
        print("  You can update credentials in the .env file.")
        sys.exit(1)

    accounts = generate_accounts()
    transactions = generate_transactions(accounts)

    with driver.session() as session:
        # Clear existing data
        print("[1/5] Clearing existing data...")
        session.run("MATCH (n) DETACH DELETE n")

        # Create constraints (idempotent)
        print("[2/5] Creating constraints and indexes...")
        for q in [
            "CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.userId IS UNIQUE",
            "CREATE CONSTRAINT account_id IF NOT EXISTS FOR (a:Account) REQUIRE a.accountId IS UNIQUE",
            "CREATE CONSTRAINT transaction_id IF NOT EXISTS FOR (t:Transaction) REQUIRE t.txId IS UNIQUE",
            "CREATE INDEX account_risk IF NOT EXISTS FOR (a:Account) ON (a.riskScore)",
            "CREATE INDEX tx_timestamp IF NOT EXISTS FOR (t:Transaction) ON (t.timestamp)",
        ]:
            try:
                session.run(q)
            except Exception:
                pass  # Constraint may already exist

        # Create Users + Accounts
        print(f"[3/5] Creating {len(accounts)} users and accounts...")
        for acc in accounts:
            session.run("""
                CREATE (u:User {userId: $userId, name: $name, jurisdiction: $jurisdiction})
                CREATE (a:Account {
                    accountId: $accountId, type: $type, riskTier: $riskTier,
                    riskScore: $riskScore, balance: $balance, createdAt: $createdAt,
                    pagerank: 0.0, betweenness: 0.0, clusterCoeff: 0.0
                })
                CREATE (u)-[:OWNS]->(a)
            """, **acc)

        # Create Transactions + Relationships
        print(f"[4/5] Creating {len(transactions)} transactions...")
        for tx in transactions:
            session.run("""
                MATCH (sender:Account {accountId: $senderId})
                MATCH (receiver:Account {accountId: $receiverId})
                CREATE (t:Transaction {
                    txId: $txId, amount: $amount, currency: $currency,
                    timestamp: $timestamp, typology: $typology, isFraud: $isFraud,
                    riskScore: $riskScore, status: $status, channel: $channel,
                    deviceFingerprint: $deviceFingerprint, ipAddress: $ipAddress
                })
                CREATE (sender)-[:SENT]->(t)
                CREATE (t)-[:RECEIVED_BY]->(receiver)
            """, **tx)

        # Verify counts
        print("[5/5] Verifying...")
        result = session.run("""
            MATCH (u:User) WITH count(u) AS users
            MATCH (a:Account) WITH users, count(a) AS accounts
            MATCH (t:Transaction) WITH users, accounts, count(t) AS transactions
            MATCH ()-[s:SENT]->() WITH users, accounts, transactions, count(s) AS sent
            MATCH ()-[r:RECEIVED_BY]->() WITH users, accounts, transactions, sent, count(r) AS received
            RETURN users, accounts, transactions, sent, received
        """).single()

        print(f"\n  {'─' * 40}")
        print(f"  Users:        {result['users']}")
        print(f"  Accounts:     {result['accounts']}")
        print(f"  Transactions: {result['transactions']}")
        print(f"  SENT rels:    {result['sent']}")
        print(f"  RECEIVED rels:{result['received']}")
        print(f"  {'─' * 40}")

        # Count fraud
        fraud_count = session.run(
            "MATCH (t:Transaction {isFraud: true}) RETURN count(t) AS cnt"
        ).single()["cnt"]
        print(f"  Fraud txns:   {fraud_count} ({fraud_count/result['transactions']*100:.1f}%)")

        # Count circular patterns
        ring_count = session.run("""
            MATCH (t:Transaction) WHERE t.txId STARTS WITH 'TXN-RING'
            RETURN count(t) AS cnt
        """).single()["cnt"]
        print(f"  Ring txns:    {ring_count} (circular payment patterns)")

    driver.close()
    print(f"\n{'=' * 60}")
    print("  Seeding complete!")
    print(f"{'=' * 60}\n")


if __name__ == "__main__":
    seed_database()
