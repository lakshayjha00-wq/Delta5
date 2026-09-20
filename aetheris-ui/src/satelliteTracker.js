import * as satellite from 'satellite.js';

// Fetches active satellite TLEs from CelesTrak and calculates real-time positions
const CELESTRAK_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle';
const MAX_SATS = 300; // Limit for performance

export class SatelliteTracker {
  constructor() {
    this.satellites = [];
  }

  async fetchSatellites() {
    try {
      console.log('[SATS] Fetching TLEs from CelesTrak...');
      const res = await fetch(CELESTRAK_URL);
      if (!res.ok) throw new Error(`CelesTrak returned ${res.status}`);
      
      const tleData = await res.text();
      const lines = tleData.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      this.satellites = [];
      // Parse 3-line sets (Name, TLE1, TLE2)
      for (let i = 0; i < lines.length - 2; i += 3) {
        if (this.satellites.length >= MAX_SATS) break;
        
        const name = lines[i];
        const tle1 = lines[i+1];
        const tle2 = lines[i+2];
        
        try {
          const satrec = satellite.twoline2satrec(tle1, tle2);
          this.satellites.push({
            name,
            satrec,
            type: 'SATELLITE'
          });
        } catch (e) {
          // Skip invalid TLEs
        }
      }
      console.log(`[SATS] Loaded ${this.satellites.length} satellites`);
    } catch (err) {
      console.warn('[SATS] Failed to fetch TLEs:', err);
    }
  }

  // Returns current positions of all loaded satellites
  getPositions() {
    const date = new Date();
    const positions = [];

    for (const sat of this.satellites) {
      try {
        const positionAndVelocity = satellite.propagate(sat.satrec, date);
        const positionEci = positionAndVelocity.position;

        if (positionEci && typeof positionEci.x !== 'undefined') {
          const gmst = satellite.gstime(date);
          const positionGd = satellite.eciToGeodetic(positionEci, gmst);
          
          const lng = satellite.degreesLong(positionGd.longitude);
          const lat = satellite.degreesLat(positionGd.latitude);
          // Altitude is in km. Globe takes relative altitude 0..1 (approximate conversion for visual scaling)
          const altKm = positionGd.height;
          const visualAlt = Math.max(0.1, Math.min(2.0, altKm / 6371));

          positions.push({
            name: sat.name,
            lat,
            lng,
            altitudeKm: altKm,
            visualAlt,
            type: 'SATELLITE'
          });
        }
      } catch (e) {
        // Skip propagate errors
      }
    }
    return positions;
  }
}
