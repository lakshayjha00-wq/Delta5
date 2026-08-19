import torch
import uuid
from PIL import Image
from facenet_pytorch import MTCNN, InceptionResnetV1
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct

print("[*] Initializing Vision Models (This may take a moment to download weights)...")
# Automatically use GPU (CUDA) if available, otherwise fallback to CPU
device = torch.device('cuda:0' if torch.cuda.is_available() else 'cpu')

# MTCNN: Detects and crops the face
# keep_all=False ensures we only grab the single most prominent face in the photo
mtcnn = MTCNN(keep_all=False, device=device)

# InceptionResnetV1: Generates the 512-Dimensional facial vector
resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)

client = QdrantClient(host="localhost", port=6333)
COLLECTION_NAME = "aetheris_hvt_faces"

def register_target(image_path, target_name, threat_level):
    print(f"\n[*] Processing image: {image_path}")
    
    try:
        img = Image.open(image_path).convert('RGB')
    except FileNotFoundError:
        print(f"[-] Error: Could not find '{image_path}'. Make sure it is in the Delta5 folder.")
        return

    # Extract the face
    face = mtcnn(img)
    if face is None:
        print("[-] No face detected. Please use a clearer image.")
        return

    # Generate the 512-D embedding
    print("[*] Face detected. Generating 512-D vector embedding...")
    # Unsqueeze adds a batch dimension required by the model: (1, 3, 160, 160)
    face_tensor = face.unsqueeze(0).to(device)
    embedding = resnet(face_tensor).detach().cpu().numpy()[0]

    # Generate a unique cryptographic ID for the database
    target_id = str(uuid.uuid4())

    # Upsert into Qdrant Watchlist
    client.upsert(
        collection_name=COLLECTION_NAME,
        points=[
            PointStruct(
                id=target_id,
                vector=embedding.tolist(),
                payload={
                    "hvt_id": target_id,
                    "name": target_name,
                    "threat_level": threat_level,
                    "status": "ACTIVE_TRACKING"
                }
            )
        ]
    )
    
    print(f"[+] Target '{target_name}' successfully added to the Watchlist.")
    print(f"    -> Qdrant Vector ID: {target_id}")

if __name__ == "__main__":
    # Register Target Bravo
    register_target("real_target.jpg", "REAL WORLD LEADER NAME", "CRITICAL")