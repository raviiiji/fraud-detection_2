import { useState, useMemo } from 'react';
import { Search, Filter, ChevronDown, ChevronUp, ExternalLink, Network } from 'lucide-react';
import { transactions } from '../data';
import EntityChainModal from '../components/EntityChainModal';

export default function Transactions() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typologyFilter, setTypologyFilter] = useState('All');
  const [sortField, setSortField] = useState('timestamp');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedRow, setExpandedRow] = useState(null);
  const [chainEntity, setChainEntity] = useState(null);

  const filtered = useMemo(() => {
    let result = [...transactions];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.id.toLowerCase().includes(q) ||
        t.sender.name.toLowerCase().includes(q) ||
        t.receiver.name.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'All') {
      result = result.filter(t => t.status === statusFilter);
    }

    if (typologyFilter !== 'All') {
      result = result.filter(t => t.typology === typologyFilter);
    }

    result.sort((a, b) => {
      let valA, valB;
      switch (sortField) {
        case 'amount': valA = a.amount; valB = b.amount; break;
        case 'riskScore': valA = a.riskScore; valB = b.riskScore; break;
        case 'timestamp': valA = new Date(a.timestamp); valB = new Date(b.timestamp); break;
        default: valA = a[sortField]; valB = b[sortField];
      }
      return sortDir === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

    return result;
  }, [search, statusFilter, typologyFilter, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  const getRiskBarColor = (score) => {
    if (score >= 80) return '#ef4444';
    if (score >= 60) return '#f97316';
    if (score >= 35) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div>
      <div className="page-header">
        <h2>Transaction Monitor</h2>
        <p>Real-time and batch analysis of all fund movements</p>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={16} style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
          }} />
          <input
            className="filter-input"
            placeholder="Search by ID, sender, receiver..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36, width: '100%' }}
          />
        </div>

        <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="All">All Statuses</option>
          <option value="Cleared">Cleared</option>
          <option value="Under Review">Under Review</option>
          <option value="Blocked">Blocked</option>
        </select>

        <select className="filter-select" value={typologyFilter} onChange={e => setTypologyFilter(e.target.value)}>
          <option value="All">All Typologies</option>
          <option value="Structuring">Structuring</option>
          <option value="Smurfing">Smurfing</option>
          <option value="Layering">Layering</option>
          <option value="Round-Tripping">Round-Tripping</option>
          <option value="Phantom FDI">Phantom FDI</option>
          <option value="Normal">Normal</option>
        </select>

        <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: 'auto' }}>
          {filtered.length} transactions
        </span>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="data-table-wrapper" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('id')}>TX ID <SortIcon field="id" /></th>
                <th onClick={() => handleSort('timestamp')}>Time <SortIcon field="timestamp" /></th>
                <th>Sender</th>
                <th>Receiver</th>
                <th onClick={() => handleSort('amount')}>Amount <SortIcon field="amount" /></th>
                <th>Typology</th>
                <th onClick={() => handleSort('riskScore')}>Risk <SortIcon field="riskScore" /></th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx, i) => (
                <>
                  <tr
                    key={tx.id}
                    onClick={() => setExpandedRow(expandedRow === tx.id ? null : tx.id)}
                    style={{ cursor: 'pointer', animationDelay: `${i * 0.02}s` }}
                  >
                    <td><span className="tx-id">{tx.id}</span></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {new Date(tx.timestamp).toLocaleDateString()}<br />
                      <span className="text-muted">{new Date(tx.timestamp).toLocaleTimeString()}</span>
                    </td>
                    <td>
                      <div
                        style={{ fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={(e) => { e.stopPropagation(); setChainEntity(tx.sender); }}
                        onMouseEnter={e => e.currentTarget.style.color = '#00d4aa'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}
                      >
                        {tx.sender.name}
                        <Network size={11} style={{ opacity: 0.4 }} />
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{tx.sender.jurisdiction}</div>
                    </td>
                    <td>
                      <div
                        style={{ fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={(e) => { e.stopPropagation(); setChainEntity(tx.receiver); }}
                        onMouseEnter={e => e.currentTarget.style.color = '#00d4aa'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}
                      >
                        {tx.receiver.name}
                        <Network size={11} style={{ opacity: 0.4 }} />
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{tx.receiver.jurisdiction}</div>
                    </td>
                    <td className="amount">{tx.currency} {tx.amount.toLocaleString()}</td>
                    <td>
                      {tx.typology !== 'Normal' ? (
                        <span className={`risk-badge ${tx.riskScore >= 80 ? 'critical' : tx.riskScore >= 60 ? 'high' : 'medium'}`}>
                          {tx.typology}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Normal</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="risk-bar">
                          <div className="risk-bar-fill" style={{
                            width: `${tx.riskScore}%`,
                            background: getRiskBarColor(tx.riskScore),
                          }} />
                        </div>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: getRiskBarColor(tx.riskScore) }}>
                          {tx.riskScore}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${tx.status === 'Cleared' ? 'cleared' : tx.status === 'Under Review' ? 'review' : 'blocked'}`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                  {expandedRow === tx.id && (
                    <tr key={`${tx.id}-detail`}>
                      <td colSpan="8" style={{ padding: '16px 24px', background: 'rgba(99,102,241,0.03)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Channel</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{tx.channel}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Device</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'monospace' }}>{tx.deviceFingerprint}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>IP Address</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'monospace' }}>{tx.ipAddress}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Sender Account</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{tx.sender.id} ({tx.sender.type})</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Entity Chain Modal */}
      {chainEntity && (
        <EntityChainModal person={chainEntity} onClose={() => setChainEntity(null)} />
      )}
    </div>
  );
}
