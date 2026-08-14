import json
import spacy
from kafka import KafkaConsumer
from neo4j import GraphDatabase

# 1. Load the NLP Named Entity Recognition (NER) Model
print("[*] Loading NLP Engine (spaCy en_core_web_sm)...")
nlp = spacy.load("en_core_web_sm")

# 2. Connect to Databases
NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "AetherisSecretPassword123"
neo4j_driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

consumer = KafkaConsumer(
    'raw-osint',
    bootstrap_servers=['localhost:19092'],
    auto_offset_reset='latest', # Only grab new live events
    enable_auto_commit=True,
    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
)

# 3. Dynamic Cypher Query Builder
def map_nlp_event_to_graph(tx, event_data, entities):
    # Base query for the event itself
    query = """
    MERGE (source:IntelSource {source_id: $source_id})
    CREATE (event:IntelEvent {
        timestamp: $timestamp, 
        raw_text: $raw_text, 
        classification: $classification
    })
    CREATE (source)-[:REPORTED]->(event)
    """
    
    # Dynamically inject the extracted NLP entities into the query
    for i, ent in enumerate(entities):
        if ent['type'] == 'LOCATION':
            query += f"\nMERGE (loc{i}:Location {{name: '{ent['name']}'}})"
            query += f"\nCREATE (event)-[:OCCURRED_IN]->(loc{i})"
        elif ent['type'] == 'PERSON':
            query += f"\nMERGE (per{i}:Person {{name: '{ent['name']}'}})"
            query += f"\nCREATE (event)-[:MENTIONS_PERSON]->(per{i})"
        elif ent['type'] == 'ORGANIZATION':
            query += f"\nMERGE (org{i}:Organization {{name: '{ent['name']}'}})"
            query += f"\nCREATE (event)-[:MENTIONS_ORG]->(org{i})"
            
    tx.run(query, 
           source_id=event_data.get('source_id'),
           timestamp=event_data.get('timestamp'),
           raw_text=event_data.get('raw_text'),
           classification=event_data.get('classification'))

# 4. Processing Pipeline
print("[+] Upgraded NLP Worker Active. Awaiting live intel streams...")

try:
    for message in consumer:
        payload = message.value
        raw_text = payload.get('raw_text')
        
        print(f"\n[Live Intercept] {raw_text[:75]}...")
        
        # Run NLP Inference
        doc = nlp(raw_text)
        extracted_entities = []
        
        for ent in doc.ents:
            if ent.label_ in ['GPE', 'LOC']: # Geopolitical Entity / Location
                extracted_entities.append({'name': ent.text, 'type': 'LOCATION'})
            elif ent.label_ == 'PERSON':
                extracted_entities.append({'name': ent.text, 'type': 'PERSON'})
            elif ent.label_ == 'ORG':
                extracted_entities.append({'name': ent.text, 'type': 'ORGANIZATION'})
                
        print(f"  -> Extracted Entities: {extracted_entities}")
        
        # Write dynamic entities to Neo4j
        if extracted_entities:
            with neo4j_driver.session() as session:
                session.execute_write(map_nlp_event_to_graph, payload, extracted_entities)
            print("  -> [+] Graph topology updated.")
        else:
            print("  -> [-] No actionable entities found. Skipping graph update.")
            
except KeyboardInterrupt:
    print("\n[-] Shutting down NLP worker.")
finally:
    neo4j_driver.close()
    consumer.close()