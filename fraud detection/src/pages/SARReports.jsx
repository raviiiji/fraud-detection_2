import { useState } from 'react';
import { FileText, Calendar, User, DollarSign, Globe, Clock, X, Sparkles, Send } from 'lucide-react';
import { sarReports } from '../data';

export default function SARReports() {
  const [selectedSAR, setSelectedSAR] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [generating, setGenerating] = useState(false);

  const filtered = sarReports.filter(r =>
    statusFilter === 'All' || r.status === statusFilter
  );

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => setGenerating(false), 2500);
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2>SAR Reports</h2>
            <p>AI-assisted Suspicious Activity Report generation and management</p>
          </div>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <>
                <span style={{
                  width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white', borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 0.8s linear infinite',
                }}></span>
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generate SAR
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card indigo delay-1">
          <div className="kpi-header">
            <span className="kpi-label">Total SARs</span>
            <div className="kpi-icon"><FileText size={18} /></div>
          </div>
          <div className="kpi-value">{sarReports.length}</div>
        </div>
        <div className="kpi-card amber delay-2">
          <div className="kpi-header">
            <span className="kpi-label">Drafts</span>
            <div className="kpi-icon"><Clock size={18} /></div>
          </div>
          <div className="kpi-value">{sarReports.filter(r => r.status === 'Draft').length}</div>
        </div>
        <div className="kpi-card cyan delay-3">
          <div className="kpi-header">
            <span className="kpi-label">Submitted</span>
            <div className="kpi-icon"><Send size={18} /></div>
          </div>
          <div className="kpi-value">{sarReports.filter(r => r.status === 'Submitted').length}</div>
        </div>
        <div className="kpi-card emerald delay-4">
          <div className="kpi-header">
            <span className="kpi-label">Acknowledged</span>
            <div className="kpi-icon"><Sparkles size={18} /></div>
          </div>
          <div className="kpi-value">{sarReports.filter(r => r.status === 'Acknowledged').length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="tab-nav">
          {['All', 'Draft', 'Submitted', 'Acknowledged'].map(s => (
            <button
              key={s}
              className={`tab-btn ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: 'auto' }}>
          {filtered.length} reports
        </span>
      </div>

      {/* SAR List */}
      <div>
        {filtered.map((sar, i) => (
          <div
            key={sar.id}
            className="sar-card"
            style={{ animationDelay: `${i * 0.05}s` }}
            onClick={() => setSelectedSAR(sar)}
          >
            <div className="sar-header">
              <span className="sar-id">{sar.id}</span>
              <span className={`status-badge ${sar.status.toLowerCase()}`}>{sar.status}</span>
            </div>
            <div className="sar-title">{sar.title}</div>
            <div className="sar-narrative">{sar.narrative}</div>
            <div className="sar-footer">
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={12} /> {new Date(sar.filingDate).toLocaleDateString()}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <User size={12} /> {sar.analyst}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <DollarSign size={12} /> ${sar.totalAmount.toLocaleString()}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Globe size={12} /> {sar.jurisdictions.length} jurisdictions
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* SAR Detail Modal */}
      {selectedSAR && (
        <div className="modal-overlay" onClick={() => setSelectedSAR(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
            <button
              onClick={() => setSelectedSAR(null)}
              style={{
                position: 'absolute', top: 16, right: 20,
                background: 'none', border: 'none', color: 'var(--text-secondary)',
                cursor: 'pointer', fontSize: '1.2rem',
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span className="sar-id" style={{ fontSize: '0.85rem' }}>{selectedSAR.id}</span>
              <span className={`status-badge ${selectedSAR.status.toLowerCase()}`}>{selectedSAR.status}</span>
            </div>
            <h3 style={{ marginBottom: 24 }}>{selectedSAR.title}</h3>

            {/* Report metadata grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
              <div style={{ background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Filing Date</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{new Date(selectedSAR.filingDate).toLocaleDateString()}</div>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Analyst</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{selectedSAR.analyst}</div>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Total Amount</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-red)' }}>${selectedSAR.totalAmount.toLocaleString()}</div>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Entities Involved</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{selectedSAR.entitiesInvolved}</div>
              </div>
            </div>

            {/* Jurisdictions */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 8 }}>Jurisdictions</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {selectedSAR.jurisdictions.map(j => (
                  <span key={j} style={{
                    padding: '4px 10px', background: 'rgba(99,102,241,0.1)',
                    borderRadius: 20, fontSize: '0.75rem', color: 'var(--accent-indigo)',
                    fontWeight: 600,
                  }}>
                    {j}
                  </span>
                ))}
              </div>
            </div>

            {/* AI Narrative */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={12} /> AI-Generated Narrative
              </div>
              <div style={{
                background: 'rgba(99,102,241,0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.8,
              }}>
                {selectedSAR.narrative}
              </div>
            </div>

            {/* Transaction Timeline */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 12 }}>
                Transaction Timeline
              </div>
              <div style={{ position: 'relative', paddingLeft: 20 }}>
                <div style={{
                  position: 'absolute', left: 5, top: 0, bottom: 0, width: 2,
                  background: 'var(--border-subtle)', borderRadius: 1,
                }}></div>
                {selectedSAR.timelineEvents.map((event, i) => (
                  <div key={i} style={{
                    position: 'relative', paddingBottom: 16, paddingLeft: 16,
                  }}>
                    <div style={{
                      position: 'absolute', left: -3, top: 4,
                      width: 8, height: 8, borderRadius: '50%',
                      background: event.type !== 'Normal' ? 'var(--accent-red)' : 'var(--accent-emerald)',
                      border: '2px solid var(--bg-secondary)',
                    }}></div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 2 }}>
                      {new Date(event.timestamp).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                      {event.description}
                    </div>
                    {event.type !== 'Normal' && (
                      <span className="risk-badge critical" style={{ marginTop: 4, display: 'inline-flex', fontSize: '0.65rem' }}>
                        {event.type}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setSelectedSAR(null)}>Close</button>
              <button className="btn btn-primary">
                <Send size={14} /> Submit to Regulator
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
