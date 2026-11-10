import assert from 'node:assert/strict';
import test from 'node:test';
import { descriptorDistance, distanceToPercentile, verdictFor, type Calibration } from '../src/lib/matcher';

const calibration: Calibration = {
  pairs: 3,
  min: 0.2,
  max: 1,
  p01: 0.3,
  p05: 0.5,
  p50: 0.8,
  p95: 0.9,
  sameFaceThreshold: 0.4,
  quantiles: Array.from({ length: 101 }, (_, i) => 0.2 + i * 0.008),
};

test('distance uses Euclidean geometry', () => {
  assert.equal(descriptorDistance(new Float32Array([0, 0]), new Float32Array([3, 4])), 5);
});

test('identical descriptors have zero distance', () => {
  const face = new Float32Array([0.25, -0.5, 0.75]);
  assert.equal(descriptorDistance(face, face), 0);
});

test('distances below and above calibration bounds are clamped', () => {
  assert.equal(distanceToPercentile(0.1, calibration), 100);
  assert.equal(distanceToPercentile(1.1, calibration), 0);
});

test('calibration endpoints map to 100 and zero', () => {
  assert.equal(distanceToPercentile(0.2, calibration), 100);
  assert.equal(distanceToPercentile(1, calibration), 0);
});

test('percentile interpolates between measured quantiles', () => {
  assert.ok(Math.abs(distanceToPercentile(0.4, calibration) - 75) < 0.001);
  assert.ok(Math.abs(distanceToPercentile(0.8, calibration) - 25) < 0.001);
});

test('verdict uses strict resemblance thresholds', () => {
  assert.equal(verdictFor(0.39, calibration), 'Strong resemblance');
  assert.equal(verdictFor(0.4, calibration), 'Notable resemblance');
  assert.equal(verdictFor(0.5, calibration), 'Some shared features');
  assert.equal(verdictFor(0.8, calibration), 'Little in common');
});
