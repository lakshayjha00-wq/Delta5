const { Kafka } = require('kafkajs');
const Parser = require('rss-parser');

const kafka = new Kafka({
  clientId: 'aetheris-live-gateway',
  brokers: ['localhost:19092'],
});

const producer = kafka.producer();
const parser = new Parser();

// Live Open-Source Intelligence Feeds
const OSINT_FEEDS = [
    'https://www.defensenews.com/arc/outboundfeeds/rss/', // Live global defense movements
    'http://feeds.bbci.co.uk/news/world/rss.xml'          // Live global flashpoints
];

async function ingestLiveOSINT() {
    await producer.connect();
    console.log('[*] Connected to Redpanda Event Bus');
    console.log('[*] Tapping into live OSINT web feeds...\n');

    for (const feedUrl of OSINT_FEEDS) {
        try {
            const feed = await parser.parseURL(feedUrl);
            console.log(`[+] Ingesting live feed: ${feed.title}`);

            // Grab the 3 most recent real-world events from this feed
            const recentEvents = feed.items.slice(0, 3);

            for (const item of recentEvents) {
                // Map the real internet data to the AETHERIS intelligence schema
                const livePayload = {
                    source_id: `OSINT-${item.guid || Date.now()}`,
                    timestamp: item.pubDate || new Date().toISOString(),
                    classification: 'UNCLASSIFIED-OSINT',
                    raw_text: `${item.title} - ${item.contentSnippet || item.content}`,
                    location_hint: 'Global/Unknown' // We will rely on Python NLP to extract the real location later
                };

                // Stream the live event to Redpanda
                await producer.send({
                    topic: 'raw-osint',
                    messages: [
                        { key: livePayload.source_id, value: JSON.stringify(livePayload) }
                    ]
                });

                console.log(`  -> Streamed real event: "${item.title}"`);
            }
        } catch (error) {
            console.error(`[-] Failed to fetch feed ${feedUrl}: ${error.message}`);
        }
    }

    console.log('\n[+] Live ingestion cycle complete. Closing connection.');
    await producer.disconnect();
}

ingestLiveOSINT().catch(console.error);