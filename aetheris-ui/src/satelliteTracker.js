const LIVE_SATELLITE_API = 'https://api.wheretheiss.at/v1/satellites';

export class SatelliteTracker {
  constructor() {
    this.satellites = [];
  }

  async fetchSatellites() {
    try {
      const res = await fetch(LIVE_SATELLITE_API, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`ISS API returned ${res.status}`);
      }

      const data = await res.json();
      const now = Date.now();

      this.satellites = (Array.isArray(data) ? data : [data])
        .slice(0, 12)
        .map((sat, index) => ({
          id: sat.id ?? `sat-${index}`,
          name: sat.name || `SAT-${index + 1}`,
          lat: Number(sat.latitude),
          lng: Number(sat.longitude),
          altitudeKm: Number(sat.altitude) || 0,
          visualAlt: Math.max(0.12, Math.min(1.6, (Number(sat.altitude) || 0) / 5000)),
          type: 'SATELLITE',
          timestamp: now,
        }))
        .filter((sat) => Number.isFinite(sat.lat) && Number.isFinite(sat.lng));

      console.log(`[SATS] Loaded ${this.satellites.length} live satellite positions from Where the ISS at`);
    } catch (error) {
      console.warn('[SATS] Live satellite fetch failed:', error.message);
      this.satellites = [];
    }

    return this.satellites;
  }

  getPositions() {
    return this.satellites;
  }
}
