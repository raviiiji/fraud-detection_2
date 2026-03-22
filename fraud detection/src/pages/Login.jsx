import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Lock, AlertCircle, Activity, Fingerprint } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (user, pass) => {
    setUsername(user);
    setPassword(pass);
    setError('');
    setLoading(true);
    try {
      await login(user, pass);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--bg-void)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient glow effects */}
      <div style={{
        position: 'absolute', top: '-20%', left: '-10%',
        width: '50%', height: '60%',
        background: 'radial-gradient(ellipse, rgba(0,212,170,0.06), transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', right: '-10%',
        width: '50%', height: '60%',
        background: 'radial-gradient(ellipse, rgba(129,140,248,0.04), transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Left Panel — branding */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ maxWidth: 440 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: 'linear-gradient(135deg, #00d4aa, #00a388)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 30px rgba(0,212,170,0.2)',
            }}>
              <Shield size={22} color="#080510" />
            </div>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>FraudShield</div>
              <div style={{ fontSize: '0.6rem', color: '#00d4aa', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600 }}>
                Sentience-First Architecture
              </div>
            </div>
          </div>

          <h1 style={{
            fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.15,
            color: 'var(--text-primary)', marginBottom: 16,
            letterSpacing: '-0.03em',
          }}>
            Affective Intelligence<br />
            <span style={{ color: '#00d4aa' }}>for Financial Defense</span>
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: 28 }}>
            Neural-symbolic fraud detection powered by behavioral biometrics,
            emotional circuit breakers, and real-time risk scoring across
            multi-jurisdictional transaction flows.
          </p>

          {/* Readiness indicators */}
          <div style={{ display: 'flex', gap: 20 }}>
            {[
              { label: 'ML Engine', status: 'Active', color: '#00d4aa' },
              { label: 'Graph DB', status: 'Ready', color: '#818cf8' },
              { label: 'SSE Stream', status: 'Live', color: '#fbbf24' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: s.color,
                  boxShadow: `0 0 8px ${s.color}`,
                }} />
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{s.label}</span>
                <span style={{
                  fontSize: '0.6rem', fontWeight: 700, color: s.color,
                  textTransform: 'uppercase', letterSpacing: 0.5,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — login form */}
      <div style={{
        width: 420, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '40px 36px',
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border)',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>
            Secure Access
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Authenticate to enter the monitoring console
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 8,
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.15)',
              color: '#f87171', fontSize: '0.78rem',
              marginBottom: 16,
            }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block', fontSize: '0.68rem', color: 'var(--text-label)',
              marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8,
            }}>Username</label>
            <div style={{ position: 'relative' }}>
              <User size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Enter username" required
                style={{
                  width: '100%', padding: '10px 12px 10px 34px',
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text-primary)',
                  fontSize: '0.85rem', outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = '#00d4aa'; e.target.style.boxShadow = '0 0 0 2px rgba(0,212,170,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 22 }}>
            <label style={{
              display: 'block', fontSize: '0.68rem', color: 'var(--text-label)',
              marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8,
            }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Enter password" required
                style={{
                  width: '100%', padding: '10px 12px 10px 34px',
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text-primary)',
                  fontSize: '0.85rem', outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = '#00d4aa'; e.target.style.boxShadow = '0 0 0 2px rgba(0,212,170,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '11px',
            background: loading ? 'var(--bg-surface)' : 'linear-gradient(135deg, #00d4aa, #00a388)',
            border: 'none', borderRadius: 8,
            color: '#080510', fontSize: '0.88rem', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 0 20px rgba(0,212,170,0.15)',
            transition: 'all 0.2s',
          }}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Quick Access */}
        <div style={{ marginTop: 24 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
          }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.2 }}>Demo Access</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { user: 'admin', pass: 'admin123', label: 'Administrator', icon: <Fingerprint size={14} />, desc: 'Full system control' },
              { user: 'analyst', pass: 'analyst123', label: 'Analyst', icon: <Activity size={14} />, desc: 'Investigation ops' },
            ].map(({ user, pass, label, icon, desc }) => (
              <button key={user} onClick={() => quickLogin(user, pass)} style={{
                padding: '10px 12px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text-secondary)',
                cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,212,170,0.2)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0,212,170,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.8rem' }}>
                  {icon} {label}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{desc}</div>
              </button>
            ))}
          </div>
        </div>

        <p style={{
          textAlign: 'center', marginTop: 28, fontSize: '0.6rem',
          color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace",
        }}>
          v3.0 · AML/CFT COMPLIANT · GDPR ARTICLE 9
        </p>
      </div>
    </div>
  );
}
