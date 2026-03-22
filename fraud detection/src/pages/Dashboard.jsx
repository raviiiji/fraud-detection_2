import { useEffect, useState, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  DollarSign, TrendingUp, ShieldAlert, AlertTriangle, Activity,
  ArrowUpRight, ArrowDownRight, Eye, Brain, Heart, Moon,
  Shield, Info, Zap, Sparkles, Lock, HeartPulse,
} from 'lucide-react';
import { kpiData, transactions, volumeOverTime, typologyBreakdown, checkBackendStatus, fetchTransactions } from '../data';

// ── Animated Counter ──────────────────────────────────────────────
function AnimatedCounter({ value, prefix = '', suffix = '', duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const end = typeof value === 'string' ? parseFloat(value) : value;
    const startTime = performance.now();
    const animate = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(end * eased);
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [value, duration]);
  const formatted = display >= 1000000
    ? `${(display / 1000000).toFixed(1)}M`
    : display >= 1000
    ? `${(display / 1000).toFixed(1)}K`
    : display.toFixed(display % 1 !== 0 ? 1 : 0);
  return <span>{prefix}{formatted}{suffix}</span>;
}

// ── Sentience Ring ────────────────────────────────────────────────
function SentienceRing({ readiness = 82 }) {
  const isReady = readiness >= 60;
  const color = isReady ? '#00d4aa' : '#fbbf24';
  const label = isReady ? 'Optimal' : 'Elevated Stress';
  const [ripple, setRipple] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setRipple(true);
      setTimeout(() => setRipple(false), 1200);
    }, 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '28px 0',
    }}>
      <div style={{
        position: 'relative', width: 200, height: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Outer glow ring */}
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%',
          background: `conic-gradient(${color} 0%, transparent 70%)`,
          opacity: 0.15,
          animation: 'ring-rotate 8s linear infinite',
        }} />
        {/* Main ring */}
        <svg width="200" height="200" viewBox="0 0 200 200" style={{ position: 'absolute', animation: 'breathe 4s ease-in-out infinite' }}>
          <defs>
            <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.6" />
              <stop offset="50%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="85" fill="none" stroke="url(#ringGrad)" strokeWidth="6"
            strokeDasharray={`${readiness * 5.34} 534`} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: 'stroke-dasharray 1s ease' }}
          />
          <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(147,130,200,0.06)" strokeWidth="2" />
        </svg>
        {/* Ripple */}
        {ripple && <div style={{
          position: 'absolute', width: 120, height: 120,
          borderRadius: '50%', border: `2px solid ${color}`,
          animation: 'ripple 1.2s ease-out forwards',
        }} />}
        {/* Center content */}
        <div style={{ textAlign: 'center', zIndex: 1 }}>
          <HeartPulse size={20} color={color} style={{ marginBottom: 4 }} />
          <div style={{
            fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)',
            fontVariantNumeric: 'tabular-nums', lineHeight: 1,
          }}>{readiness}</div>
          <div style={{
            fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: 1.5, color, marginTop: 4,
            fontFamily: "'JetBrains Mono', monospace",
          }}>Readiness</div>
        </div>
      </div>
      <div style={{
        marginTop: 12, display: 'flex', alignItems: 'center', gap: 6,
        fontSize: '0.72rem', color,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%', background: color,
          boxShadow: `0 0 8px ${color}`,
          animation: 'aura-pulse 3s ease-in-out infinite',
        }} />
        Decision Readiness: {label}
      </div>
    </div>
  );
}

// ── Sankey Diagram ────────────────────────────────────────────────
function SankeyDiagram() {
  const flows = [
    { from: 'Salary', to: 'Needs', value: 45, color: '#00d4aa' },
    { from: 'Salary', to: 'Savings', value: 25, color: '#818cf8' },
    { from: 'Salary', to: 'Investments', value: 20, color: '#f0b429' },
    { from: 'Dividends', to: 'Investments', value: 8, color: '#f0b429' },
    { from: 'Freelance', to: 'Needs', value: 12, color: '#00d4aa' },
    { from: 'Freelance', to: 'Savings', value: 5, color: '#818cf8' },
    { from: 'Needs', to: 'Housing', value: 28, color: '#00d4aa', stress: false },
    { from: 'Needs', to: 'Utilities', value: 12, color: '#00d4aa', stress: true },
    { from: 'Needs', to: 'Food', value: 17, color: '#00d4aa', stress: false },
    { from: 'Savings', to: 'Emergency', value: 15, color: '#818cf8', stress: false },
    { from: 'Savings', to: 'Term Dep.', value: 15, color: '#818cf8', stress: false },
    { from: 'Investments', to: 'ETFs', value: 18, color: '#f0b429', stress: false },
    { from: 'Investments', to: 'Crypto', value: 10, color: '#f0b429', stress: true },
  ];

  const leftNodes = ['Salary', 'Dividends', 'Freelance'];
  const midNodes = ['Needs', 'Savings', 'Investments'];
  const rightNodes = ['Housing', 'Utilities', 'Food', 'Emergency', 'Term Dep.', 'ETFs', 'Crypto'];

  const nodeY = (arr, idx) => 26 + (idx * (210 / Math.max(arr.length - 1, 1)));
  const W = 600, H = 260;

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '18px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: '0.88rem', fontWeight: 600 }}>
        <Zap size={16} style={{ color: '#00d4aa' }} />
        Fund Flow Architecture
        <span style={{ marginLeft: 'auto', fontSize: '0.6rem', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)' }}>
          INCOME → ALLOCATION → PRODUCTS
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
        {/* Flow ribbons */}
        {flows.map((f, i) => {
          const fromArr = leftNodes.includes(f.from) ? leftNodes : midNodes;
          const toArr = midNodes.includes(f.to) ? midNodes : rightNodes;
          const x1 = leftNodes.includes(f.from) ? 75 : 270;
          const x2 = midNodes.includes(f.to) ? 270 : 525;
          const y1 = nodeY(fromArr, fromArr.indexOf(f.from));
          const y2 = nodeY(toArr, toArr.indexOf(f.to));
          const thick = Math.max(f.value * 0.4, 2);
          return (
            <g key={i}>
              <path
                d={`M ${x1} ${y1} C ${x1 + 80} ${y1}, ${x2 - 80} ${y2}, ${x2} ${y2}`}
                fill="none" stroke={f.color} strokeWidth={thick}
                opacity={0.25} strokeLinecap="round"
              />
              {f.stress && (
                <circle cx={x2 - 12} cy={y2 - thick / 2 - 4} r="3"
                  fill="#fbbf24" opacity="0.8">
                  <title>High stress detected during this flow</title>
                </circle>
              )}
            </g>
          );
        })}
        {/* Left nodes */}
        {leftNodes.map((n, i) => (
          <g key={n}>
            <rect x={10} y={nodeY(leftNodes, i) - 10} width={60} height={20} rx={10} fill="rgba(0,212,170,0.08)" stroke="rgba(0,212,170,0.2)" strokeWidth="1" />
            <text x={40} y={nodeY(leftNodes, i) + 4} textAnchor="middle" fill="#9b93b4" fontSize="9" fontWeight="600">{n}</text>
          </g>
        ))}
        {/* Mid nodes */}
        {midNodes.map((n, i) => {
          const cols = { Needs: '#00d4aa', Savings: '#818cf8', Investments: '#f0b429' };
          return (
            <g key={n}>
              <rect x={240} y={nodeY(midNodes, i) - 12} width={60} height={24} rx={12} fill={`${cols[n]}10`} stroke={`${cols[n]}33`} strokeWidth="1" />
              <text x={270} y={nodeY(midNodes, i) + 4} textAnchor="middle" fill={cols[n]} fontSize="9" fontWeight="700">{n}</text>
            </g>
          );
        })}
        {/* Right nodes */}
        {rightNodes.map((n, i) => {
          const isStress = n === 'Utilities' || n === 'Crypto';
          return (
            <g key={n}>
              <rect x={525} y={nodeY(rightNodes, i) - 9} width={65} height={18} rx={9}
                fill={isStress ? 'rgba(251,191,36,0.06)' : 'rgba(147,130,200,0.04)'}
                stroke={isStress ? 'rgba(251,191,36,0.15)' : 'rgba(147,130,200,0.08)'} strokeWidth="1" />
              <text x={557} y={nodeY(rightNodes, i) + 3.5} textAnchor="middle" fill={isStress ? '#fbbf24' : '#7d74a0'} fontSize="8" fontWeight="600">{n}</text>
              {isStress && <circle cx={596} cy={nodeY(rightNodes, i)} r="2.5" fill="#fbbf24" opacity="0.7" />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Insight Card ──────────────────────────────────────────────────
function InsightCard({ icon, title, message, color = '#00d4aa', delay = 0 }) {
  const [showTooltip, setShowTooltip] = useState(false);
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '16px 18px',
      animation: `float-card 6s ease-in-out infinite`,
      animationDelay: `${delay}s`,
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 14,
          background: `${color}12`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: 3, color: 'var(--text-primary)' }}>
            {title}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {message}
          </div>
        </div>
        <button onClick={() => setShowTooltip(!showTooltip)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', padding: 2,
        }}>
          <Info size={12} />
        </button>
      </div>
      {showTooltip && (
        <div style={{
          marginTop: 10, padding: '10px 12px',
          background: 'rgba(0,212,170,0.04)',
          border: '1px solid rgba(0,212,170,0.1)',
          borderRadius: 14, fontSize: '0.65rem',
          color: 'var(--text-secondary)', lineHeight: 1.6,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          <span style={{ color: '#00d4aa', fontWeight: 700, fontSize: '0.6rem' }}>WHITEBOX EXPLANATION</span><br />
          {title === 'Trade Lock Active'
            ? 'This 24-hour trade lock is active because your sleep data is 40% below your baseline, which correlates with impulsive risk-taking.'
            : title === 'Emotional Stability'
            ? 'Your heart rate variability (HRV) has been consistent during the last 3 bill payments, indicating low financial stress.'
            : 'This insight is derived from cross-referencing your behavioral biometrics with historical transaction patterns.'}
        </div>
      )}
    </div>
  );
}

// ── Custom Tooltip ────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(13,11,24,0.95)', border: '1px solid rgba(0,212,170,0.12)',
      borderRadius: 14, padding: '12px 16px', backdropFilter: 'blur(8px)',
    }}>
      <p style={{ color: '#7d74a0', fontSize: '0.7rem', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: '0.78rem', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
          {p.name}: ${(p.value / 1000).toFixed(0)}K
        </p>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const [backendStatus, setBackendStatus] = useState(null);
  const [liveTxns, setLiveTxns] = useState(null);
  const [sseTxns, setSseTxns] = useState([]);
  const [sseConnected, setSseConnected] = useState(false);
  const [anxiousMode, setAnxiousMode] = useState(false);
  const [readiness] = useState(82);

  useEffect(() => {
    checkBackendStatus().then(setBackendStatus);
    fetchTransactions().then(result => {
      if (result.source !== 'mock') setLiveTxns(result.data);
    });
    const eventSource = new EventSource('/api/stream/transactions');
    let pollTimer = null;

    eventSource.addEventListener('transaction', (e) => {
      const tx = JSON.parse(e.data);
      setSseTxns(prev => [tx, ...prev].slice(0, 50));
    });
    eventSource.onopen = () => setSseConnected(true);
    eventSource.onerror = () => {
      setSseConnected(false);
      // Fallback to polling on Vercel (no SSE support)
      eventSource.close();
      const token = localStorage.getItem('fs_token');
      pollTimer = setInterval(async () => {
        try {
          const res = await fetch('/api/stream/poll?count=1', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (res.ok) {
            const txns = await res.json();
            txns.forEach(tx => setSseTxns(prev => [tx, ...prev].slice(0, 50)));
            setSseConnected(true);
          }
        } catch {}
      }, 4000);
    };
    return () => { eventSource.close(); if (pollTimer) clearInterval(pollTimer); };
  }, []);

  const recentTxns = sseTxns.length > 0 ? sseTxns.slice(0, 12) : (liveTxns || transactions).slice(0, 12);
  const dataSource = sseTxns.length > 0 ? 'sse' : liveTxns ? 'sqlite' : 'mock';

  // ── Anxious Mode ────────────────────────────────────────────────
  if (anxiousMode) {
    return (
      <div style={{ padding: '40px 20px', maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
        <SentienceRing readiness={38} />
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
          We've Simplified Things
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: 32, lineHeight: 1.6 }}>
          Elevated stress patterns detected. Complex views have been paused to protect your decision quality.
        </p>
        {[
          { icon: <Heart size={20} />, label: 'Get Mindfulness Support', color: '#818cf8' },
          { icon: <Shield size={20} />, label: 'Simplified Portfolio Overview', color: '#00d4aa' },
          { icon: <ArrowUpRight size={20} />, label: 'Next Action Step', color: '#f0b429' },
        ].map(({ icon, label, color }) => (
          <button key={label} onClick={() => label === 'Simplified Portfolio Overview' && setAnxiousMode(false)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: '100%', padding: '18px 24px', marginBottom: 12,
            background: `${color}08`, border: `1px solid ${color}20`,
            borderRadius: 24, color: 'var(--text-primary)',
            fontSize: '0.92rem', fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}40`; e.currentTarget.style.boxShadow = `0 0 20px ${color}10`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = `${color}20`; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <span style={{ color }}>{icon}</span>
            {label}
          </button>
        ))}
        <button onClick={() => setAnxiousMode(false)} style={{
          marginTop: 16, background: 'none', border: 'none',
          color: 'var(--text-muted)', fontSize: '0.72rem', cursor: 'pointer',
          textDecoration: 'underline',
        }}>
          Return to full dashboard
        </button>
      </div>
    );
  }

  // ── Main Dashboard ──────────────────────────────────────────────
  return (
    <div>
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 2 }}>
            AuraWealth Command Center
          </h2>
          <p style={{ color: 'var(--text-label)', fontSize: '0.82rem' }}>
            Sentience-aware fund tracking & affective fraud detection
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Emotion Active indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 'var(--radius-full)',
            background: 'rgba(0,212,170,0.06)',
            border: '1px solid rgba(0,212,170,0.12)',
            animation: 'glow-pulse 4s ease-in-out infinite',
          }}>
            <Brain size={13} style={{ color: '#00d4aa' }} />
            <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#00d4aa', fontFamily: "'JetBrains Mono', monospace" }}>
              EMOTION ACTIVE
            </span>
          </div>
          {/* Biometric lock */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', borderRadius: 'var(--radius-full)',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
          }}>
            <Lock size={11} style={{ color: 'var(--status-safe)' }} />
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>BIOMETRIC OK</span>
          </div>
          {/* Anxious mode toggle */}
          <button onClick={() => setAnxiousMode(true)} style={{
            padding: '6px 12px', borderRadius: 'var(--radius-full)',
            background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.12)',
            color: '#fbbf24', fontSize: '0.6rem', fontWeight: 600, cursor: 'pointer',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            ⚡ ANXIOUS MODE
          </button>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="kpi-card indigo">
          <div className="kpi-header">
            <span className="kpi-label">Net Worth</span>
            <div className="kpi-icon"><DollarSign size={16} /></div>
          </div>
          <div className="kpi-value"><AnimatedCounter value={kpiData.totalVolume} prefix="$" /></div>
          <div className="kpi-trend up"><ArrowUpRight size={13} /> 12.5% growth</div>
        </div>
        <div className="kpi-card amber">
          <div className="kpi-header">
            <span className="kpi-label">Weekly Burn Rate</span>
            <div className="kpi-icon"><TrendingUp size={16} /></div>
          </div>
          <div className="kpi-value"><AnimatedCounter value={12840} prefix="$" /></div>
          <div className="kpi-trend down"><ArrowDownRight size={13} /> 3.2% vs avg</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-header">
            <span className="kpi-label">Threat Score</span>
            <div className="kpi-icon"><AlertTriangle size={16} /></div>
          </div>
          <div className="kpi-value"><AnimatedCounter value={parseFloat(kpiData.fraudRate)} suffix="%" /></div>
          <div className="kpi-trend down"><ArrowDownRight size={13} /> 2.3% reduction</div>
        </div>
        <div className="kpi-card emerald">
          <div className="kpi-header">
            <span className="kpi-label">Active Alerts</span>
            <div className="kpi-icon"><ShieldAlert size={16} /></div>
          </div>
          <div className="kpi-value"><AnimatedCounter value={kpiData.activeAlerts} /></div>
          <div className="kpi-trend down"><ArrowDownRight size={13} /> 8 resolved today</div>
        </div>
      </div>

      {/* Center: Ring + Insights */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px 1fr', gap: 14, marginBottom: 18 }}>
        {/* Sankey */}
        <SankeyDiagram />

        {/* Sentience Ring */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center',
          animation: 'glow-pulse 6s ease-in-out infinite',
        }}>
          <div style={{
            fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4,
            fontFamily: "'JetBrains Mono', monospace",
          }}>Financial Twin</div>
          <SentienceRing readiness={readiness} />
        </div>

        {/* Insight Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <InsightCard
            icon={<Sparkles size={14} style={{ color: '#00d4aa' }} />}
            title="Emotional Stability"
            message="Your heart rate during your last three bills remained stable. Great consistency!"
            color="#00d4aa"
            delay={0}
          />
          <InsightCard
            icon={<Moon size={14} style={{ color: '#818cf8' }} />}
            title="Trade Lock Active"
            message="A 24hr cooling-off period is active. Poor sleep pattern detected in last 48hrs."
            color="#818cf8"
            delay={1.5}
          />
          <InsightCard
            icon={<Shield size={14} style={{ color: '#f0b429' }} />}
            title="Circuit Breaker Ready"
            message="Emotional circuit breaker is armed. High-risk trades will require biometric confirmation."
            color="#f0b429"
            delay={3}
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-title">
            <TrendingUp size={16} style={{ color: '#00d4aa' }} />
            Transaction Volume (30-Day)
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={volumeOverTime}>
              <defs>
                <linearGradient id="gradVolume" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00d4aa" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#00d4aa" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradFlagged" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f87171" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(147,130,200,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#665e80', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#665e80', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000000).toFixed(1)}M`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="volume" stroke="#00d4aa" fill="url(#gradVolume)" strokeWidth={2} name="Volume" />
              <Area type="monotone" dataKey="flagged" stroke="#f87171" fill="url(#gradFlagged)" strokeWidth={1.5} name="Flagged" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-title">
            <Eye size={16} style={{ color: '#818cf8' }} />
            Threat Typology
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={typologyBreakdown} cx="50%" cy="45%" innerRadius={50} outerRadius={82} paddingAngle={3} dataKey="value">
                {typologyBreakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'rgba(13,11,24,0.95)', border: '1px solid rgba(0,212,170,0.12)', borderRadius: 14, color: '#ede8f5' }} />
              <Legend verticalAlign="bottom" iconSize={7} wrapperStyle={{ fontSize: '0.68rem', color: '#9b93b4' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Neural Transaction Stream */}
      <div className="glass-card" style={{ animation: 'glow-pulse 8s ease-in-out infinite' }}>
        <div className="chart-title" style={{ marginBottom: 14 }}>
          <Activity size={16} style={{ color: '#00d4aa' }} />
          Neural Transaction Stream
          <span style={{
            marginLeft: 'auto', fontSize: '0.6rem',
            fontFamily: "'JetBrains Mono', monospace",
            color: sseConnected ? '#00d4aa' : '#fbbf24',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: sseConnected ? '#00d4aa' : '#fbbf24',
              animation: sseConnected ? 'aura-pulse 3s ease-in-out infinite' : 'none',
              boxShadow: sseConnected ? '0 0 8px rgba(0,212,170,0.4)' : 'none',
            }} />
            {sseConnected ? 'STREAMING' : 'BUFFERING'}
          </span>
        </div>
        <div className="live-feed">
          {recentTxns.map((tx, i) => (
            <div className="feed-item" key={tx.id} style={{ animationDelay: `${i * 0.04}s` }}>
              <div className="feed-icon" style={{
                background: tx.isFraud ? 'var(--status-danger-dim)' : 'var(--aura-dim)',
                color: tx.isFraud ? 'var(--status-danger)' : 'var(--aura)',
                borderRadius: 14,
              }}>
                {tx.isFraud ? <AlertTriangle size={14} /> : <ArrowUpRight size={14} />}
              </div>
              <div className="feed-details">
                <div className="feed-title">{tx.sender.name} → {tx.receiver.name}</div>
                <div className="feed-meta">{tx.id} · {tx.channel} · {new Date(tx.timestamp).toLocaleTimeString()}</div>
              </div>
              <span className={`risk-badge ${tx.riskScore >= 80 ? 'critical' : tx.riskScore >= 60 ? 'high' : tx.riskScore >= 35 ? 'medium' : 'low'}`}>
                {tx.riskScore}
              </span>
              <div className="feed-amount" style={{ color: tx.isFraud ? 'var(--status-danger)' : 'var(--text-primary)' }}>
                {tx.currency} {tx.amount.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
