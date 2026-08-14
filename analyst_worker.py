import requests
from neo4j import GraphDatabase

print("[*] Initializing Autonomous Analyst (Ollama / Llama 3)...")

# Connect to Neo4j
neo4j_driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "AetherisSecretPassword123"))

def get_graph_context():
    """Pulls the most recent intelligence events and known HVT locations from the graph."""
    context_data = []
    with neo4j_driver.session() as session:
        result = session.run("""
            MATCH (event:IntelEvent)-[r]-(entity)
            RETURN event.raw_text AS event_text, labels(entity)[0] AS type, entity.name AS name
            LIMIT 20
        """)
        for record in result:
            context_data.append(f"Event: '{record['event_text']}' involves {record['type']}: {record['name']}")
    return "\n".join(context_data)

def ask_analyst(prompt):
    print(f"\n[User Query]: {prompt}")
    print("[*] Accessing Neo4j Graph Memory...")
    
    # 1. Retrieve tactical context from Neo4j
    tactical_context = get_graph_context()
    
    if not tactical_context:
        print("[-] Graph memory is empty. Ingest data first.")
        return

    # 2. Construct prompt for local LLM
    system_prompt = f"""
    You are an elite intelligence analyst for AETHERIS MK-IV. 
    Use ONLY the following tactical graph data to answer the user's query. Do not invent information.
    
    TACTICAL GRAPH DATA:
    {tactical_context}
    """

    print("[*] Synthesizing brief via Llama 3 (Local Air-Gapped)...")
    
    # 3. Send query to local Ollama instance
    try:
        response = requests.post('http://localhost:11434/api/generate', json={
            "model": "llama3",
            "prompt": f"{system_prompt}\n\nUSER QUERY: {prompt}",
            "stream": False
        })
        
        if response.status_code == 200:
            reply = response.json()['response']
            print("\n================ [ TACTICAL BRIEF ] ================")
            print(reply)
            print("====================================================")
        else:
            print(f"[-] AI Core response error: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("[-] Error: Could not connect to Ollama. Ensure Ollama is running (`ollama run llama3`).")

if __name__ == "__main__":
    ask_analyst("Summarize the current known activities of Target Bravo and any geopolitical entities mentioned recently.")