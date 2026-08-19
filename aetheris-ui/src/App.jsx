import { useEffect, useState, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import Globe from 'react-globe.gl';
import neo4j from 'neo4j-driver';
import './App.css';

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'AetherisSecretPassword123')
);

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [geoLocations, setGeoLocations] = useState([]);
  const [flightTracks, setFlightTracks] = useState([]);
  const [viewMode, setViewMode] = useState('MAP');
  const [showFlights, setShowFlights] = useState(true);
  const [showGroundIntel, setShowGroundIntel] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  
  const fgRef = useRef();
  const globeRef = useRef();

  // Responsive sizing for the WebGL Canvas (Full width minus the 350px sidebar)
  const [dimensions, setDimensions] = useState({ width: window.innerWidth - 350, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth - 350, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch Neo4j Graph & Ground Events
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

  // Subscribe to WebSocket for Real-time Flight Streams
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080');

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.directive === "RADAR_CONTACT") {
          setFlightTracks((prev) => {
            const existingIndex = prev.findIndex(f => f.callsign === data.callsign);
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = data;
              return updated;
            }
            return [...prev.slice(-49), data]; 
          });
        }
      } catch {
        // Ignore non-JSON
      }
    };

    return () => ws.close();
  }, []);

  // Add slow cinematic rotation to the globe on load
  useEffect(() => {
    if (viewMode === 'MAP' && globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.5;
    }
  }, [viewMode]);

  // --- WebGL Data Transformation ---
  
  // Ground Intel -> Tactical Radar Pings
  const ringData = showGroundIntel ? geoLocations.map(pin => ({
    lat: pin.latitude,
    lng: pin.longitude,
    maxR: (pin.threatLevel === 'HIGH' || pin.threatLevel === 'CRITICAL') ? 6 : 2,
    propagationSpeed: (pin.threatLevel === 'HIGH' || pin.threatLevel === 'CRITICAL') ? 2 : 1,
    repeatPeriod: (pin.threatLevel === 'HIGH' || pin.threatLevel === 'CRITICAL') ? 500 : 1000,
    color: (pin.threatLevel === 'HIGH' || pin.threatLevel === 'CRITICAL') ? '#ff0055' : '#ffee00',
    type: 'GROUND_INTEL',
    ...pin
  })) : [];

  // Airborne Targets -> Floating Orbit Labels
  const flightLabels = showFlights ? flightTracks.map(flight => ({
    lat: flight.coordinates.lat,
    lng: flight.coordinates.lng,
    alt: 0.08, // Float above the globe surface
    text: `✈ ${flight.callsign}`,
    color: '#00e5ff',
    size: 1.2,
    type: 'AIR_TARGET',
    ...flight
  })) : [];

  // Ground OSINT -> Surface Labels
  const groundLabels = showGroundIntel ? geoLocations.map(pin => ({
    lat: pin.latitude,
    lng: pin.longitude,
    alt: 0.01,
    text: pin.name,
    color: (pin.threatLevel === 'HIGH' || pin.threatLevel === 'CRITICAL') ? '#ff0055' : '#00ffcc',
    size: 0.7,
    type: 'GROUND_INTEL',
    ...pin
  })) : [];

  const allLabels = [...flightLabels, ...groundLabels];

  // Graph Node Colors
  const getNodeColor = (node) => {
    if (node.threatLevel === 'HIGH' || node.threatLevel === 'CRITICAL') return '#ff0055';
    switch (node.label) {
      case 'IntelEvent': return '#ff5500';
      case 'Person': return '#00ffcc';
      case 'Location': return '#ffee00';
      default: return '#3b4252';
    }
  };

  return (
    <div style={{ backgroundColor: '#07080a', height: '100vh', width: '100vw', margin: 0, padding: 0, fontFamily: 'monospace', color: '#00ffcc', display: 'flex', overflow: 'hidden' }}>
      
      {/* Main Map Viewport */}
      <div style={{ flex: 1, position: 'relative', height: '100%' }}>
        
        {/* Command Controls Overhead */}
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 2000, backgroundColor: 'rgba(10,12,16,0.9)', padding: '15px', border: '1px solid #00ffcc', boxShadow: '0 0 15px rgba(0,255,204,0.2)' }}>
          <h1 style={{ margin: 0, fontSize: '1.2rem', letterSpacing: '2px', color: '#00ffcc' }}>AETHERIS MK-IV C2</h1>
          <p style={{ margin: '3px 0 10px 0', fontSize: '0.75rem', color: '#8a99ad' }}>TACTICAL AIR & GROUND MATRIX</p>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <button 
              onClick={() => setViewMode('GRAPH')} 
              style={{ backgroundColor: viewMode === 'GRAPH' ? '#00ffcc' : '#1a2332', color: viewMode === 'GRAPH' ? '#000' : '#00ffcc', border: 'none', padding: '5px 10px', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold' }}>
              NETWORK GRAPH
            </button>
            <button 
              onClick={() => setViewMode('MAP')} 
              style={{ backgroundColor: viewMode === 'MAP' ? '#00ffcc' : '#1a2332', color: viewMode === 'MAP' ? '#000' : '#00ffcc', border: 'none', padding: '5px 10px', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold' }}>
              3D ORBITAL GLOBE
            </button>
          </div>

          {viewMode === 'MAP' && (
            <div style={{ display: 'flex', gap: '15px', fontSize: '0.75rem', borderTop: '1px solid #1a2332', paddingTop: '8px' }}>
              <label style={{ cursor: 'pointer', color: '#00ffcc' }}>
                <input type="checkbox" checked={showGroundIntel} onChange={(e) => setShowGroundIntel(e.target.checked)} /> Ground Intel ({geoLocations.length})
              </label>
              <label style={{ cursor: 'pointer', color: '#00e5ff' }}>
                <input type="checkbox" checked={showFlights} onChange={(e) => setShowFlights(e.target.checked)} /> Air Tracks ({flightTracks.length})
              </label>
            </div>
          )}
        </div>

        {/* Viewport Display */}
        {viewMode === 'GRAPH' ? (
          <ForceGraph2D
            ref={fgRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            nodeLabel="name"
            nodeColor={getNodeColor}
            nodeVal={(n) => (n.threatLevel === 'HIGH' || n.threatLevel === 'CRITICAL' ? 12 : 5)}
            linkColor={() => 'rgba(0, 255, 204, 0.15)'}
            backgroundColor="#07080a"
            onNodeClick={(node) => setSelectedNode(node)}
          />
        ) : (
          <Globe
            ref={globeRef}
            width={dimensions.width}
            height={dimensions.height}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
            backgroundColor="#07080a"
            
            // Ground Intel Radar Pings
            ringsData={ringData}
            ringColor={d => d.color}
            ringMaxRadius="maxR"
            ringPropagationSpeed="propagationSpeed"
            ringRepeatPeriod="repeatPeriod"
            
            // Live 3D Text & Call signs
            labelsData={allLabels}
            labelLat={d => d.lat}
            labelLng={d => d.lng}
            labelAltitude={d => d.alt}
            labelText={d => d.text}
            labelSize={d => d.size}
            labelDotRadius={0.3}
            labelColor={d => d.color}
            labelResolution={2}
            onLabelClick={(label) => setSelectedNode(label)}
          />
        )}
      </div>

      {/* Right Telemetry Sidebar */}
      <div style={{ width: '350px', backgroundColor: 'rgba(12,15,20,0.95)', borderLeft: '1px solid #1a2332', padding: '20px', zIndex: 2000, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#ff5500', fontSize: '0.9rem', letterSpacing: '1px' }}>// RADAR & TARGET INSPECTOR</h3>
        
        {selectedNode ? (
          <div style={{ fontSize: '0.8rem', backgroundColor: 'rgba(0,0,0,0.4)', padding: '12px', border: '1px solid #1a2332' }}>
            {selectedNode.type === 'AIR_TARGET' ? (
              <>
                <p style={{ margin: '4px 0', color: '#00e5ff' }}><strong>TYPE:</strong> AIRBORNE TARGET</p>
                <p style={{ margin: '4px 0' }}><strong>CALLSIGN:</strong> {selectedNode.callsign}</p>
                <p style={{ margin: '4px 0' }}><strong>ORIGIN:</strong> {selectedNode.origin_country}</p>
                <p style={{ margin: '4px 0' }}><strong>ALTITUDE:</strong> {selectedNode.altitude} m</p>
                <p style={{ margin: '4px 0' }}><strong>VELOCITY:</strong> {selectedNode.velocity} m/s</p>
                <p style={{ margin: '4px 0', color: '#ffee00' }}><strong>LAT/LNG:</strong> {selectedNode.coordinates.lat.toFixed(4)}, {selectedNode.coordinates.lng.toFixed(4)}</p>
              </>
            ) : (
              <>
                <p style={{ margin: '4px 0' }}><strong>Identifier:</strong> {selectedNode.name}</p>
                <p style={{ margin: '4px 0' }}><strong>Type:</strong> {selectedNode.label}</p>
                {selectedNode.latitude && (
                  <p style={{ margin: '4px 0', color: '#ffee00' }}><strong>Coordinates:</strong> {selectedNode.latitude.toFixed(4)}, {selectedNode.longitude.toFixed(4)}</p>
                )}
                {selectedNode.threatLevel && selectedNode.threatLevel !== 'NORMAL' && (
                  <p style={{ margin: '4px 0', color: '#ff0055' }}><strong>Threat Level:</strong> {selectedNode.threatLevel}</p>
                )}
              </>
            )}
          </div>
        ) : (
          <p style={{ fontSize: '0.75rem', color: '#556677' }}>Click any 3D marker or airborne target to inspect telemetry.</p>
        )}
      </div>

    </div>
  );
}

export default App;