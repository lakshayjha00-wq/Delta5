import torch
import json
import requests
from io import BytesIO
from PIL import Image
from kafka import KafkaConsumer
from facenet_pytorch import MTCNN, InceptionResnetV1
from qdrant_client import QdrantClient
from neo4j import GraphDatabase

print("[*] Initializing Live Autonomous Vision Matrix...")
device = torch.device('cuda:0' if torch.cuda.is_available() else 'cpu')

mtcnn = MTCNN(keep_all=True, device=device)
resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)

qdrant = QdrantClient(host="localhost", port=6333)
neo4j_driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "AetherisSecretPassword123"))

# Connect to Redpanda Stream
consumer = KafkaConsumer(
    'osint-events',
    bootstrap_servers=['localhost:19092'],
    value_deserializer=lambda x: json.loads(x.decode('utf-8'))
)


print("[*] Listening for live media streams...")

for message in consumer:
    event = message.value
    image_url = event.get('image_url')
    event_id = event.get('source_id')
    
    if not image_url:
        continue # Skip text-only news

    try:
        # Download the live image from the news feed directly into memory
        response = requests.get(image_url, timeout=5)
        img = Image.open(BytesIO(response.content)).convert('RGB')
        
        # Detect faces
        faces = mtcnn(img)
        if faces is None:
            continue
            
        print(f"\n[*] Scanning media from: {event['title']}")
        
        faces_cropped = faces.to(device)
        embeddings = resnet(faces_cropped).detach().cpu().numpy()

        for idx, embedding in enumerate(embeddings):
            search_result = qdrant.search(
                collection_name="aetheris_hvt_faces",
                query_vector=embedding.tolist(),
                limit=1
            )
            
            if search_result and search_result[0].score >= 0.85:
                match = search_result[0]
                hvt = match.payload
                
                print(f"[!!!] BIOMETRIC LOCK ON PUBLIC FEED: {hvt['name']} (Score: {match.score:.2f})")
                
                # Write direct relationship to graph
                with neo4j_driver.session() as session:
                    session.run("""
                    MERGE (event:IntelEvent {source_id: $event_id})
                    ON CREATE SET event.raw_text = $title, event.classification = 'CONFIRMED-SIGHTING'
                    MERGE (hvt:Person {name: $name})
                    MERGE (hvt)-[r:IDENTIFIED_IN]->(event)
                    SET r.confidence = $score, r.last_seen = timestamp()
                    """, event_id=event_id, title=event['title'], name=hvt['name'], score=match.score)

    except Exception as e:
        print(f"[-] Image processing failed for {image_url}: {e}")