from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams

# Connect to local Qdrant container
client = QdrantClient(host="localhost", port=6333)

COLLECTION_NAME = "aetheris_hvt_faces"

# Safe way to check collection existence across older Qdrant versions
collections_response = client.get_collections()
existing_collections = [col.name for col in collections_response.collections]

if COLLECTION_NAME not in existing_collections:
    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=512, distance=Distance.COSINE),
    )
    print(f"[+] Qdrant collection '{COLLECTION_NAME}' created successfully.")
else:
    print(f"[*] Collection '{COLLECTION_NAME}' already exists.")