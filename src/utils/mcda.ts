import { GeoJsonFeatureCollection, MCDACriterion, MCDAResults, MCDAResultItem, SuitabilityGrade } from '../types/gis';

export interface MCDAValidationError {
  field?: string;
  message: string;
}

export function validateMCDARequest(
  geojson: GeoJsonFeatureCollection,
  criteria: MCDACriterion[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!geojson || !geojson.features || geojson.features.length === 0) {
    errors.push('The dataset contains no features to evaluate.');
    return { valid: false, errors };
  }

  if (!criteria || criteria.length === 0) {
    errors.push('At least one criterion must be selected for MCDA evaluation.');
    return { valid: false, errors };
  }

  const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
  if (totalWeight <= 0) {
    errors.push('Total criteria weight must be greater than zero.');
  }

  // Check that all criteria properties exist in at least one feature
  for (const crit of criteria) {
    if (!crit.propertyName) {
      errors.push('A criterion is missing its target attribute property name.');
      continue;
    }
    const hasProp = geojson.features.some(
      (f) => f.properties && typeof f.properties[crit.propertyName] === 'number'
    );
    if (!hasProp) {
      errors.push(`Attribute "${crit.label || crit.propertyName}" contains no valid numeric values in this dataset.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function calculateMCDA(
  layerId: string,
  analysisName: string,
  geojson: GeoJsonFeatureCollection,
  criteria: MCDACriterion[]
): MCDAResults {
  const validation = validateMCDARequest(geojson, criteria);
  if (!validation.valid) {
    throw new Error(validation.errors.join(' '));
  }

  const features = geojson.features;
  const totalWeight = criteria.reduce((sum, c) => sum + Math.max(0, Number(c.weight) || 0), 0);
  const normalizedWeights = criteria.map((c) => ({
    ...c,
    normWeight: totalWeight > 0 ? (Number(c.weight) || 0) / totalWeight : 1 / criteria.length,
  }));

  // Step 1: Calculate min, max, and mean for each criterion across all features
  const statsMap: Record<string, { min: number; max: number; mean: number; count: number }> = {};

  criteria.forEach((crit) => {
    const values: number[] = [];
    features.forEach((f) => {
      const val = f.properties?.[crit.propertyName];
      if (typeof val === 'number' && !isNaN(val)) {
        values.push(val);
      }
    });

    if (values.length === 0) {
      statsMap[crit.propertyName] = { min: 0, max: 1, mean: 0.5, count: 0 };
    } else {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const sum = values.reduce((a, b) => a + b, 0);
      statsMap[crit.propertyName] = {
        min,
        max,
        mean: sum / values.length,
        count: values.length,
      };
    }
  });

  // Step 2: Compute normalized score for each feature and criterion, then weighted sum
  const resultItems: MCDAResultItem[] = features.map((feature, idx) => {
    const rawValues: Record<string, number> = {};
    const normalizedScores: Record<string, number> = {};
    let finalScore = 0;

    normalizedWeights.forEach((crit) => {
      const prop = crit.propertyName;
      const stat = statsMap[prop];
      let val = feature.properties?.[prop];

      // Missing value handling: impute with mean if undefined
      if (typeof val !== 'number' || isNaN(val)) {
        val = stat.mean;
      }
      rawValues[prop] = val;

      let normScore = 50; // default midpoint
      if (stat.max === stat.min) {
        normScore = 100; // All features have equal value
      } else if (crit.direction === 'benefit') {
        // Benefit: Higher is better
        normScore = ((val - stat.min) / (stat.max - stat.min)) * 100;
      } else {
        // Cost: Lower is better
        normScore = ((stat.max - val) / (stat.max - stat.min)) * 100;
      }

      // Clamp between 0 and 100
      normScore = Math.max(0, Math.min(100, normScore));
      normalizedScores[prop] = Math.round(normScore * 10) / 10;

      finalScore += crit.normWeight * normScore;
    });

    const roundedFinalScore = Math.round(finalScore * 10) / 10;
    const featureName =
      feature.properties?.district ||
      feature.properties?.name ||
      feature.properties?.NAME ||
      feature.properties?.title ||
      `Feature #${idx + 1}`;

    const featureId = feature.id || feature.properties?.id || `f-${idx}`;

    return {
      featureId,
      featureName,
      rawValues,
      normalizedScores,
      finalScore: roundedFinalScore,
      rank: 0, // Assigned below
      grade: getSuitabilityGrade(roundedFinalScore),
    };
  });

  // Step 3: Sort descending by finalScore to determine ranks
  resultItems.sort((a, b) => b.finalScore - a.finalScore);
  resultItems.forEach((item, index) => {
    item.rank = index + 1;
  });

  // Step 4: Summary statistics
  const scores = resultItems.map((r) => r.finalScore);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const mean = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;

  // Median
  const sorted = [...scores].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 !== 0
      ? sorted[mid]
      : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;

  // Std Dev
  const variance =
    scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  const stdDev = Math.round(Math.sqrt(variance) * 10) / 10;

  // Grade Counts
  const gradeCounts: Record<SuitabilityGrade, number> = {
    'Very High': 0,
    High: 0,
    Moderate: 0,
    Low: 0,
    'Very Low': 0,
  };
  resultItems.forEach((item) => {
    gradeCounts[item.grade] = (gradeCounts[item.grade] || 0) + 1;
  });

  return {
    id: `mcda-${Date.now()}`,
    name: analysisName || 'Suitability Assessment',
    targetLayerId: layerId,
    timestamp: new Date().toISOString(),
    criteria,
    items: resultItems,
    stats: {
      min,
      max,
      mean,
      median,
      stdDev,
    },
    gradeCounts,
    methodology: {
      normalization:
        'Linear Min-Max Normalization: transforms each criterion to a standardized scale [0, 100]. Benefit criteria use (x - min)/(max - min)*100, while cost criteria use (max - x)/(max - min)*100.',
      weighting:
        'Normalized Weighted Linear Combination (WLC): User-assigned weights are normalized to sum to 1.0 (100%).',
      aggregation:
        'Composite Additive Weighting: Final Suitability S_i = sum(w_j * r_ij). Ranks are ordered descending from highest composite score.',
      formula: 'S_i = \\sum_{j=1}^{m} w_j \\times r_{ij} \\quad \\text{where } \\sum w_j = 1, \\; r_{ij} \\in [0, 100]',
    },
  };
}

export function getSuitabilityGrade(score: number): SuitabilityGrade {
  if (score >= 80) return 'Very High';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Moderate';
  if (score >= 20) return 'Low';
  return 'Very Low';
}

export function getGradeColor(grade: SuitabilityGrade): string {
  switch (grade) {
    case 'Very High':
      return '#10b981'; // Emerald
    case 'High':
      return '#06b6d4'; // Cyan
    case 'Moderate':
      return '#f59e0b'; // Amber
    case 'Low':
      return '#f97316'; // Orange
    case 'Very Low':
      return '#ef4444'; // Red
  }
}

export function getScoreColor(score: number): string {
  return getGradeColor(getSuitabilityGrade(score));
}
