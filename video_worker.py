import cv2
import torch
import time
from PIL import Image
from facenet_pytorch import MTCNN, InceptionResnetV1
from qdrant_client import QdrantClient
from neo4j import GraphDatabase

print("[*] Initializing Optical Tracking Engine...")
device = torch.device('cuda:0' if torch.cuda.is_available() else 'cpu')

# MTCNN for detection, ResNet for feature vectors
mtcnn = MTCNN(keep_all=True, device=device)
resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)

# Database Connections
qdrant = QdrantClient(host="localhost", port=6333)
neo4j_driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "AetherisSecretPassword123"))
COLLECTION_NAME = "aetheris_hvt_faces"

# Cooldown dictionary to prevent flooding Neo4j with events every frame
last_logged_time = {}
LOG_COOLDOWN_SECONDS = 10 

def track_video_stream(video_source=0, event_id="OPTICAL-FEED-01"):
    print(f"\n[*] Tapping into video feed: {video_source}")
    cap = cv2.VideoCapture(video_source)
    
    # Process 1 out of every 10 frames to maintain real-time performance
    process_every_n_frames = 10 
    frame_count = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            print("[-] Video stream ended or lost connection.")
            break
            
        frame_count += 1
        display_frame = frame.copy()

        # Run Heavy ML on selected frames
        if frame_count % process_every_n_frames == 0:
            # OpenCV uses BGR, PyTorch expects RGB
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            img_pil = Image.fromarray(rgb_frame)
            
            # Detect bounding boxes and extract faces
            boxes, _ = mtcnn.detect(img_pil)
            faces = mtcnn(img_pil)
            
            if faces is not None and boxes is not None:
                faces_cropped = faces.to(device)
                embeddings = resnet(faces_cropped).detach().cpu().numpy()
                
                for idx, embedding in enumerate(embeddings):
                    search_result = qdrant.search(
                        collection_name=COLLECTION_NAME,
                        query_vector=embedding.tolist(),
                        limit=1
                    )
                    
                    if search_result and search_result[0].score >= 0.85:
                        match = search_result[0]
                        hvt = match.payload
                        target_name = hvt['name']
                        
                        # 1. Draw Tactical Bounding Box on the live video window
                        box = boxes[idx]
                        cv2.rectangle(display_frame, (int(box[0]), int(box[1])), (int(box[2]), int(box[3])), (0, 0, 255), 2)
                        cv2.putText(display_frame, f"HVT: {target_name} ({match.score:.2f})", 
                                    (int(box[0]), int(box[1]) - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
                        
                        # 2. Log to Neo4j Graph (with cooldown)
                        current_time = time.time()
                        if target_name not in last_logged_time or (current_time - last_logged_time[target_name]) > LOG_COOLDOWN_SECONDS:
                            print(f"[!!!] LIVE HVT OPTICAL LOCK: {target_name} (Confidence: {match.score:.2f})")
                            last_logged_time[target_name] = current_time
                            
                            with neo4j_driver.session() as session:
                                session.run("""
                                MERGE (event:IntelEvent {source_id: $event_id})
                                ON CREATE SET event.raw_text = 'Live Optical HVT Sighting', event.classification = 'SECRET-OPTICAL'
                                MERGE (hvt:Person {name: $name})
                                ON CREATE SET hvt.threat_level = $threat_level
                                MERGE (hvt)-[r:IDENTIFIED_IN]->(event)
                                SET r.confidence = $score, r.last_seen = timestamp()
                                """, event_id=event_id, name=target_name, threat_level=hvt['threat_level'], score=match.score)

        # Render the live video window
        cv2.imshow('AETHERIS MK-IV OPTICAL FEED', display_frame)
        
        # Press 'q' to shut down the feed
        if cv2.waitKey(1) & 0xFF == ord('q'):
            print("[*] Terminating optical feed.")
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    # '0' tells OpenCV to use your default laptop webcam. 
    # You can change this to "drone_video.mp4" to parse a recorded file.
    track_video_stream(0, "LIVE-WEBCAM-HQ")
    