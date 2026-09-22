const TRAFFIC_REGIONS = [
  { name: 'North America', lat: 39.8283, lng: -98.5795 },
  { name: 'Europe', lat: 50.1109, lng: 8.6821 },
  { name: 'East Asia', lat: 35.6762, lng: 139.6503 },
  { name: 'Middle East', lat: 25.2048, lng: 55.2708 },
];

export async function fetchTrafficData() {
  try {
    const results = await Promise.all(
      TRAFFIC_REGIONS.map(async ({ name, lat, lng }) => {
        const query = `
          [out:json][timeout:25];
          (
            way["highway"~"motorway|trunk|primary|secondary"](around:180000,${lat},${lng});
            way["railway"~"rail|subway|tram"](around:180000,${lat},${lng});
          );
          out center 25;
        `;

        const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`, { cache: 'no-store' });
        if (!res.ok) return [];

        const data = await res.json();
        return (data.elements || [])
          .filter((el) => Number.isFinite(el.center?.lat) || Number.isFinite(el.lat))
          .slice(0, 15)
          .map((el) => ({
            id: `${name}-${el.id}`,
            name: `${name} corridor`,
            lat: Number(el.center?.lat ?? el.lat),
            lng: Number(el.center?.lon ?? el.lon),
            kind: el.tags?.railway ? 'RAIL' : 'ROAD',
            type: 'TRAFFIC',
          }));
      })
    );

    return results.flat().slice(0, 60);
  } catch (error) {
    console.warn('[TRAFFIC] Failed to load public road/rail network data:', error.message);
    return [];
  }
}
