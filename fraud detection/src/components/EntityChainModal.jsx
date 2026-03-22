import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X, Info, Users, User, Landmark, BarChart3, ArrowRightLeft,
  ExternalLink, ChevronRight, Maximize2, Minimize2,
} from 'lucide-react';
import { transactions } from '../data';

/* ════════════════════════════════════════════════════════════════════
   Entity Chain Graph — Neo4j-style network visualization
   GROUP → PERSON → ACCOUNT → SECURITIES + TRANSACTION nodes
   Shows ALL transactions for a selected user
   ════════════════════════════════════════════════════════════════════ */

const NODE_TYPES = {
  Group:       { color: '#f0b429', dimBg: 'rgba(240,180,41,0.08)',  icon: Users,          label: 'Group' },
  Person:      { color: '#818cf8', dimBg: 'rgba(129,140,248,0.08)', icon: User,           label: 'Person' },
  Account:     { color: '#00d4aa', dimBg: 'rgba(0,212,170,0.08)',   icon: Landmark,       label: 'Account' },
  Securities:  { color: '#a855f7', dimBg: 'rgba(168,85,247,0.08)',  icon: BarChart3,      label: 'Securities' },
  Transaction: { color: '#f87171', dimBg: 'rgba(248,113,113,0.08)', icon: ArrowRightLeft, label: 'Transaction' },
};

// ── Build the full entity chain for a person ──────────────────────
function buildEntityChain(person) {
  const nodes = [];
  const edges = [];
  let id = 0;

  // 1) Group node
  const groupId = id++;
  nodes.push({
    id: groupId, type: 'Group',
    label: `Group[${Math.floor(Math.random() * 900) + 100}]`,
    props: {
      id: `GRP-${Math.floor(Math.random() * 9000) + 1000}`,
      label: 'Group',
      GroupType: ['Corporate', 'Family Office', 'Syndicate', 'Investment Club'][Math.floor(Math.random() * 4)],
      Jurisdiction: person.jurisdiction || 'USA',
      RiskTier: ['Low', 'Medium', 'High', 'Critical'][Math.floor(Math.random() * 4)],
    },
  });

  // 2) Person node
  const personId = id++;
  nodes.push({
    id: personId, type: 'Person',
    label: `Person[${Math.floor(Math.random() * 9000) + 1000}]`,
    props: {
      id: person.id || `PER-${Math.floor(Math.random() * 9000) + 1000}`,
      label: 'Person',
      Name: person.name,
      Jurisdiction: person.jurisdiction || 'USA',
      RiskScore: Math.floor(Math.random() * 100),
      KYCStatus: ['Verified', 'Pending', 'Expired'][Math.floor(Math.random() * 3)],
    },
  });
  edges.push({ from: groupId, to: personId });

  // 3) Account nodes (2-3)
  const accCount = 2 + Math.floor(Math.random() * 2);
  const accIds = [];
  for (let i = 0; i < accCount; i++) {
    const accId = id++;
    accIds.push(accId);
    const prefix = person.jurisdiction === 'UK' ? 'GB' : person.jurisdiction === 'Germany' ? 'DE' : 'US';
    nodes.push({
      id: accId, type: 'Account',
      label: `Account[${Math.floor(Math.random() * 9000) + 1000}]`,
      props: {
        id: `ACC-${String(accId).padStart(4, '0')}`,
        label: 'Account',
        AccountNumber: `${prefix}${Math.random().toString(36).substring(2, 20).toUpperCase()}`,
        AccountType: ['Investment', 'Savings', 'Checking', 'Trust', 'Offshore'][Math.floor(Math.random() * 5)],
        Balance: (Math.random() * 500000 + 5000).toFixed(2),
        Currency: ['USD', 'EUR', 'GBP', 'CHF'][Math.floor(Math.random() * 4)],
      },
    });
    edges.push({ from: personId, to: accId });
  }

  // 4) Securities nodes (3-5)
  const secNames = ['Jones Ltd', 'Apex Corp', 'Meridian Holdings', 'Titan Securities',
    'Quantum Assets', 'Vertex Capital', 'Sterling Partners', 'Nordic Trust'];
  const secCount = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < secCount; i++) {
    const secId = id++;
    nodes.push({
      id: secId, type: 'Securities',
      label: `Securities[${Math.floor(Math.random() * 9000) + 1000}]`,
      props: {
        id: `SEC-${Math.floor(Math.random() * 9000) + 1000}`,
        label: 'Securities',
        SecurityType: ['Bond', 'Equity', 'Derivative', 'ETF', 'Option'][Math.floor(Math.random() * 5)],
        SecurityName: secNames[Math.floor(Math.random() * secNames.length)],
        CurrentPrice: (Math.random() * 1000 + 10).toFixed(2),
        ISIN: `${['US', 'GB', 'DE', 'CH'][Math.floor(Math.random() * 4)]}${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
      },
    });
    const connAcc = accIds[(i) % accIds.length];
    edges.push({ from: connAcc, to: secId });
    if (Math.random() > 0.6 && accIds.length > 1) {
      edges.push({ from: accIds[(i + 1) % accIds.length], to: secId });
    }
  }

  // 5) Transaction nodes — ALL transactions involving this person
  const userTxns = transactions.filter(
    tx => tx.sender.name === person.name || tx.receiver.name === person.name
  );

  userTxns.forEach((tx) => {
    const txNodeId = id++;
    const isSender = tx.sender.name === person.name;
    nodes.push({
      id: txNodeId, type: 'Transaction',
      label: tx.id,
      props: {
        id: tx.id,
        label: 'Transaction',
        Amount: `${tx.currency} ${tx.amount.toLocaleString()}`,
        Direction: isSender ? 'OUTGOING' : 'INCOMING',
        Counterparty: isSender ? tx.receiver.name : tx.sender.name,
        Channel: tx.channel,
        RiskScore: tx.riskScore,
        Status: tx.status,
        Typology: tx.typology,
        Timestamp: new Date(tx.timestamp).toLocaleString(),
      },
    });
    // Connect transaction to a random account
    const connAcc = accIds[Math.floor(Math.random() * accIds.length)];
    edges.push({ from: connAcc, to: txNodeId });
  });

  return { nodes, edges, txCount: userTxns.length };
}

// ── Force-Directed Layout ─────────────────────────────────────────
function computeLayout(nodes, edges, W, H) {
  const typeOrder = { Group: 0, Person: 1, Account: 2, Securities: 3, Transaction: 3.5 };
  const cols = 4.5;

  const pos = nodes.map((n) => {
    const col = typeOrder[n.type];
    const sameType = nodes.filter(nn => nn.type === n.type);
    const idx = sameType.indexOf(n);
    const spacing = H / (sameType.length + 1);
    return {
      x: 60 + col * ((W - 120) / cols) + (Math.random() - 0.5) * 15,
      y: spacing * (idx + 1) + (Math.random() - 0.5) * 10,
      vx: 0, vy: 0,
    };
  });

  for (let iter = 0; iter < 100; iter++) {
    const alpha = 1 - iter / 100;

    // Repulsion
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        let dx = pos[j].x - pos[i].x;
        let dy = pos[j].y - pos[i].y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        let force = 600 / (dist * dist) * alpha;
        pos[i].vx -= dx / dist * force;
        pos[i].vy -= dy / dist * force;
        pos[j].vx += dx / dist * force;
        pos[j].vy += dy / dist * force;
      }
    }

    // Edge attraction
    for (const edge of edges) {
      const a = pos[edge.from], b = pos[edge.to];
      if (!a || !b) continue;
      let dx = b.x - a.x, dy = b.y - a.y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 1;
      let force = (dist - 80) * 0.04 * alpha;
      a.vx += dx / dist * force;
      a.vy += dy / dist * force;
      b.vx -= dx / dist * force;
      b.vy -= dy / dist * force;
    }

    // Column constraint
    for (let i = 0; i < pos.length; i++) {
      const col = typeOrder[nodes[i].type];
      const targetX = 60 + col * ((W - 120) / cols);
      pos[i].vx += (targetX - pos[i].x) * 0.08 * alpha;
    }

    // Apply
    for (let i = 0; i < pos.length; i++) {
      pos[i].vx *= 0.75;
      pos[i].vy *= 0.75;
      pos[i].x += pos[i].vx;
      pos[i].y += pos[i].vy;
      pos[i].x = Math.max(35, Math.min(W - 35, pos[i].x));
      pos[i].y = Math.max(25, Math.min(H - 25, pos[i].y));
    }
  }

  return pos.map(p => ({ x: p.x, y: p.y }));
}

// ── Property Panel ────────────────────────────────────────────────
function PropertyPanel({ node, chain }) {
  if (!node) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
      <Info size={28} style={{ marginBottom: 12, opacity: 0.3 }} />
      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
        Select a Node
      </div>
      <div style={{ fontSize: '0.72rem', lineHeight: 1.6 }}>
        Click any node in the graph to inspect its properties and connections.
      </div>
    </div>
  );

  const meta = NODE_TYPES[node.type];
  const IconComp = meta.icon;
  const connectedEdges = chain.edges.filter(e => e.from === node.id || e.to === node.id);
  const neighborIds = new Set(connectedEdges.flatMap(e => [e.from, e.to]).filter(n => n !== node.id));

  return (
    <div>
      {/* Node header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
        padding: '12px 14px', background: meta.dimBg,
        border: `1px solid ${meta.color}20`, borderRadius: 16,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 16, background: `${meta.color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IconComp size={15} color={meta.color} />
        </div>
        <div>
          <div style={{
            fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)',
            fontFamily: "'JetBrains Mono', monospace",
          }}>{node.label}</div>
          <div style={{
            fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: 1.5, color: meta.color,
          }}>{node.type}</div>
        </div>
      </div>

      {/* Property table */}
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: 16,
        border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 14,
      }}>
        {Object.entries(node.props).map(([key, value], i, arr) => (
          <div key={key} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 14px',
            borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
            fontSize: '0.72rem',
          }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 500, minWidth: 90 }}>{key}</span>
            <span style={{
              color: key === 'RiskScore'
                ? (value >= 80 ? '#f87171' : value >= 60 ? '#fb923c' : value >= 35 ? '#fbbf24' : '#34d399')
                : key === 'Status'
                ? (value === 'Cleared' ? '#34d399' : value === 'Blocked' ? '#f87171' : '#fbbf24')
                : key === 'Direction'
                ? (value === 'OUTGOING' ? '#f87171' : '#34d399')
                : 'var(--text-primary)',
              fontWeight: 600, textAlign: 'right', maxWidth: '55%', wordBreak: 'break-all',
              fontFamily: ['AccountNumber', 'ISIN', 'id'].includes(key)
                ? "'JetBrains Mono', monospace" : 'inherit',
              fontSize: ['AccountNumber', 'ISIN'].includes(key) ? '0.65rem' : 'inherit',
            }}>
              {key === 'Balance' || key === 'CurrentPrice' ? `$${Number(value).toLocaleString()}` : String(value)}
            </span>
          </div>
        ))}
      </div>

      {/* Connection stats */}
      <div style={{
        padding: '10px 14px', background: 'rgba(0,212,170,0.03)',
        border: '1px solid rgba(0,212,170,0.08)', borderRadius: 14,
        fontSize: '0.68rem',
      }}>
        <div style={{
          fontWeight: 700, color: '#00d4aa', fontSize: '0.58rem',
          fontFamily: "'JetBrains Mono', monospace", marginBottom: 6,
        }}>CONNECTIONS</div>
        <div style={{ display: 'flex', gap: 14, color: 'var(--text-secondary)' }}>
          <span><strong style={{ color: 'var(--text-primary)' }}>{connectedEdges.length}</strong> edges</span>
          <span><strong style={{ color: 'var(--text-primary)' }}>{neighborIds.size}</strong> neighbors</span>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// MAIN MODAL
// ════════════════════════════════════════════════════════════════════
export default function EntityChainModal({ person, onClose }) {
  const chain = useMemo(() => buildEntityChain(person), [person]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  const W = 780, H = 480;
  const positions = useMemo(() => computeLayout(chain.nodes, chain.edges, W, H), [chain]);

  const filteredNodes = useMemo(() => {
    if (activeFilter === 'all') return chain.nodes.map((_, i) => i);
    return chain.nodes.map((n, i) => n.type === activeFilter ? i : -1).filter(i => i >= 0);
  }, [chain, activeFilter]);

  const isVisible = (nodeIdx) => filteredNodes.includes(nodeIdx);

  const selected = selectedNode !== null ? chain.nodes[selectedNode] : null;

  // Count by type
  const typeCounts = {};
  for (const n of chain.nodes) typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'feed-enter 0.2s ease',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        borderRadius: 24,
        width: '94vw', maxWidth: 1200,
        height: '88vh', maxHeight: 750,
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 100px rgba(0,0,0,0.7), 0 0 80px rgba(0,212,170,0.03)',
        overflow: 'hidden',
      }}>
        {/* ── Header ────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 17,
              background: 'rgba(129,140,248,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <User size={16} color="#818cf8" />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                Entity Chain — <span style={{ color: '#00d4aa' }}>{person.name}</span>
              </h3>
              <p style={{
                fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 1,
                fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.5,
              }}>
                GROUP → PERSON → ACCOUNT → SECURITIES → TRANSACTIONS
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Legend */}
            <div style={{ display: 'flex', gap: 10 }}>
              {Object.entries(NODE_TYPES).map(([key, { color, label }]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 9, height: 9, borderRadius: '50%',
                    background: color, boxShadow: `0 0 5px ${color}40`,
                  }} />
                  <span style={{
                    fontSize: '0.58rem', fontWeight: 600,
                    color: 'var(--text-secondary)',
                  }}>{label}</span>
                </div>
              ))}
            </div>
            <button onClick={onClose} style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 12, width: 30, height: 30,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-secondary)',
            }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Navigation Menu (Filter Bar) ──────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 20px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg-card)',
        }}>
          {[
            { key: 'all', label: 'All Nodes', count: chain.nodes.length },
            ...Object.entries(NODE_TYPES).map(([key, { label }]) => ({
              key, label, count: typeCounts[key] || 0,
            })),
          ].map(({ key, label, count }) => {
            const isActive = activeFilter === key;
            const color = key === 'all' ? '#00d4aa' : NODE_TYPES[key]?.color || '#00d4aa';
            return (
              <button key={key} onClick={() => setActiveFilter(key)} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 20,
                background: isActive ? `${color}12` : 'transparent',
                border: `1px solid ${isActive ? `${color}30` : 'transparent'}`,
                color: isActive ? color : 'var(--text-muted)',
                fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.15s',
              }}>
                {key !== 'all' && (
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: NODE_TYPES[key]?.color,
                    opacity: isActive ? 1 : 0.5,
                  }} />
                )}
                {label}
                <span style={{
                  fontSize: '0.58rem', fontWeight: 700,
                  padding: '1px 5px', borderRadius: 8,
                  background: isActive ? `${color}15` : 'rgba(147,130,200,0.06)',
                  color: isActive ? color : 'var(--text-muted)',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>{count}</span>
              </button>
            );
          })}
          <span style={{
            marginLeft: 'auto', fontSize: '0.58rem',
            color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace",
          }}>
            {chain.txCount} TRANSACTIONS FOUND
          </span>
        </div>

        {/* ── Body: Graph + Panel ───────────────────────────────── */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* SVG Graph */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}
              style={{ background: 'rgba(5,3,12,0.5)' }}>
              {/* Edges */}
              {chain.edges.map((e, i) => {
                const from = positions[e.from];
                const to = positions[e.to];
                if (!from || !to) return null;
                const bothVisible = isVisible(e.from) && isVisible(e.to);
                const isHovered = hoveredNode === e.from || hoveredNode === e.to;
                const toColor = NODE_TYPES[chain.nodes[e.to]?.type]?.color || '#665e80';
                return (
                  <path key={i}
                    d={`M ${from.x} ${from.y} C ${(from.x + to.x) / 2} ${from.y}, ${(from.x + to.x) / 2} ${to.y}, ${to.x} ${to.y}`}
                    fill="none"
                    stroke={isHovered && bothVisible ? toColor : 'rgba(147,130,200,0.1)'}
                    strokeWidth={isHovered && bothVisible ? 2 : 1}
                    opacity={bothVisible ? 1 : 0.15}
                    style={{ transition: 'stroke 0.2s, opacity 0.3s' }}
                  />
                );
              })}
              {/* Nodes */}
              {chain.nodes.map((node, i) => {
                const pos = positions[i];
                if (!pos) return null;
                const meta = NODE_TYPES[node.type];
                const visible = isVisible(i);
                const isSelected = selectedNode === i;
                const isHovered = hoveredNode === i;
                const r = { Group: 14, Person: 13, Account: 11, Securities: 9, Transaction: 8 }[node.type];
                return (
                  <g key={i}
                    onClick={() => visible && setSelectedNode(isSelected ? null : i)}
                    onMouseEnter={() => visible && setHoveredNode(i)}
                    onMouseLeave={() => setHoveredNode(null)}
                    style={{ cursor: visible ? 'pointer' : 'default' }}
                    opacity={visible ? 1 : 0.12}
                  >
                    {(isSelected || isHovered) && visible && (
                      <circle cx={pos.x} cy={pos.y} r={r + 5}
                        fill="none" stroke={meta.color} strokeWidth="1.5" opacity={0.35}
                        style={{ filter: `drop-shadow(0 0 6px ${meta.color})` }}
                      />
                    )}
                    <circle cx={pos.x} cy={pos.y} r={r}
                      fill={meta.color}
                      opacity={isSelected ? 1 : isHovered ? 0.9 : 0.7}
                      style={{
                        filter: isSelected ? `drop-shadow(0 0 8px ${meta.color})` : 'none',
                        transition: 'opacity 0.2s',
                      }}
                    />
                    {visible && (r >= 10 || isHovered) && (
                      <text x={pos.x} y={pos.y + r + 12}
                        textAnchor="middle" fill="var(--text-secondary)"
                        fontSize="7" fontWeight="600"
                        fontFamily="'JetBrains Mono', monospace"
                        opacity={isHovered || isSelected ? 1 : 0.6}
                      >
                        {node.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Detail Panel */}
          <div style={{
            width: 310, borderLeft: '1px solid var(--border)',
            padding: 16, overflowY: 'auto', background: 'var(--bg-card)',
          }}>
            <PropertyPanel node={selected} chain={chain} />
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────── */}
        <div style={{
          padding: '8px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 16, background: 'var(--bg-secondary)',
          fontSize: '0.58rem', color: 'var(--text-muted)',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          <span>NODES: <strong style={{ color: 'var(--text-secondary)' }}>{chain.nodes.length}</strong></span>
          <span>EDGES: <strong style={{ color: 'var(--text-secondary)' }}>{chain.edges.length}</strong></span>
          <span>DEPTH: <strong style={{ color: 'var(--text-secondary)' }}>5</strong></span>
          <span>LAYOUT: FORCE-DIRECTED</span>
          <span style={{ marginLeft: 'auto' }}>
            {Object.entries(typeCounts).map(([k, v]) => `${k}:${v}`).join(' · ')}
          </span>
        </div>
      </div>
    </div>
  );
}
