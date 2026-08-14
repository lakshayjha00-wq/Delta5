import { useEffect, useState, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import neo4j from 'neo4j-driver';
import './App.css';

// Connect directly to Neo4j database
const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'AetherisSecretPassword123')
);

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [eventLog, setEventLog] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const fgRef = useRef();

  useEffect(() => {
    const fetchData = async () => {
      const session = driver.session();
      try {
        // Query nodes, relationships, and threat properties
        const result = await session.run(`
          MATCH (n)-[r]->(m)
          RETURN n, r, m
          LIMIT 300
        `);

        const nodes = new Map();
        const links = [];
        const logs = [];

        result.records.forEach((record) => {
          const source = record.get('n');
          const target = record.get('m');
          const rel = record.get('r');

          // Collect log entries from IntelEvents or Identifications
          if (source.labels.includes('IntelEvent') || target.labels.includes('IntelEvent')) {
            const eventNode = source.labels.includes('IntelEvent') ? source : target;
            logs.push({
              id: eventNode.identity.low,
              text: eventNode.properties.raw_text || 'Biometric/Graph Event Ingested',
              timestamp: eventNode.properties.timestamp || new Date().toLocaleTimeString(),
              classification: eventNode.properties.classification || 'UNCLASSIFIED'
            });
          }

          // Process Nodes
          [source, target].forEach((node) => {
            if (!nodes.has(node.identity.low)) {
              nodes.set(node.identity.low, {
                id: node.identity.low,
                label: node.labels[0],
                name: node.properties.name || node.properties.source_id || node.properties.raw_text?.substring(0, 25) + '...',
                threatLevel: node.properties.threat_level || 'NORMAL',
                fullProperties: node.properties
              });
            }
          });

          // Process Links
          links.push({
            source: source.identity.low,
            target: target.identity.low,
            label: rel.type,
          });
        });

        setGraphData({
          nodes: Array.from(nodes.values()),
          links: links
        });

        // Deduplicate and set event logs
        const uniqueLogs = Array.from(new Set(logs.map(l => l.text)))
          .map(text => logs.find(l => l.text === text))
          .slice(0, 15);
        
        setEventLog(uniqueLogs);

      } finally {
        await session.close();
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Live poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Tactical Node Coloring & Sizing Rules
  const getNodeColor = (node) => {
    if (node.threatLevel === 'HIGH' || node.threatLevel === 'CRITICAL') return '#ff0055'; // Neon Pink/Red for High Threat HVTs
    switch (node.label) {
      case 'IntelEvent': return '#ff5500'; // Orange-Red for Events
      case 'Person': return '#00ffcc';     // Cyan for People
      case 'Location': return '#ffee00';   // Yellow for Locations
      case 'Organization': return '#9900ff';// Purple for Organizations
      default: return '#3b4252';
    }
  };

  const getNodeVal = (node) => {
    if (node.threatLevel === 'HIGH' || node.threatLevel === 'CRITICAL') return 12; // Larger nodes for HVTs
    return 5;
  };

  return (
    <div style={{ backgroundColor: '#07080a', height: '100vh', margin: 0, fontFamily: 'monospace', color: '#00ffcc', display: 'flex' }}>
      
      {/* Left Area: Force Directed Graph View */}
      <div style={{ flex: 1, position: 'relative' }}>
        
        {/* Tactical HUD Header */}
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, backgroundColor: 'rgba(10,12,16,0.85)', padding: '15px', border: '1px solid #00ffcc', boxShadow: '0 0 15px rgba(0,255,204,0.2)' }}>
          <h1 style={{ margin: 0, fontSize: '1.3rem', textTransform: 'uppercase', letterSpacing: '2px' }}>AETHERIS MK-IV C2</h1>
          <p style={{ margin: '5px 0 0 0', fontSize: '0.75rem', color: '#8a99ad' }}>MULTIMODAL INTELLIGENCE TOPOLOGY</p>
          <p style={{ margin: '5px 0 0 0', fontSize: '0.75rem', color: '#ff5500' }}>ACTIVE NODES: {graphData.nodes.length} | EDGES: {graphData.links.length}</p>
        </div>

        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          nodeLabel="name"
          nodeColor={getNodeColor}
          nodeVal={getNodeVal}
          linkColor={() => 'rgba(0, 255, 204, 0.15)'}
          linkWidth={1.5}
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={0.006}
          backgroundColor="#07080a"
          onNodeClick={(node) => setSelectedNode(node)}
          onEngineStop={() => fgRef.current.zoomToFit(400)}
        />
      </div>

      {/* Right Area: Tactical Side Panel & Event Log */}
      <div style={{ width: '380px', backgroundColor: 'rgba(12,15,20,0.95)', borderLeft: '1px solid #1a2332', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
        
        {/* Panel Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid #1a2332' }}>
          <h3 style={{ margin: 0, color: '#ff5500', fontSize: '0.9rem', letterSpacing: '1px' }}>// SYSTEM TELEMETRY & ALERTS</h3>
        </div>

        {/* Selected Node Inspector */}
        <div style={{ padding: '15px', borderBottom: '1px solid #1a2332', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#8a99ad' }}>NODE INSPECTOR</h4>
          {selectedNode ? (
            <div style={{ fontSize: '0.8rem' }}>
              <p style={{ margin: '4px 0', color: '#00ffcc' }}><strong>Type:</strong> {selectedNode.label}</p>
              <p style={{ margin: '4px 0', color: '#e2e8f0' }}><strong>Identifier:</strong> {selectedNode.name}</p>
              {selectedNode.threatLevel && selectedNode.threatLevel !== 'NORMAL' && (
                <p style={{ margin: '4px 0', color: '#ff0055' }}><strong>Threat Level:</strong> {selectedNode.threatLevel}</p>
              )}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#556677' }}>Click any node on the graph to inspect metadata.</p>
          )}
        </div>

        {/* Live Event Stream Log */}
        <div style={{ flex: 1, padding: '15px', overflowY: 'auto' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#8a99ad' }}>LIVE INTEL STREAM FEED</h4>
          {eventLog.map((log, idx) => (
            <div key={idx} style={{ marginBottom: '12px', padding: '10px', backgroundColor: 'rgba(255,85,0,0.05)', borderLeft: '2px solid #ff5500', fontSize: '0.75rem' }}>
              <div style={{ color: '#ff5500', marginBottom: '4px', fontSize: '0.7rem' }}>{log.classification}</div>
              <div style={{ color: '#e2e8f0' }}>{log.text}</div>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}

export default App;