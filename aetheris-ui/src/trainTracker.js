const TRAIN_QUERIES = [
  { name: 'New York', lat: 40.7128, lng: -74.0060 },
  { name: 'London', lat: 51.5074, lng: -0.1278 },
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  { name: 'Paris', lat: 48.8566, lng: 2.3522 },
];

export async function fetchTrainStations() {
  try {
    const results = await Promise.all(
      TRAIN_QUERIES.map(async ({ name, lat, lng }) => {
        const query = `https://overpass-api.de/api/interpreter?data=[out:json][timeout:25];node["railway"="station"](around:1500000,${lat},${lng});out center 20;`;
        const res = await fetch(query, { cache: 'no-store' });
        if (!res.ok) return [];

        const data = await res.json();
        return (data.elements || [])
          .filter((el) => Number.isFinite(el.lat) && Number.isFinite(el.lon))
          .slice(0, 8)
          .map((el) => ({
            id: `${name}-${el.id}`,
            name: el.tags?.name || `${name} Station`,
            lat: Number(el.lat),
            lng: Number(el.lon),
            region: name,
            type: 'TRAIN',
          }));
      })
    );

    const merged = results.flat();
    return merged.slice(0, 30);
  } catch (error) {
    console.warn('[TRAINS] Failed to load public rail station data:', error.message);
    return [];
  }
}
