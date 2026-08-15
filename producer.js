const { Kafka, Partitioners } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'aetheris-ingest-gateway',
  brokers: ['localhost:19092'],
});

const producer = kafka.producer({ createPartitioner: Partitioners.LegacyPartitioner });

async function run() {
  await producer.connect();
  console.log('[+] Connected to Redpanda Event Bus');

  const testPayload = {
    source_id: 'SRC-NEWS-LOCAL-01',
    timestamp: new Date().toISOString(),
    classification: 'UNCLASSIFIED',
    raw_text: 'BREAKING: Unidentified armed group spotted near Sector 4 logistics hub at coordinates 33.5138, 36.2765.',
    location_hint: 'Sector 4',
  };

  await producer.send({
    topic: 'raw-osint',
    messages: [
      {
        key: testPayload.source_id,
        value: JSON.stringify(testPayload),
      },
    ],
  });

  console.log('[+] Test OSINT event published successfully!');
  await producer.disconnect();
}

run().catch(console.error);