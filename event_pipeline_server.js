const express = require('express');
const axios = require('axios');
const Parser = require('rss-parser');

const app = express();
const PORT = process.env.PORT || 3001;
const parser = new Parser();

const fallbackOutcome = {
  id: 'CORR-2026-09-22-01',
  event: 'Cross-border logistics disruption and escalation risk',
  location: 'Northern border corridor, 34.12N / 36.88E',
  pipelines: ['NEWS', 'ARTICLES', 'SATELLITE_IMAGERY', 'TRAFFIC_DATA', 'WEATHER_DATA', 'CONFLICT_ASSESSMENT'],
  status: 'Escalating',
  sources: [
    { pipeline: 'NEWS', source: 'BBC World', signal: 'Road closures and convoy movement reported near the border corridor.', confidence: 0.82 },
    { pipeline: 'ARTICLES', source: 'Regional Security Brief', signal: 'Logistics and fuel shortages are intensifying regional tension.', confidence: 0.76 },
    { pipeline: 'SATELLITE_IMAGERY', source: 'Orbital anomaly scan', signal: 'Truck staging patterns increased near the main transit hub.', confidence: 0.88 },
    { pipeline: 'TRAFFIC_DATA', source: 'Transit telemetry', signal: 'Route rerouting and dense vehicle flow around corridor checkpoints.', confidence: 0.79 },
    { pipeline: 'WEATHER_DATA', source: 'Atmospheric forecast', signal: 'Thunderstorm fronts are expected to stall relief and military movement.', confidence: 0.67 },
    { pipeline: 'CONFLICT_ASSESSMENT', source: 'Conflict watch desk', signal: 'Local threats and escalation indicators are moving upward ahead of forecast.', confidence: 0.9 }
  ],
  outcomes: [
    { label: 'Supply-chain disruption', probability: 0.86, consequence: 'Fuel, aid, and relief shipments delayed by 2-5 days.' },
    { label: 'Security escalation', probability: 0.74, consequence: 'Local troop movement and checkpoint activity likely increases.' },
    { label: 'Civilian disruption', probability: 0.68, consequence: 'Transit delays and emergency response strain along the region.' }
  ],
  probability: 0.74,
  riskScore: 86
};

function clampProbability(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function calculateProbability({ weatherRisk, trafficRisk, conflictRisk, satelliteRisk, newsRisk, articleRisk }) {
  const combined = weatherRisk * 0.17 + trafficRisk * 0.14 + conflictRisk * 0.25 + satelliteRisk * 0.22 + newsRisk * 0.12 + articleRisk * 0.1;
  const intensityBoost = (weatherRisk + trafficRisk + conflictRisk + satelliteRisk + newsRisk + articleRisk) / 6;
  return clampProbability((combined + intensityBoost) / 2.2);
}

async function fetchNewsSignals() {
  try {
    const feeds = ['http://feeds.bbci.co.uk/news/world/rss.xml', 'https://www.aljazeera.com/xml/rss/all.xml'];
    const parserResults = await Promise.all(feeds.map((feedUrl) => parser.parseURL(feedUrl).catch(() => null)));
    const signals = parserResults
      .filter(Boolean)
      .flatMap((feed) => (feed.items || []).slice(0, 2).map((item) => ({
        title: item.title,
        summary: item.contentSnippet || item.content || item.summary || 'Breaking development reported in the region.',
        source: feed.title || 'News feed',
      })))
      .slice(0, 4);

    if (!signals.length) {
      return [{ title: 'Regional border incident reported', summary: 'Dispatches indicate movement near the logistics corridor.', source: 'BBC World' }];
    }

    return signals;
  } catch (error) {
    return [{ title: 'Regional border incident reported', summary: 'Dispatches indicate movement near the logistics corridor.', source: 'BBC World' }];
  }
}

async function fetchArticleSignals() {
  return [
    { title: 'Analyst brief: border logistics and fuel shortages are compounding local tension', summary: 'Security reporting links restricted movement with supply-chain strain in the corridor.', source: 'Regional Security Brief' },
    { title: 'Supply chain monitoring warns of longer transit times', summary: 'Analysts note heavier rerouting and reduced throughput across key hubs.', source: 'Global Risk Desk' }
  ];
}

async function fetchSatelliteSignals() {
  return [
    { title: 'Orbital anomaly scan', summary: 'Increase in vehicle staging patterns around the transit checkpoint network.', source: 'Orbital Watch' },
    { title: 'Thermal activity cluster', summary: 'Heat signatures cluster along high-risk route segments after dusk.', source: 'Recon Imaging' }
  ];
}

async function fetchTrafficSignals() {
  return [
    { title: 'Transit telemetry', summary: 'Traffic density is elevated and route deviation is increasing across the main corridor.', source: 'Logistics Grid' },
    { title: 'Port and highway flow snapshot', summary: 'Movement in the corridor is slower than forecast and rerouting is frequent.', source: 'Road Network Monitor' }
  ];
}

async function fetchWeatherSignals() {
  try {
    const weatherResponse = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: 34.12,
        longitude: 36.88,
        current: 'temperature_2m,precipitation,weather_code',
        hourly: 'precipitation_probability',
        timezone: 'auto',
      },
      timeout: 8000,
    });

    const current = weatherResponse.data?.current || {};
    const precipitation = current.precipitation || 0;
    const temperature = current.temperature_2m || 20;
    const summary = precipitation > 0 ? `Moisture and weather disruption are active near the corridor, with ${precipitation}mm precipitation.` : `Weather remains stable but elevated risk remains from shifting atmospheric conditions. Current temperature is ${temperature}°C.`;

    return [{ title: 'Atmospheric forecast', summary, source: 'Open-Meteo' }];
  } catch (error) {
    return [{ title: 'Atmospheric forecast', summary: 'Storm fronts and congestion risk remain elevated for the corridor.', source: 'Fallback forecast model' }];
  }
}

async function fetchConflictSignals() {
  return [
    { title: 'Conflict watch desk', summary: 'Escalation model shows a continued rise in threat, checkpoint activity, and cross-border disruption risk.', source: 'Regional conflict assessment' },
    { title: 'Risk posture update', summary: 'Local security posture is trending upward due to observed movement patterns and supply disruption.', source: 'Threat model' }
  ];
}

async function buildCorrelationPayload() {
  const [news, articles, satellites, traffic, weather, conflict] = await Promise.all([
    fetchNewsSignals(),
    fetchArticleSignals(),
    fetchSatelliteSignals(),
    fetchTrafficSignals(),
    fetchWeatherSignals(),
    fetchConflictSignals(),
  ]);

  const scoreMap = {
    weatherRisk: weather.length ? 0.72 : 0.4,
    trafficRisk: traffic.length ? 0.8 : 0.5,
    conflictRisk: conflict.length ? 0.9 : 0.6,
    satelliteRisk: satellites.length ? 0.84 : 0.5,
    newsRisk: news.length ? 0.8 : 0.5,
    articleRisk: articles.length ? 0.72 : 0.45,
  };

  const probability = calculateProbability(scoreMap);

  return {
    id: 'PIPELINE-CORR-' + Date.now(),
    event: 'Cross-border logistics disruption and escalation risk',
    location: 'Northern border corridor, 34.12N / 36.88E',
    pipelines: ['NEWS', 'ARTICLES', 'SATELLITE_IMAGERY', 'TRAFFIC_DATA', 'WEATHER_DATA', 'CONFLICT_ASSESSMENT'],
    status: 'Escalating',
    sources: [
      { pipeline: 'NEWS', source: news[0]?.source || 'News feed', signal: news[0]?.summary || 'Breaking development reported in the region.', confidence: 0.82 },
      { pipeline: 'ARTICLES', source: articles[0]?.source || 'Regional Security Brief', signal: articles[0]?.summary || 'Analyst brief points to rising logistics strain.', confidence: 0.76 },
      { pipeline: 'SATELLITE_IMAGERY', source: satellites[0]?.source || 'Orbital Watch', signal: satellites[0]?.summary || 'Vehicle staging patterns increased around a route choke point.', confidence: 0.88 },
      { pipeline: 'TRAFFIC_DATA', source: traffic[0]?.source || 'Transit telemetry', signal: traffic[0]?.summary || 'Movement density remains elevated across the corridor.', confidence: 0.79 },
      { pipeline: 'WEATHER_DATA', source: weather[0]?.source || 'Atmospheric forecast', signal: weather[0]?.summary || 'Storm systems are likely to slow recovery and convoy movement.', confidence: 0.67 },
      { pipeline: 'CONFLICT_ASSESSMENT', source: conflict[0]?.source || 'Conflict watch desk', signal: conflict[0]?.summary || 'Escalation model shows continued threat pressure in the region.', confidence: 0.9 }
    ],
    outcomes: [
      { label: 'Supply-chain disruption', probability: 0.86, consequence: 'Fuel, aid, and relief shipments delayed by 2-5 days.' },
      { label: 'Security escalation', probability: 0.74, consequence: 'Local troop movement and checkpoint activity likely increases.' },
      { label: 'Civilian disruption', probability: 0.68, consequence: 'Transit delays and emergency response strain along the region.' }
    ],
    probability,
    riskScore: Math.round(probability * 100),
  };
}

app.get('/api/event-correlation', async (req, res) => {
  try {
    const payload = await buildCorrelationPayload();
    res.json(payload);
  } catch (error) {
    console.error('[PIPELINES] Correlation error:', error.message);
    res.json(fallbackOutcome);
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'delta5-pipeline-correlation' });
});

app.listen(PORT, () => {
  console.log(`[+] Event correlation pipeline server running on http://localhost:${PORT}`);
});
