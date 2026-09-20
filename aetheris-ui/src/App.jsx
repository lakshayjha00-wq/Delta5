import { useEffect, useState, useRef, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import Globe from 'react-globe.gl';
import neo4j from 'neo4j-driver';
import countries, { generateConnections } from './countriesData';
import { fetchFlights } from './flightTracker';
import { ShipTracker } from './shipTracker';
import { SatelliteTracker } from './satelliteTracker';
import './App.css';

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'AetherisSecretPassword123')
);

// Helper: safely convert Neo4j Integer to JS number
function toNumber(val) {
  if (val == null) return null;
  if (neo4j.isInt(val)) return val.toNumber();
  if (typeof val === 'object' && val.low !== undefined) return neo4j.int(val.low).toNumber();
  return Number(val);
}

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [geoLocations, setGeoLocations] = useState([]);
  const [flightTracks, setFlightTracks] = useState([]); // WebSocket flights (from backend)
  
  // Real-world trackers
  const [liveFlights, setLiveFlights] = useState([]);
  const [liveShips, setLiveShips] = useState([]);
  const [liveSatellites, setLiveSatellites] = useState([]);

  const [viewMode, setViewMode] = useState('MAP');
  
  // Toggles
  const [showGroundIntel, setShowGroundIntel] = useState(true);
  const [showGlobalNet, setShowGlobalNet] = useState(true);
  const [showLiveFlights, setShowLiveFlights] = useState(true);
  const [showLiveShips, setShowLiveShips] = useState(true);
  const [showLiveSats, setShowLiveSats] = useState(true);

  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeCount, setNodeCount] = useState(0);
  const [linkCount, setLinkCount] = useState(0);
  
  const fgRef = useRef();
  const globeRef = useRef();

  // Pre-compute the global network connections once
  const globalConnections = useMemo(() => generateConnections(), []);

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
            const nodeId = toNumber(node.identity);
            if (!nodes.has(nodeId)) {
              const props = node.properties;
              const lat = toNumber(props.latitude);
              const lng = toNumber(props.longitude);

              const nodeData = {
                id: nodeId,
                label: node.labels[0],
                name: props.name || props.source_id || (props.raw_text ? props.raw_text.substring(0, 30) + '...' : 'Unknown'),
                threatLevel: props.threat_level || 'NORMAL',
                latitude: lat,
                longitude: lng,
                fullProperties: props
              };

              nodes.set(nodeId, nodeData);

              if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
                mapPins.push(nodeData);
              }
            }
          });

          links.push({
            source: toNumber(source.identity),
            target: toNumber(target.identity),
            label: rel.type,
          });
        });

        setGraphData({ nodes: Array.from(nodes.values()), links });
        setGeoLocations(mapPins);
        setNodeCount(nodes.size);
        setLinkCount(links.length);

      } catch (err) {
        console.error('[AETHERIS-UI] Graph fetch error:', err);
      } finally {
        await session.close();
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // 1. Live Flights (OpenSky)
  useEffect(() => {
    const updateFlights = async () => {
      const flights = await fetchFlights();
      if (flights.length > 0) setLiveFlights(flights);
    };
    updateFlights();
    const interval = setInterval(updateFlights, 10000); // 10s
    return () => clearInterval(interval);
  }, []);

  // 2. Live Ships (AISStream)
  useEffect(() => {
    const tracker = new ShipTracker((ships) => {
      setLiveShips([...ships]);
    });
    tracker.connect();
    return () => tracker.disconnect();
  }, []);

  // 3. Live Satellites (CelesTrak + satellite.js)
  useEffect(() => {
    const tracker = new SatelliteTracker();
    let interval;
    tracker.fetchSatellites().then(() => {
      interval = setInterval(() => {
        setLiveSatellites(tracker.getPositions());
      }, 1000); // 1s visual update
    });
    return () => { if (interval) clearInterval(interval); };
  }, []);

  // Subscribe to WebSocket for internal events (if running)
  useEffect(() => {
    let ws;
    try {
      ws = new WebSocket('ws://localhost:8081');
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
        } catch (e) {}
      };
      ws.onerror = () => {};
    } catch (e) {}
    return () => { if (ws) ws.close(); };
  }, []);

  // Add slow cinematic rotation to the globe on load
  useEffect(() => {
    if (viewMode === 'MAP' && globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.5;
    }
  }, [viewMode]);

  // --- 194 Country Network Overlay Data ---

  const countryPoints = useMemo(() => {
    if (!showGlobalNet) return [];
    return countries.map(c => ({
      lat: c.lat,
      lng: c.lng,
      name: c.name,
      region: c.region,
      size: 0.25,
      color: regionColor(c.region),
      type: 'COUNTRY_NODE',
    }));
  }, [showGlobalNet]);

  const countryArcs = useMemo(() => {
    if (!showGlobalNet) return [];
    return globalConnections.map(conn => ({
      startLat: conn.from[0],
      startLng: conn.from[1],
      endLat: conn.to[0],
      endLng: conn.to[1],
      color: conn.type === 'strategic'
        ? ['rgba(0, 255, 204, 0.35)', 'rgba(0, 229, 255, 0.35)']
        : ['rgba(0, 255, 204, 0.08)', 'rgba(0, 229, 255, 0.08)'],
      stroke: conn.type === 'strategic' ? 0.6 : 0.2,
      dashLength: conn.type === 'strategic' ? 0.4 : 0,
      dashGap: conn.type === 'strategic' ? 0.2 : 0,
      dashAnimateTime: conn.type === 'strategic' ? 4000 : 0,
    }));
  }, [showGlobalNet]);

  // --- WebGL Data Transformation ---
  
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

  const flightLabels = showLiveFlights ? liveFlights.map(flight => ({
    lat: flight.lat,
    lng: flight.lng,
    alt: 0.06,
    text: `✈ ${flight.callsign}`,
    color: '#ff9900',
    size: 0.8,
    type: 'LIVE_FLIGHT',
    ...flight
  })) : [];

  const shipLabels = showLiveShips ? liveShips.map(ship => ({
    lat: ship.lat,
    lng: ship.lng,
    alt: 0.01,
    text: `🚢 ${ship.name}`,
    color: '#00ff00',
    size: 0.7,
    type: 'LIVE_SHIP',
    ...ship
  })) : [];

  const satLabels = showLiveSats ? liveSatellites.map(sat => ({
    lat: sat.lat,
    lng: sat.lng,
    alt: sat.visualAlt, // computed from altitude Km
    text: `🛰 ${sat.name}`,
    color: '#ffffff',
    size: 1.0,
    type: 'LIVE_SATELLITE',
    ...sat
  })) : [];

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

  const internalAirLabels = flightTracks.map(flight => ({
    lat: flight.coordinates?.lat,
    lng: flight.coordinates?.lng,
    alt: 0.08,
    text: `✈ ${flight.callsign} [INTERNAL]`,
    color: '#00e5ff',
    size: 1.2,
    type: 'AIR_TARGET',
    ...flight
  }));

  const allLabels = [...flightLabels, ...shipLabels, ...satLabels, ...groundLabels, ...internalAirLabels];

  // Graph Node Colors
  const getNodeColor = (node) => {
    if (node.threatLevel === 'HIGH' || node.threatLevel === 'CRITICAL') return '#ff0055';
    switch (node.label) {
      case 'IntelEvent': return '#ff5500';
      case 'Person': return '#00ffcc';
      case 'Location': return '#ffee00';
      case 'Organization': return '#9900ff';
      case 'IntelSource': return '#0088ff';
      default: return '#3b4252';
    }
  };

  return (
    <div style={{ backgroundColor: '#07080a', height: '100vh', width: '100vw', margin: 0, padding: 0, fontFamily: "'Courier New', monospace", color: '#00ffcc', display: 'flex', overflow: 'hidden' }}>
      
      {/* Main Map Viewport */}
      <div style={{ flex: 1, position: 'relative', height: '100%' }}>
        
        {/* Command Controls Overhead */}
        <div className="hud-header">
          <h1>AETHERIS MK-IV C2</h1>
          <p className="subtitle">TACTICAL AIR & GROUND MATRIX</p>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <button 
              onClick={() => setViewMode('GRAPH')} 
              className={`view-btn ${viewMode === 'GRAPH' ? 'active' : ''}`}>
              ◈ NETWORK GRAPH
            </button>
            <button 
              onClick={() => setViewMode('MAP')} 
              className={`view-btn ${viewMode === 'MAP' ? 'active' : ''}`}>
              ◉ 3D ORBITAL GLOBE
            </button>
          </div>

          {viewMode === 'MAP' && (
            <div style={{ display: 'flex', gap: '15px', fontSize: '0.7rem', borderTop: '1px solid #1a2332', paddingTop: '8px', flexWrap: 'wrap' }}>
              <label style={{ cursor: 'pointer', color: '#00ffcc', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input type="checkbox" checked={showGroundIntel} onChange={(e) => setShowGroundIntel(e.target.checked)} /> Ground Intel ({geoLocations.length})
              </label>
              <label style={{ cursor: 'pointer', color: '#00ffcc', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input type="checkbox" checked={showGlobalNet} onChange={(e) => setShowGlobalNet(e.target.checked)} /> Global Net (194)
              </label>
              <label style={{ cursor: 'pointer', color: '#ff9900', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input type="checkbox" checked={showLiveFlights} onChange={(e) => setShowLiveFlights(e.target.checked)} /> Flights ({liveFlights.length})
              </label>
              <label style={{ cursor: 'pointer', color: '#00ff00', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input type="checkbox" checked={showLiveShips} onChange={(e) => setShowLiveShips(e.target.checked)} /> Ships ({liveShips.length})
              </label>
              <label style={{ cursor: 'pointer', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input type="checkbox" checked={showLiveSats} onChange={(e) => setShowLiveSats(e.target.checked)} /> Sats ({liveSatellites.length})
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
            linkDirectionalArrowLength={4}
            linkDirectionalArrowColor={() => 'rgba(0, 255, 204, 0.3)'}
            backgroundColor="#07080a"
            onNodeClick={(node) => setSelectedNode(node)}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const size = (node.threatLevel === 'HIGH' || node.threatLevel === 'CRITICAL') ? 6 : 4;
              const color = getNodeColor(node);
              ctx.beginPath();
              ctx.arc(node.x, node.y, size + 2, 0, 2 * Math.PI);
              ctx.fillStyle = color + '33';
              ctx.fill();
              ctx.beginPath();
              ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
              ctx.fillStyle = color;
              ctx.fill();
              const label = node.name || '';
              const fontSize = 10 / globalScale;
              ctx.font = `${fontSize}px Courier New`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#8a99ad';
              ctx.fillText(label.substring(0, 20), node.x, node.y + size + fontSize);
            }}
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

            // === 194 COUNTRY NETWORK OVERLAY ===
            // Country dots
            pointsData={countryPoints}
            pointLat={d => d.lat}
            pointLng={d => d.lng}
            pointColor={d => d.color}
            pointAltitude={0.005}
            pointRadius={d => d.size}
            pointsMerge={true}
            onPointClick={(point) => setSelectedNode(point)}

            // Country connection arcs
            arcsData={countryArcs}
            arcStartLat={d => d.startLat}
            arcStartLng={d => d.startLng}
            arcEndLat={d => d.endLat}
            arcEndLng={d => d.endLng}
            arcColor={d => d.color}
            arcAltitudeAutoScale={0.3}
            arcStroke={d => d.stroke}
            arcDashLength={d => d.dashLength}
            arcDashGap={d => d.dashGap}
            arcDashAnimateTime={d => d.dashAnimateTime}
          />
        )}
      </div>

      {/* Right Telemetry Sidebar */}
      <div className="inspector-panel">
        <h3>// RADAR & TARGET INSPECTOR</h3>
        
        {selectedNode ? (
          <div className="inspector-card">
            {selectedNode.type === 'AIR_TARGET' ? (
              <>
                <p style={{ color: '#00e5ff' }}><strong>TYPE:</strong> AIRBORNE TARGET</p>
                <p><strong>CALLSIGN:</strong> {selectedNode.callsign}</p>
                <p><strong>ORIGIN:</strong> {selectedNode.origin_country}</p>
                <p><strong>ALTITUDE:</strong> {selectedNode.altitude} m</p>
                <p><strong>VELOCITY:</strong> {selectedNode.velocity} m/s</p>
                {selectedNode.coordinates && (
                  <p className="coord"><strong>LAT/LNG:</strong> {selectedNode.coordinates.lat?.toFixed(4)}, {selectedNode.coordinates.lng?.toFixed(4)}</p>
                )}
              </>
            ) : selectedNode.type === 'LIVE_FLIGHT' ? (
              <>
                <p style={{ color: '#ff9900' }}><strong>TYPE:</strong> LIVE FLIGHT</p>
                <p><strong>CALLSIGN:</strong> {selectedNode.callsign}</p>
                <p><strong>ORIGIN:</strong> {selectedNode.origin_country}</p>
                <p><strong>ALTITUDE:</strong> {selectedNode.altitude} m</p>
                <p><strong>VELOCITY:</strong> {selectedNode.velocity} m/s</p>
                <p className="coord"><strong>LAT/LNG:</strong> {selectedNode.lat?.toFixed(4)}, {selectedNode.lng?.toFixed(4)}</p>
              </>
            ) : selectedNode.type === 'LIVE_SHIP' ? (
              <>
                <p style={{ color: '#00ff00' }}><strong>TYPE:</strong> LIVE VESSEL</p>
                <p><strong>NAME/MMSI:</strong> {selectedNode.name}</p>
                <p><strong>SPEED:</strong> {selectedNode.speed} knots</p>
                <p><strong>HEADING:</strong> {selectedNode.heading}°</p>
                <p className="coord"><strong>LAT/LNG:</strong> {selectedNode.lat?.toFixed(4)}, {selectedNode.lng?.toFixed(4)}</p>
              </>
            ) : selectedNode.type === 'LIVE_SATELLITE' ? (
              <>
                <p style={{ color: '#ffffff' }}><strong>TYPE:</strong> ACTIVE SATELLITE</p>
                <p><strong>NAME:</strong> {selectedNode.name}</p>
                <p><strong>ALTITUDE:</strong> {selectedNode.altitudeKm?.toFixed(1)} km</p>
                <p className="coord"><strong>LAT/LNG:</strong> {selectedNode.lat?.toFixed(4)}, {selectedNode.lng?.toFixed(4)}</p>
              </>
            ) : selectedNode.type === 'COUNTRY_NODE' ? (
              <>
                <p style={{ color: regionColor(selectedNode.region) }}><strong>TYPE:</strong> GLOBAL NETWORK NODE</p>
                <p><strong>COUNTRY:</strong> {selectedNode.name}</p>
                <p><strong>REGION:</strong> {regionLabel(selectedNode.region)}</p>
                <p className="coord"><strong>LAT/LNG:</strong> {selectedNode.lat?.toFixed(4)}, {selectedNode.lng?.toFixed(4)}</p>
              </>
            ) : (
              <>
                <p><strong>Identifier:</strong> {selectedNode.name}</p>
                <p><strong>Type:</strong> {selectedNode.label}</p>
                {selectedNode.latitude != null && (
                  <p className="coord"><strong>Coordinates:</strong> {Number(selectedNode.latitude).toFixed(4)}, {Number(selectedNode.longitude).toFixed(4)}</p>
                )}
                {selectedNode.threatLevel && selectedNode.threatLevel !== 'NORMAL' && (
                  <p className="threat"><strong>⚠ Threat Level:</strong> {selectedNode.threatLevel}</p>
                )}
              </>
            )}
          </div>
        ) : (
          <p className="inspector-placeholder">Click any 3D marker, country node, ship, satellite or airborne target to inspect telemetry.</p>
        )}

        {/* Legend */}
        <div style={{ marginTop: '20px', fontSize: '0.65rem', color: '#556677' }}>
          <p style={{ marginBottom: '8px', color: '#8a99ad', fontSize: '0.75rem' }}>// LEGEND</p>
          {[
            { color: '#ff9900', label: 'Live Flights (OpenSky)' },
            { color: '#00ff00', label: 'Live Ships (AISStream)' },
            { color: '#ffffff', label: 'Active Satellites (CelesTrak)' },
            { color: '#ff5500', label: 'IntelEvent' },
            { color: '#00ffcc', label: 'Person / Node' },
            { color: '#ffee00', label: 'Location' },
            { color: '#9900ff', label: 'Organization' },
            { color: '#ff0055', label: 'CRITICAL Threat' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: item.color, flexShrink: 0 }}></span>
              <span>{item.label}</span>
            </div>
          ))}
          <div style={{ marginTop: '8px', borderTop: '1px solid #1a2332', paddingTop: '6px' }}>
            <p style={{ marginBottom: '4px', color: '#8a99ad' }}>// GLOBAL NET</p>
            {[
              { color: '#00ffcc', label: 'Africa' },
              { color: '#00e5ff', label: 'Asia' },
              { color: '#9966ff', label: 'Europe' },
              { color: '#ff6600', label: 'North America' },
              { color: '#ffcc00', label: 'South America' },
              { color: '#ff3399', label: 'Oceania' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: item.color, flexShrink: 0 }}></span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Bar */}
        <div className="status-bar">
          <span className="live-dot"></span>
          LIVE | {nodeCount} NODES | {linkCount} LINKS | REFRESH 5s
        </div>
      </div>

    </div>
  );
}

// Region color map
function regionColor(region) {
  switch (region) {
    case 'AF': return '#00ffcc';
    case 'AS': return '#00e5ff';
    case 'EU': return '#9966ff';
    case 'NA': return '#ff6600';
    case 'SA': return '#ffcc00';
    case 'OC': return '#ff3399';
    default: return '#3b4252';
  }
}

function regionLabel(region) {
  switch (region) {
    case 'AF': return 'AFRICA';
    case 'AS': return 'ASIA';
    case 'EU': return 'EUROPE';
    case 'NA': return 'NORTH America';
    case 'SA': return 'SOUTH America';
    case 'OC': return 'OCEANIA';
    default: return 'UNKNOWN';
  }
}

export default App;