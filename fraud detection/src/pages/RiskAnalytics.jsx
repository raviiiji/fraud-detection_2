import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, RadialBarChart, RadialBar, Legend,
} from 'recharts';
import { BarChart3, Target, TrendingUp, Clock, Zap, Shield, Database } from 'lucide-react';
import { riskDistribution, featureImportance as mockFeatureImportance, temporalAnomalies, kpiData, transactions, fetchAnalytics } from '../data';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(17,24,39,0.95)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '10px',
      padding: '10px 14px',
      backdropFilter: 'blur(12px)',
    }}>
      <p style={{ color: '#94a3b8', fontSize: '0.72rem', marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill, fontSize: '0.82rem', fontWeight: 600 }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export default function RiskAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [dataSource, setDataSource] = useState('mock');

  useEffect(() => {
    fetchAnalytics().then(result => {
      setAnalytics(result);
      setDataSource(result.source);
    });
  }, []);

  const recall = analytics?.recall || '87.5';
  const precision = analytics?.precision || '96.3';
  const prAuc = analytics?.prAuc || 0.923;
  const featureImportance = analytics?.featureImportance || mockFeatureImportance;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2>Risk Analytics</h2>
            <p>Model performance metrics, risk distributions, and feature analysis</p>
          </div>
          <div style={{
            display: 'flex', gap: 6, alignItems: 'center',
            padding: '5px 12px', borderRadius: 'var(--radius-sm)',
            background: dataSource === 'live' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
            border: `1px solid ${dataSource === 'live' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
            fontSize: '0.72rem', fontWeight: 600,
            color: dataSource === 'live' ? 'var(--accent-emerald)' : 'var(--accent-amber)',
          }}>
            <Database size={12} />
            {dataSource === 'live' ? 'Live ML Model' : 'Mock Data'}
          </div>
        </div>
      </div>

      {/* Model Metrics */}
      <div className="grid-3 mb-28">
        <div className="glass-card delay-1" style={{ textAlign: 'center' }}>
          <div className="metric-gauge">
            <div className="gauge-value">{recall}%</div>
            <div className="gauge-label">Recall (Sensitivity)</div>
          </div>
          <div style={{ padding: '0 20px' }}>
            <div className="progress-bar" style={{ marginBottom: 8 }}>
              <div className="progress-fill" style={{ width: `${recall}%` }}></div>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Percentage of actual fraud cases detected. Target: &gt;85%
            </p>
          </div>
        </div>

        <div className="glass-card delay-2" style={{ textAlign: 'center' }}>
          <div className="metric-gauge">
            <div className="gauge-value">{precision}%</div>
            <div className="gauge-label">Precision</div>
          </div>
          <div style={{ padding: '0 20px' }}>
            <div className="progress-bar" style={{ marginBottom: 8 }}>
              <div className="progress-fill" style={{ width: `${precision}%`, background: 'var(--gradient-success)' }}></div>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Accuracy of fraud flags. High precision reduces investigator fatigue.
            </p>
          </div>
        </div>

        <div className="glass-card delay-3" style={{ textAlign: 'center' }}>
          <div className="metric-gauge">
            <div className="gauge-value">{prAuc}</div>
            <div className="gauge-label">PR-AUC Score</div>
          </div>
          <div style={{ padding: '0 20px' }}>
            <div className="progress-bar" style={{ marginBottom: 8 }}>
              <div className="progress-fill" style={{ width: `${prAuc * 100}%`, background: 'var(--gradient-info)' }}></div>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Superior to ROC-AUC for imbalanced banking datasets.
            </p>
          </div>
        </div>
      </div>

      {/* Risk Distribution + Feature Importance */}
      <div className="grid-2 mb-28">
        <div className="chart-card delay-4">
          <div className="chart-title">
            <BarChart3 size={18} style={{ color: 'var(--accent-indigo)' }} />
            Risk Score Distribution
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={riskDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="range" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="count"
                name="Transactions"
                radius={[4, 4, 0, 0]}
                fill="#6366f1"
              >
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card delay-5">
          <div className="chart-title">
            <Target size={18} style={{ color: 'var(--accent-violet)' }} />
            Feature Importance (GNN Model)
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={featureImportance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 0.25]} />
              <YAxis dataKey="feature" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={140} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="importance" name="Importance" radius={[0, 4, 4, 0]}>
                {featureImportance.map((entry, i) => (
                  <rect key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Temporal Anomaly Timeline */}
      <div className="chart-card delay-6">
        <div className="chart-title">
          <Clock size={18} style={{ color: 'var(--accent-cyan)' }} />
          Temporal Anomaly Pattern (ATM-GAD)
          <span style={{
            marginLeft: 'auto',
            fontSize: '0.72rem',
            padding: '3px 10px',
            background: 'rgba(34,211,238,0.1)',
            color: 'var(--accent-cyan)',
            borderRadius: 20,
            fontWeight: 600,
          }}>
            24-Hour Analysis
          </span>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={temporalAnomalies}>
            <defs>
              <linearGradient id="gradNormal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradAnomaly" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="normal" stroke="#10b981" fill="url(#gradNormal)" strokeWidth={2} name="Normal Activity" />
            <Area type="monotone" dataKey="anomalous" stroke="#ef4444" fill="url(#gradAnomaly)" strokeWidth={2} name="Anomalous Activity" />
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 20, marginTop: 12, justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <div style={{ width: 12, height: 3, background: '#10b981', borderRadius: 2 }}></div>
            Normal Activity
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <div style={{ width: 12, height: 3, background: '#ef4444', borderRadius: 2 }}></div>
            Anomalous Activity (Dormant Hours Spike)
          </div>
        </div>
      </div>

      {/* Algorithm Cards */}
      <div className="grid-3 mt-20">
        <div className="glass-card delay-1">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-indigo)' }}>
              <Zap size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>GPA</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Graph Path Aggregation</div>
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Samples variable-length paths to capture structural associations hidden 10+ hops away. Improves Average Precision by up to 15%.
          </p>
        </div>

        <div className="glass-card delay-2">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'rgba(34,211,238,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}>
              <Clock size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>ATM-GAD</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Adaptive Temporal Motifs</div>
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Identifies recurring telltale subgraphs in real-time by monitoring account-specific intervals of anomalous activity.
          </p>
        </div>

        <div className="glass-card delay-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-emerald)' }}>
              <Shield size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>WCC</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Weakly Connected Components</div>
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Partitions the graph into isolated clusters. Large clusters of unrelated accounts indicate organized fraud rings.
          </p>
        </div>
      </div>
    </div>
  );
}
