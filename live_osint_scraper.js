const Parser = require('rss-parser');
const { Kafka, Partitioners } = require('kafkajs');

const parser = new Parser({
    customFields: {
        item: ['media:content', 'media:thumbnail', 'enclosure']
    }
});

const kafka = new Kafka({
  clientId: 'aetheris-live-scraper',
  brokers: ['localhost:19092'] // Updated port
});

// Pass LegacyPartitioner to silence the v2 partitioner warning
const producer = kafka.producer({
    createPartitioner: Partitioners.LegacyPartitioner
});

// Trusted Live OSINT Targets
const RSS_FEEDS = [
    'http://feeds.bbci.co.uk/news/world/rss.xml',
    'https://www.aljazeera.com/xml/rss/all.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    'https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?max=10&Site=945'
];

async function runScraper() {
    await producer.connect();
    console.log("[*] LIVE GLOBAL OSINT SCRAPER ONLINE.");
    console.log("[*] Monitoring global event frequencies...\n");

    setInterval(async () => {
        for (const feedUrl of RSS_FEEDS) {
            try {
                let feed = await parser.parseURL(feedUrl);
                const articles = feed.items.slice(0, 3); // Pull the 3 most recent breaking events
                
                for (const item of articles) {
                    // Extract live image URL from the news source
                    let imageUrl = null;
                    if (item['media:content']) imageUrl = item['media:content']['$']?.url;
                    else if (item['media:thumbnail']) imageUrl = item['media:thumbnail']['$']?.url;
                    else if (item.enclosure) imageUrl = item.enclosure.url;

                    const eventPayload = {
                        source_id: `LIVE-WEB-${Date.now()}`,
                        title: item.title,
                        raw_text: item.contentSnippet || item.title,
                        source_url: item.link,
                        image_url: imageUrl, // Crucial for our biometric engine
                        classification: 'LIVE-OSINT',
                        timestamp: new Date().toISOString()
                    };

                    await producer.send({
                        topic: 'osint-events',
                        messages: [{ value: JSON.stringify(eventPayload) }],
                    });
                    
                    console.log(`[+] INTERCEPTED: ${item.title.substring(0, 60)}...`);
                    if (imageUrl) console.log(`    -> Visual Media Extracted: ${imageUrl}`);
                }
            } catch (err) {
                console.error(`[-] Error intercepting ${feedUrl}:`, err.message);
            }
        }
    }, 60000); // Sweep feeds every 60 seconds
}

runScraper();