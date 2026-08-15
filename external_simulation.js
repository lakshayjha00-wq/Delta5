const WebSocket = require('ws');

// Example snippet to put inside an external simulation
const aetherisLink = new WebSocket('ws://localhost:8081');

aetherisLink.on('open', () => {
    console.log("[+] Connected to AETHERIS C2 Bridge");
});

aetherisLink.on('message', (data) => {
    const telemetry = JSON.parse(data);
    
    if (telemetry.status) {
        console.log(`[STATUS] ${telemetry.status}`);
    }

    if (telemetry.directive === "TARGET_ACQUISITION") {
        console.log("---------------------------------------------------");
        console.log(`[!!!] LOCKING RADAR ON HVT: ${telemetry.identifier}`);
        console.log(`      LAT/LNG:`, telemetry.coordinates);
        console.log(`      CONFIDENCE: ${(telemetry.confidence * 100).toFixed(2)}%`);
        console.log("---------------------------------------------------");
    }
});
