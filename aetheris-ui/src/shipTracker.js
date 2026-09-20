// Connects to AISStream.io to get real-time ship tracking data
// Using the provided API key

const AISSTREAM_KEY = '607548aaa224efdaff44369226910d4f375ae70e';
const MAX_SHIPS = 150; // Cap to avoid overloading UI

export class ShipTracker {
  constructor(onUpdate) {
    this.ships = new Map();
    this.onUpdate = onUpdate;
    this.socket = null;
    this.reconnectTimeout = null;
  }

  connect() {
    console.log('[SHIPS] Connecting to AISStream...');
    this.socket = new WebSocket('wss://stream.aisstream.io/v0/stream');

    this.socket.onopen = () => {
      console.log('[SHIPS] Connected');
      const subscriptionMessage = {
        Apikey: AISSTREAM_KEY,
        BoundingBoxes: [[[-90, -180], [90, 180]]], // Global coverage
        FiltersShipMMSI: [], 
        FilterMessageTypes: ["PositionReport"] 
      };
      this.socket.send(JSON.stringify(subscriptionMessage));
    };

    this.socket.onmessage = (event) => {
      try {
        const aisMessage = JSON.parse(event.data);
        if (aisMessage["MessageType"] === "PositionReport") {
          const report = aisMessage["Message"]["PositionReport"];
          const mmsi = aisMessage["MetaData"]["MMSI"];
          const shipName = aisMessage["MetaData"]["ShipName"] || `MMSI: ${mmsi}`;
          
          this.ships.set(mmsi, {
            mmsi: mmsi,
            name: shipName,
            lat: report["Latitude"],
            lng: report["Longitude"],
            speed: report["Sog"],
            heading: report["TrueHeading"],
            type: 'SHIP',
            timestamp: Date.now()
          });

          // Clean up old entries and limit size
          if (this.ships.size > MAX_SHIPS) {
            const sorted = Array.from(this.ships.entries()).sort((a, b) => b[1].timestamp - a[1].timestamp);
            this.ships = new Map(sorted.slice(0, MAX_SHIPS));
          }

          if (this.onUpdate) {
            this.onUpdate(Array.from(this.ships.values()));
          }
        }
      } catch (err) {
        // Ignore parsing errors
      }
    };

    this.socket.onerror = (err) => {
      console.error('[SHIPS] WebSocket error:', err);
    };

    this.socket.onclose = () => {
      console.log('[SHIPS] WebSocket closed, reconnecting in 5s...');
      this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
    };
  }

  disconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
    }
  }
}
