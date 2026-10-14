import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateMCDA, validateMCDARequest, getSuitabilityGrade } from '../src/utils/mcda';
import { validateGeoJSON } from '../src/utils/geojson';
import { WEST_BENGAL_DISTRICTS_GEOJSON } from '../src/data/westBengalSampleData';
import { MCDACriterion } from '../src/types/gis';

describe('GeoJSON Validation Tests', () => {
  it('should successfully validate authentic West Bengal GeoJSON', () => {
    const res = validateGeoJSON(WEST_BENGAL_DISTRICTS_GEOJSON);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.featureCount, 23);
    assert.ok(res.numericProperties.includes('soil_fertility_index'));
    assert.ok(res.numericProperties.includes('annual_rainfall_mm'));
    assert.ok(res.bbox !== undefined);
  });

  it('should reject invalid GeoJSON format', () => {
    const res = validateGeoJSON({ invalid: 'object' });
    assert.strictEqual(res.valid, false);
    assert.ok(res.error?.includes('FeatureCollection'));
  });

  it('should reject empty features array', () => {
    const res = validateGeoJSON({ type: 'FeatureCollection', features: [] });
    assert.strictEqual(res.valid, false);
    assert.ok(res.error?.includes('0 features'));
  });
});

describe('MCDA Suitability Engine Tests', () => {
  const criteria: MCDACriterion[] = [
    {
      id: 'c1',
      propertyName: 'soil_fertility_index',
      label: 'Soil Fertility',
      direction: 'benefit',
      weight: 60,
    },
    {
      id: 'c2',
      propertyName: 'flood_risk_score',
      label: 'Flood Risk',
      direction: 'cost',
      weight: 40,
    },
  ];

  it('should validate valid MCDA criteria', () => {
    const val = validateMCDARequest(WEST_BENGAL_DISTRICTS_GEOJSON, criteria);
    assert.strictEqual(val.valid, true);
    assert.strictEqual(val.errors.length, 0);
  });

  it('should reject zero total weight', () => {
    const zeroCriteria = criteria.map((c) => ({ ...c, weight: 0 }));
    const val = validateMCDARequest(WEST_BENGAL_DISTRICTS_GEOJSON, zeroCriteria);
    assert.strictEqual(val.valid, false);
    assert.ok(val.errors.some((e) => e.includes('greater than zero')));
  });

  it('should correctly calculate MCDA scores and rank districts', () => {
    const results = calculateMCDA('test-layer', 'Test Analysis', WEST_BENGAL_DISTRICTS_GEOJSON, criteria);
    assert.strictEqual(results.items.length, 23);
    assert.strictEqual(results.items[0].rank, 1);
    assert.ok(results.items[0].finalScore >= results.items[1].finalScore);
    assert.ok(results.stats.mean > 0 && results.stats.mean <= 100);
    assert.ok(results.stats.min <= results.stats.max);
  });

  it('should map score tiers correctly', () => {
    assert.strictEqual(getSuitabilityGrade(95), 'Very High');
    assert.strictEqual(getSuitabilityGrade(65), 'High');
    assert.strictEqual(getSuitabilityGrade(45), 'Moderate');
    assert.strictEqual(getSuitabilityGrade(25), 'Low');
    assert.strictEqual(getSuitabilityGrade(10), 'Very Low');
  });
});
