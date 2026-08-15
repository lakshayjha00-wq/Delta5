import { useEffect, useState, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import neo4j from 'neo4j-driver';
import './App.css';

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'AetherisSecretPassword123')
);

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [geoLocations, setGeoLocations] = useState([]);
  const [viewMode, setViewMode] = useState('MAP'); // Set MAP as default view
  const [selectedNode, setSelectedNode] = useState(null);
  const fgRef = useRef();

  useEffect(() => {
    const fetchData = async () => {
      const session = driver.session();
      try {
        const result = await session.run(`
          MATCH (n)-[r]->(m)
          RETURN n, r, m
          LIMIT 300
        `);

        const nodes = new Map();
        const links = [];
        const mapPins = [];

        result.records.forEach((record) => {
          const source = record.get('n');
          const target = record.get('m');
          const rel = record.get('r');

          [source, target].forEach((node) => {
            if (!nodes.has(node.identity.low)) {
              const props = node.properties;
              const nodeData = {
                id: node.identity.low,
                label: node.labels[0],
                name: props.name || props.source_id || props.raw_text?.substring(0, 25) + '...',
                threatLevel: props.threat_level || 'NORMAL',
                latitude: props.latitude,
                longitude: props.longitude,
                fullProperties: props
              };

              nodes.set(node.identity.low, nodeData);

              if (props.latitude && props.longitude) {
                mapPins.push(nodeData);
              }
            }
          });

          links.push({
            source: source.identity.low,
            target: target.identity.low,
            label: rel.type,
          });
        });

        setGraphData({ nodes: Array.from(nodes.values()), links });
        setGeoLocations(mapPins);

      } finally {
        await session.close();
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const getNodeColor = (node) => {
    if (node.threatLevel === 'HIGH' || node.threatLevel === 'CRITICAL') return '#ff0055';
    switch (node.label) {
      case 'IntelEvent': return '#ff5500';
      case 'Person': return '#00ffcc';
      case 'Location': return '#ffee00';
      case 'Organization': return '#9900ff';
      default: return '#3b4252';
    }
  };

  return (
    <div style={{ backgroundColor: '#07080a', height: '100vh', width: '100vw', margin: 0, padding: 0, fontFamily: 'monospace', color: '#00ffcc', display: 'flex', overflow: 'hidden' }}>
      
      {/* Main Viewport Container */}
      <div style={{ flex: 1, position: 'relative', height: '100%' }}>
        
        {/* Tactical HUD Header */}
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 2000, backgroundColor: 'rgba(10,12,16,0.9)', padding: '15px', border: '1px solid #00ffcc', boxShadow: '0 0 15px rgba(0,255,204,0.2)' }}>
          <h1 style={{ margin: 0, fontSize: '1.2rem', letterSpacing: '2px', color: '#00ffcc' }}>AETHERIS MK-IV C2</h1>
          <p style={{ margin: '5px 0 10px 0', fontSize: '0.75rem', color: '#8a99ad' }}>GEOSPATIAL & TOPOLOGICAL OVERLAY</p>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setViewMode('GRAPH')} 
              style={{ backgroundColor: viewMode === 'GRAPH' ? '#00ffcc' : '#1a2332', color: viewMode === 'GRAPH' ? '#000' : '#00ffcc', border: 'none', padding: '6px 12px', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold' }}>
              GRAPH VIEW
            </button>
            <button 
              onClick={() => setViewMode('MAP')} 
              style={{ backgroundColor: viewMode === 'MAP' ? '#00ffcc' : '#1a2332', color: viewMode === 'MAP' ? '#000' : '#00ffcc', border: 'none', padding: '6px 12px', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold' }}>
              GLOBAL GIS MAP ({geoLocations.length})
            </button>
          </div>
        </div>

        {/* Dynamic Display Switcher */}
        {viewMode === 'GRAPH' ? (
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData}
            nodeLabel="name"
            nodeColor={getNodeColor}
            nodeVal={(n) => (n.threatLevel === 'HIGH' ? 12 : 5)}
            linkColor={() => 'rgba(0, 255, 204, 0.15)'}
            backgroundColor="#07080a"
            onNodeClick={(node) => setSelectedNode(node)}
          />
        ) : (
          <MapContainer center={[25, 10]} zoom={2.5} style={{ height: '100%', width: '100%', backgroundColor: '#07080a' }}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; CARTO'
            />
            {geoLocations.map((pin, idx) => (
              <CircleMarker 
                key={idx} 
                center={[pin.latitude, pin.longitude]}
                radius={9}
                pathOptions={{
                  color: pin.threatLevel === 'HIGH' ? '#ff0055' : '#00ffcc',
                  fillColor: pin.threatLevel === 'HIGH' ? '#ff0055' : '#00ffcc',
                  fillOpacity: 0.8,
                  weight: 2
                }}
                eventHandlers={{
                  click: () => setSelectedNode(pin)
                }}
              >
                <Popup>
                  <div style={{ color: '#000', fontFamily: 'sans-serif', fontSize: '0.8rem' }}>
                    <strong>{pin.name}</strong><br />
                    Type: {pin.label}<br />
                    Coordinates: {pin.latitude.toFixed(4)}, {pin.longitude.toFixed(4)}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Right Telemetry & Inspector Panel */}
      <div style={{ width: '350px', backgroundColor: 'rgba(12,15,20,0.95)', borderLeft: '1px solid #1a2332', padding: '20px', zIndex: 2000, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#ff5500', fontSize: '0.9rem', letterSpacing: '1px' }}>// TARGET INSPECTOR</h3>
        {selectedNode ? (
          <div style={{ fontSize: '0.8rem', backgroundColor: 'rgba(0,0,0,0.4)', padding: '12px', border: '1px solid #1a2332' }}>
            <p style={{ margin: '4px 0' }}><strong>Identifier:</strong> {selectedNode.name}</p>
            <p style={{ margin: '4px 0' }}><strong>Type:</strong> {selectedNode.label}</p>
            {selectedNode.latitude && (
              <p style={{ margin: '4px 0', color: '#ffee00' }}><strong>Coordinates:</strong> {selectedNode.latitude.toFixed(4)}, {selectedNode.longitude.toFixed(4)}</p>
            )}
            {selectedNode.threatLevel && (
              <p style={{ margin: '4px 0', color: '#ff0055' }}><strong>Threat Rating:</strong> {selectedNode.threatLevel}</p>
            )}
          </div>
        ) : (
          <p style={{ fontSize: '0.75rem', color: '#556677' }}>Click a node on the graph or a marker on the map to inspect metadata.</p>
        )}
      </div>

    </div>
  );
}

export default App;