import { useState } from 'react';
import {
  ShieldAlert, Clock, User, DollarSign, ChevronRight,
  AlertCircle, AlertTriangle, Info, CheckCircle,
} from 'lucide-react';
import { alerts } from '../data';

const severityIcons = {
  Critical: <AlertCircle size={16} />,
  High: <AlertTriangle size={16} />,
  Medium: <Info size={16} />,
  Low: <CheckCircle size={16} />,
};

const statusOptions = ['New', 'Investigating', 'Escalated', 'Resolved'];

export default function Alerts() {
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [alertStatuses, setAlertStatuses] = useState(() => {
    const map = {};
    alerts.forEach(a => { map[a.id] = a.status; });
    return map;
  });

  const filtered = alerts.filter(a => {
    if (statusFilter !== 'All' && alertStatuses[a.id] !== statusFilter) return false;
    if (severityFilter !== 'All' && a.severity !== severityFilter) return false;
    return true;
  });

  const handleStatusChange = (alertId, newStatus) => {
    setAlertStatuses(prev => ({ ...prev, [alertId]: newStatus }));
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Critical': return 'var(--accent-red)';
      case 'High': return 'var(--accent-orange)';
      case 'Medium': return 'var(--accent-amber)';
      case 'Low': return 'var(--accent-emerald)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Alert Management</h2>
        <p>Prioritized queue of suspicious activity alerts for investigation</p>
      </div>

      {/* Summary Cards */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        {['Critical', 'High', 'Medium', 'Low'].map((sev, i) => {
          const count = alerts.filter(a => a.severity === sev).length;
          const active = alerts.filter(a => a.severity === sev && alertStatuses[a.id] !== 'Resolved').length;
          return (
            <div
              key={sev}
              className={`kpi-card ${sev === 'Critical' ? 'red' : sev === 'High' ? 'amber' : sev === 'Medium' ? 'cyan' : 'emerald'} delay-${i + 1}`}
              style={{ cursor: 'pointer' }}
              onClick={() => setSeverityFilter(severityFilter === sev ? 'All' : sev)}
            >
              <div className="kpi-header">
                <span className="kpi-label">{sev}</span>
                <div className="kpi-icon">{severityIcons[sev]}</div>
              </div>
              <div className="kpi-value">{count}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {active} active
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="All">All Statuses</option>
          {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="filter-select" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
          <option value="All">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: 'auto' }}>
          {filtered.length} alerts
        </span>
      </div>

      <div className="grid-sidebar">
        {/* Alert List */}
        <div>
          {filtered.map((alert, i) => (
            <div
              key={alert.id}
              className={`alert-card severity-${alert.severity.toLowerCase()}`}
              style={{
                animationDelay: `${i * 0.04}s`,
                borderColor: selectedAlert?.id === alert.id ? 'var(--accent-indigo)' : undefined,
              }}
              onClick={() => setSelectedAlert(alert)}
            >
              <div className="alert-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: getSeverityColor(alert.severity) }}>{severityIcons[alert.severity]}</span>
                  <span className="alert-title">{alert.title}</span>
                </div>
                <span className={`status-badge ${alertStatuses[alert.id].toLowerCase()}`}>
                  {alertStatuses[alert.id]}
                </span>
              </div>
              <div className="alert-body">{alert.reason}</div>
              <div className="alert-footer">
                <span className="alert-meta"><Clock size={12} /> {new Date(alert.createdAt).toLocaleDateString()}</span>
                <span className="alert-meta"><User size={12} /> {alert.assignedTo}</span>
                <span className="alert-meta"><DollarSign size={12} /> ${alert.totalExposure.toLocaleString()}</span>
                <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Detail Pane */}
        <div>
          {selectedAlert ? (
            <div className="detail-panel" style={{ position: 'sticky', top: 20 }}>
              <h3>
                <span style={{ color: getSeverityColor(selectedAlert.severity) }}>
                  {severityIcons[selectedAlert.severity]}
                </span>
                Alert Details
              </h3>

              <div className="detail-row">
                <span className="label">Alert ID</span>
                <span className="value" style={{ fontFamily: 'monospace', color: 'var(--text-accent)' }}>{selectedAlert.id}</span>
              </div>
              <div className="detail-row">
                <span className="label">Severity</span>
                <span className="value">
                  <span className={`risk-badge ${selectedAlert.severity.toLowerCase()}`}>{selectedAlert.severity}</span>
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Status</span>
                <select
                  className="filter-select"
                  value={alertStatuses[selectedAlert.id]}
                  onChange={e => handleStatusChange(selectedAlert.id, e.target.value)}
                  style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                >
                  {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="detail-row">
                <span className="label">Assigned To</span>
                <span className="value">{selectedAlert.assignedTo}</span>
              </div>
              <div className="detail-row">
                <span className="label">Total Exposure</span>
                <span className="value" style={{ fontWeight: 800, color: 'var(--accent-red)' }}>
                  ${selectedAlert.totalExposure.toLocaleString()}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Entities Involved</span>
                <span className="value">{selectedAlert.linkedEntities.length}</span>
              </div>
              <div className="detail-row">
                <span className="label">Created</span>
                <span className="value">{new Date(selectedAlert.createdAt).toLocaleString()}</span>
              </div>

              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 10 }}>
                  Reason for Alert
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, background: 'rgba(99,102,241,0.05)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  {selectedAlert.reason}
                </p>
              </div>

              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 10 }}>
                  Linked Transactions ({selectedAlert.linkedTransactions.length})
                </div>
                {selectedAlert.linkedTransactions.slice(0, 5).map(tx => (
                  <div key={tx.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 0', borderBottom: '1px solid var(--border-subtle)',
                    fontSize: '0.8rem',
                  }}>
                    <span style={{ fontFamily: 'monospace', color: 'var(--text-accent)', fontSize: '0.72rem' }}>{tx.id}</span>
                    <span style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {tx.sender.name} → {tx.receiver.name}
                    </span>
                    <span className={`risk-badge ${tx.riskScore >= 80 ? 'critical' : tx.riskScore >= 60 ? 'high' : 'medium'}`} style={{ fontSize: '0.68rem' }}>
                      {tx.riskScore}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => handleStatusChange(selectedAlert.id, 'Escalated')}>
                  Escalate
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleStatusChange(selectedAlert.id, 'Resolved')}>
                  Resolve
                </button>
              </div>
            </div>
          ) : (
            <div className="detail-panel" style={{ textAlign: 'center', padding: '60px 24px' }}>
              <ShieldAlert size={36} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Select an alert to view<br />investigation details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
