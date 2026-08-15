import torch
from PIL import Image
from facenet_pytorch import MTCNN, InceptionResnetV1
from qdrant_client import QdrantClient
from neo4j import GraphDatabase

print("[*] Initializing PyTorch Vision Scanner...")
device = torch.device('cuda:0' if torch.cuda.is_available() else 'cpu')

# MTCNN handles face detection and alignment
mtcnn = MTCNN(keep_all=True, device=device)
resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)

# Database Connections
qdrant = QdrantClient(host="localhost", port=6333)
neo4j_driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "AetherisSecretPassword123"))

COLLECTION_NAME = "aetheris_hvt_faces"

def scan_media(image_path, event_id="EVT-LIVE-01"):
    print(f"\n[*] Scanning incoming intel media: {image_path}")
    
    try:
        img = Image.open(image_path).convert('RGB')
    except FileNotFoundError:
        print(f"[-] Error: Could not find '{image_path}'.")
        return

    # 1. Detect all faces in the image
    faces = mtcnn(img)
    if faces is None:
        print("[-] No faces detected in the media.")
        return

    print(f"[*] Detected {len(faces)} face(s). Extracting biometrics...")
    
    # 2. Extract 512-D Feature Vectors for each face
    faces_cropped = faces.to(device)
    embeddings = resnet(faces_cropped).detach().cpu().numpy()

    # 3. Cross-reference against Qdrant HVT Watchlist using the compatible search API
    for idx, embedding in enumerate(embeddings):
        search_result = qdrant.search(
            collection_name=COLLECTION_NAME,
            query_vector=embedding.tolist(),
            limit=1
        )
        
        # 0.85 is our strict confidence threshold for a biometric match
        if search_result and search_result[0].score >= 0.85:
            match = search_result[0]
            hvt_data = match.payload
            
            print(f"\n[!!!] BIOMETRIC MATCH DETECTED [!!!]")
            print(f"    -> Identity: {hvt_data['name']}")
            print(f"    -> Threat Level: {hvt_data['threat_level']}")
            print(f"    -> Confidence Score: {match.score:.4f}")
            
            # 4. Dynamically update Neo4j Knowledge Graph
            print("[*] Linking identity to Neo4j Event Graph...")
            with neo4j_driver.session() as session:
                session.run("""
                MERGE (event:IntelEvent {source_id: $event_id})
                MERGE (hvt:Person {name: $name})
                ON CREATE SET hvt.hvt_id = $hvt_id, hvt.threat_level = $threat_level
                MERGE (hvt)-[r:IDENTIFIED_IN]->(event)
                SET r.confidence = $score
                """, event_id=event_id, 
                     hvt_id=hvt_data['hvt_id'], 
                     name=hvt_data['name'], 
                     threat_level=hvt_data['threat_level'], 
                     score=match.score)
            print("[+] Graph updated successfully. HVT linked to Event.")
        else:
            print(f"\n[-] Face {idx+1}: No matches found on HVT Watchlist.")

if __name__ == "__main__":
    scan_media("real_target.jpg", event_id="OSINT-TEST-BRAVO")