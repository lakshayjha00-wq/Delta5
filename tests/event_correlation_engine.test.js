const test = require('node:test');
const assert = require('node:assert/strict');

const { buildEventCorrelationSet, calculateConsequenceProbability } = require('../event_correlation_engine');

test('buildEventCorrelationSet combines all required pipelines and calculates a risk score', () => {
  const events = buildEventCorrelationSet();

  assert.ok(Array.isArray(events), 'correlation set should be an array');
  assert.ok(events.length > 0, 'at least one event should be produced');

  const first = events[0];
  assert.ok(first.sources && first.sources.length >= 2, 'event should aggregate multiple sources');
  assert.ok(Array.isArray(first.outcomes), 'outcomes should be provided');
  assert.ok(typeof first.probability === 'number', 'probability should be numeric');
  assert.ok(typeof first.riskScore === 'number', 'riskScore should be numeric');
  assert.ok(first.pipelines && first.pipelines.includes('NEWS'), 'news pipeline should be represented');
});

test('calculateConsequenceProbability produces a bounded probability score', () => {
  const value = calculateConsequenceProbability({
    weatherRisk: 0.8,
    trafficRisk: 0.7,
    conflictRisk: 0.9,
    satelliteRisk: 0.6,
    newsRisk: 0.8,
    articleRisk: 0.7,
  });

  assert.ok(value >= 0 && value <= 1, 'probability should be in range 0 to 1');
  assert.ok(value > 0.5, 'combined risk should reflect elevated probability');
});
