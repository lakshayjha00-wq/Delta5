const { Kafka } = require('kafkajs');
const WebSocket = require('ws');

console.log("[*] Initializing AETHERIS Kinetic Integration Bridge...");

// 1. Stand up the WebSocket Server on Port 8081
const wss = new WebSocket.Server({ port: 8081 });

wss.on('connection', (ws) => {
    console.log("[+] EXTERNAL SYSTEM CONNECTED: Handshake established.");
    ws.send(JSON.stringify({ status: "AETHERIS C2 LINK ACTIVE" }));
});

// 2. Connect to the Live Intelligence Stream (Kafka)
const kafka = new Kafka({
  clientId: 'aetheris-kinetic-bridge',
  brokers: ['localhost:19092']
});

const consumer = kafka.consumer({ groupId: 'external-bridge-group' });

async function runBridge() {
    await consumer.connect();
    await consumer.subscribe({ topic: 'osint-events', fromBeginning: false });

    console.log("[*] Bridge armed. Monitoring for CRITICAL targets...");

    await consumer.run({
        eachMessage: async ({ message }) => {
            const event = JSON.parse(message.value.toString());
            
            // 3. Filter for High-Value Targeting Logic
            // If the Vision Engine logs a biometric match, broadcast the coordinates
            if (event.classification === 'CONFIRMED-SIGHTING' || event.threat_level === 'CRITICAL') {
                
                const targetPayload = {
                    directive: "TARGET_ACQUISITION",
                    timestamp: event.timestamp,
                    identifier: event.target_name || event.title,
                    coordinates: {
                        lat: event.latitude || null, // Will pull from Geo-Worker if available
                        lng: event.longitude || null
                    },
                    confidence: event.confidence || 1.00
                };

                console.log(`[!!!] TARGET ACQUIRED: Broadcasting payload to external networks...`);
                
                // 4. Blast the payload to all connected simulations/radars
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(targetPayload));
                    }
                });
            }
        },
    });
}

runBridge().catch(console.error);
