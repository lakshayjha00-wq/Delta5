export const PIPELINE_CONFIG = [
  { name: 'NEWS', weight: 0.18, description: 'Breaking media reports and field updates' },
  { name: 'ARTICLES', weight: 0.16, description: 'Long-form analysis and contextual reporting' },
  { name: 'SATELLITE_IMAGERY', weight: 0.22, description: 'Orbital imagery and movement pattern detection' },
  { name: 'TRAFFIC_DATA', weight: 0.17, description: 'Road, port, and logistics traffic anomalies' },
  { name: 'WEATHER_DATA', weight: 0.14, description: 'Storm, fog, and atmospheric disruption indicators' },
  { name: 'CONFLICT_ASSESSMENT', weight: 0.13, description: 'Ongoing conflict and escalation modeling' },
];

export function clampProbability(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

export function calculateConsequenceProbability({
  weatherRisk,
  trafficRisk,
  conflictRisk,
  satelliteRisk,
  newsRisk,
  articleRisk,
}) {
  const combined =
    weatherRisk * 0.17 +
    trafficRisk * 0.14 +
    conflictRisk * 0.25 +
    satelliteRisk * 0.22 +
    newsRisk * 0.12 +
    articleRisk * 0.1;

  const intensityBoost =
    (weatherRisk + trafficRisk + conflictRisk + satelliteRisk + newsRisk + articleRisk) / 6;

  const probability = clampProbability((combined + intensityBoost) / 2.2);
  return Number(probability.toFixed(2));
}

export function buildEventCorrelationSet() {
  const probability = calculateConsequenceProbability({
    weatherRisk: 0.7,
    trafficRisk: 0.78,
    conflictRisk: 0.91,
    satelliteRisk: 0.83,
    newsRisk: 0.8,
    articleRisk: 0.72,
  });

  const scenario = {
    id: 'CORR-2026-09-22-01',
    event: 'Cross-border logistics disruption and escalation risk',
    location: 'Northern border corridor, 34.12N / 36.88E',
    pipelines: PIPELINE_CONFIG.map((pipe) => pipe.name),
    status: 'Escalating',
    sources: [
      {
        pipeline: 'NEWS',
        source: 'BBC World',
        signal: 'Military convoy movement and road closures reported near the corridor.',
        confidence: 0.82,
      },
      {
        pipeline: 'ARTICLES',
        source: 'Regional Security Brief',
        signal: 'Analyst note links the disruption to fuel shortages and border tension.',
        confidence: 0.76,
      },
      {
        pipeline: 'SATELLITE_IMAGERY',
        source: 'Orbital anomaly scan',
        signal: 'Cold-chain truck staging patterns increased near the main transit hub.',
        confidence: 0.88,
      },
      {
        pipeline: 'TRAFFIC_DATA',
        source: 'Transit telemetry',
        signal: 'Heavy route rerouting and vehicle density in the logistics corridor.',
        confidence: 0.79,
      },
      {
        pipeline: 'WEATHER_DATA',
        source: 'Atmospheric forecast',
        signal: 'Thunderstorm fronts are expected to slow emergency convoy movement.',
        confidence: 0.67,
      },
      {
        pipeline: 'CONFLICT_ASSESSMENT',
        source: 'Conflict watch desk',
        signal: 'Escalation model shows a sharp rise in local threat and disruption risk.',
        confidence: 0.9,
      },
    ],
    outcomes: [
      {
        label: 'Supply-chain disruption',
        probability: 0.86,
        consequence: 'Fuel, aid, and relief shipments delayed by 2-5 days.',
      },
      {
        label: 'Security escalation',
        probability: 0.74,
        consequence: 'Local troop movement and checkpoint activity likely increases.',
      },
      {
        label: 'Civilian disruption',
        probability: 0.68,
        consequence: 'Transit delays and emergency response strain along the region.',
      },
    ],
    probability,
    riskScore: 86,
  };

  return [scenario];
}

export default {
  PIPELINE_CONFIG,
  clampProbability,
  calculateConsequenceProbability,
  buildEventCorrelationSet,
};
