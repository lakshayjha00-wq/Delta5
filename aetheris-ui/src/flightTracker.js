// Fetches real-time aircraft positions from the OpenSky Network REST API
// Docs: https://openskynetwork.github.io/opensky-api/rest.html
// No API key required for anonymous access (rate-limited to ~10 req/min)

const OPENSKY_URL = 'https://opensky-network.org/api/states/all';

export async function fetchFlights() {
  try {
    const res = await fetch(OPENSKY_URL);
    if (!res.ok) {
      console.warn('[FLIGHTS] OpenSky returned', res.status);
      return [];
    }
    const data = await res.json();
    if (!data.states) return [];

    // OpenSky returns an array of arrays. Map to objects.
    // Fields: https://openskynetwork.github.io/opensky-api/rest.html#all-state-vectors
    return data.states
      .filter(s => s[5] != null && s[6] != null) // Must have lat/lng
      .slice(0, 200) // Cap to avoid overloading the globe
      .map(s => ({
        icao24: s[0],
        callsign: (s[1] || '').trim() || s[0],
        origin_country: s[2],
        lng: s[5],
        lat: s[6],
        altitude: s[7] || s[13] || 0,       // baro_altitude or geo_altitude
        velocity: s[9] || 0,                  // m/s
        heading: s[10] || 0,                   // degrees from north
        vertical_rate: s[11] || 0,
        on_ground: s[8],
        squawk: s[14],
      }))
      .filter(f => !f.on_ground); // Only airborne targets
  } catch (err) {
    console.warn('[FLIGHTS] Fetch failed:', err.message);
    return [];
  }
}
