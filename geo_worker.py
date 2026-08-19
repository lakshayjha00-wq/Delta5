import time
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderUnavailable
from neo4j import GraphDatabase

print("[*] Initializing AETHERIS Geospatial Daemon...")

# Database Connection
neo4j_driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "AetherisSecretPassword123"))
geolocator = Nominatim(user_agent="aetheris_c2_engine_v2")

def resolve_locations():
    """Finds Location nodes missing lat/lng coordinates and geocodes them."""
    with neo4j_driver.session() as session:
        result = session.run("""
            MATCH (loc:Location)
            WHERE loc.latitude IS NULL OR loc.longitude IS NULL
            RETURN loc.name AS location_name
        """)
        
        locations_to_geocode = [record["location_name"] for record in result]

        if not locations_to_geocode:
            return

        print(f"[*] Found {len(locations_to_geocode)} unmapped location(s). Geocoding...")

        for loc_name in locations_to_geocode:
            try:
                time.sleep(1) # Respect Nominatim rate limits
                location = geolocator.geocode(loc_name, timeout=10)
                
                if location:
                    print(f"  [+] Mapped '{loc_name}' -> ({location.latitude}, {location.longitude})")
                    session.run("""
                        MATCH (loc:Location {name: $name})
                        SET loc.latitude = $lat, loc.longitude = $lng
                    """, name=loc_name, lat=location.latitude, lng=location.longitude)
                else:
                    print(f"  [-] Could not resolve coordinates for '{loc_name}'")
                    
            except (GeocoderTimedOut, GeocoderUnavailable):
                print(f"  [-] Timeout/Unavailable error resolving '{loc_name}'. Skipping...")

if __name__ == "__main__":
    print("[*] Geospatial Daemon active. Continuous polling enabled (every 10s)...")
    while True:
        try:
            resolve_locations()
        except Exception as e:
            print(f"[-] Loop error: {e}")
        time.sleep(10)