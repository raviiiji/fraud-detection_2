import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, Network, BarChart3,
  ShieldAlert, FileText, Shield, Activity, LogOut, User,
  Brain,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/', label: 'Command Center', icon: LayoutDashboard },
  { path: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { path: '/network', label: 'Neural Graph', icon: Network },
  { path: '/analytics', label: 'Risk Analytics', icon: BarChart3 },
  { path: '/alerts', label: 'Threat Alerts', icon: ShieldAlert },
  { path: '/reports', label: 'SAR Reports', icon: FileText },
];

const roleMeta = {
  admin: { label: 'ADMIN', color: '#00d4aa' },
  analyst: { label: 'ANALYST', color: '#818cf8' },
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const rm = roleMeta[user?.role] || roleMeta.analyst;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <Shield size={18} color="#080510" />
        </div>
        <div className="logo-text">
          <h1>FraudShield</h1>
          <span>Sentience Engine</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            end={item.path === '/'}
          >
            <span className="nav-icon"><item.icon size={16} /></span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {user && (
          <div style={{
            padding: '12px 14px',
            background: 'var(--bg-card)',
            borderRadius: 10,
            marginBottom: 10,
            border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'linear-gradient(135deg, #00d4aa, #00a388)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 0 12px rgba(0,212,170,0.15)',
              }}>
                <User size={13} color="#080510" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.78rem', fontWeight: 600,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {user.name}
                </div>
                <span style={{
                  fontSize: '0.55rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: 1,
                  color: rm.color,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {rm.label}
                </span>
              </div>
            </div>
            <button onClick={logout} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              width: '100%', marginTop: 10, padding: '6px 0',
              background: 'none', border: 'none',
              color: 'var(--text-muted)', fontSize: '0.7rem',
              cursor: 'pointer', justifyContent: 'center',
              borderTop: '1px solid var(--border)', paddingTop: 10,
              transition: 'color 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <LogOut size={12} /> Disconnect
            </button>
          </div>
        )}
        <div className="system-status">
          <span className="status-dot"></span>
          <Brain size={11} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.62rem' }}>
            Neural Engine Active
          </span>
        </div>
      </div>
    </aside>
  );
}
