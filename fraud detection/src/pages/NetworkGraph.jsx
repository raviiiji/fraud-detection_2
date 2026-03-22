import { useState, useCallback, useRef, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { ZoomIn, ZoomOut, Maximize, Filter } from 'lucide-react';
import { graphData, accounts } from '../data';

export default function NetworkGraph() {
  const graphRef = useRef();
  const containerRef = useRef();
  const [selectedNode, setSelectedNode] = useState(null);
  const [riskFilter, setRiskFilter] = useState('All');
  const [dimensions, setDimensions] = useState({ width: 800, height: 550 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: 550 });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const filteredData = (() => {
    if (riskFilter === 'All') return graphData;
    const validNodes = new Set(
      graphData.nodes.filter(n => n.riskTier === riskFilter).map(n => n.id)
    );
    return {
      nodes: graphData.nodes.filter(n => validNodes.has(n.id)),
      links: graphData.links.filter(l => {
        const srcId = typeof l.source === 'object' ? l.source.id : l.source;
        const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
        return validNodes.has(srcId) || validNodes.has(tgtId);
      }),
    };
  })();

  const handleNodeClick = useCallback((node) => {
    const account = accounts.find(a => a.id === node.id);
    setSelectedNode(account);
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 500);
      graphRef.current.zoom(3, 500);
    }
  }, []);

  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const size = node.val || 4;
    const fontSize = Math.max(10 / globalScale, 1.5);
    const label = node.name;

    // Glow effect for high-risk nodes
    if (node.riskTier === 'Critical' || node.riskTier === 'High') {
      ctx.shadowColor = node.color;
      ctx.shadowBlur = 15;
    }

    // Node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = node.color;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Label
    if (globalScale > 1.2) {
      ctx.font = `${fontSize}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(241,245,249,0.8)';
      ctx.fillText(label, node.x, node.y + size + 3);
    }
  }, []);

  const linkCanvasObject = useCallback((link, ctx, globalScale) => {
    const start = link.source;
    const end = link.target;

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = link.color || 'rgba(100,116,139,0.15)';
    ctx.lineWidth = link.isFraud ? 1.5 : 0.5;

    if (link.isFraud) {
      ctx.setLineDash([4, 2]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  return (
    <div>
      <div className="page-header">
        <h2>Network Graph</h2>
        <p>Interactive force-directed visualization of fund flow networks and fraud rings</p>
      </div>

      <div className="grid-sidebar">
        <div className="graph-container" ref={containerRef}>
          <div className="graph-controls">
            <select
              className="filter-select"
              value={riskFilter}
              onChange={e => setRiskFilter(e.target.value)}
              style={{ fontSize: '0.78rem', padding: '6px 10px' }}
            >
              <option value="All">All Risk Tiers</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <button className="btn btn-ghost btn-sm" onClick={() => graphRef.current?.zoomToFit(400)}>
              <Maximize size={14} />
            </button>
          </div>

          <ForceGraph2D
            ref={graphRef}
            graphData={filteredData}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor="transparent"
            nodeCanvasObject={nodeCanvasObject}
            linkCanvasObject={linkCanvasObject}
            onNodeClick={handleNodeClick}
            nodePointerAreaPaint={(node, color, ctx) => {
              ctx.beginPath();
              ctx.arc(node.x, node.y, node.val + 2, 0, 2 * Math.PI);
              ctx.fillStyle = color;
              ctx.fill();
            }}
            cooldownTicks={100}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            linkDirectionalArrowLength={3}
            linkDirectionalArrowRelPos={1}
          />

          <div className="graph-legend">
            <div style={{ fontSize: '0.72rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Risk Tiers</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: '#ef4444' }}></div> Critical</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: '#f97316' }}></div> High</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: '#f59e0b' }}></div> Medium</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: '#10b981' }}></div> Low</div>
            <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 8, paddingTop: 8 }}>
              <div className="legend-item" style={{ fontSize: '0.68rem' }}>
                <div style={{ width: 16, height: 2, background: 'rgba(239,68,68,0.6)', borderTop: '1.5px dashed #ef4444' }}></div>
                Suspicious Link
              </div>
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        <div>
          {selectedNode ? (
            <div className="detail-panel">
              <h3>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: selectedNode.riskTier === 'Critical' ? '#ef4444' : selectedNode.riskTier === 'High' ? '#f97316' : selectedNode.riskTier === 'Medium' ? '#f59e0b' : '#10b981',
                  display: 'inline-block',
                }}></span>
                {selectedNode.name}
              </h3>
              <div className="detail-row">
                <span className="label">Account ID</span>
                <span className="value" style={{ fontFamily: 'monospace', color: 'var(--text-accent)' }}>{selectedNode.id}</span>
              </div>
              <div className="detail-row">
                <span className="label">Type</span>
                <span className="value">{selectedNode.type}</span>
              </div>
              <div className="detail-row">
                <span className="label">Jurisdiction</span>
                <span className="value">{selectedNode.jurisdiction}</span>
              </div>
              <div className="detail-row">
                <span className="label">Risk Tier</span>
                <span className="value">
                  <span className={`risk-badge ${selectedNode.riskTier.toLowerCase()}`}>{selectedNode.riskTier}</span>
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Risk Score</span>
                <span className="value" style={{ fontWeight: 800, fontSize: '1.1rem' }}>{selectedNode.riskScore}</span>
              </div>
              <div className="detail-row">
                <span className="label">Balance</span>
                <span className="value">${selectedNode.balance.toLocaleString()}</span>
              </div>

              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 12 }}>
                  Graph Features
                </div>
                <div className="detail-row">
                  <span className="label">PageRank</span>
                  <span className="value">{selectedNode.pageRank}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Betweenness</span>
                  <span className="value">{selectedNode.betweenness}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Clustering Coeff.</span>
                  <span className="value">{selectedNode.clusterCoeff}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="detail-panel" style={{ textAlign: 'center', padding: '60px 24px' }}>
              <Filter size={36} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Click a node to view<br />account details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
