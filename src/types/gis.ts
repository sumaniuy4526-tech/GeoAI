export type GeometryType = 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon';

export interface GeoJsonGeometry {
  type: GeometryType;
  coordinates: any;
}

export interface GeoJsonFeature {
  type: 'Feature';
  id?: string | number;
  properties: Record<string, any>;
  geometry: GeoJsonGeometry;
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
  bbox?: number[];
}

export interface LayerMetadata {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  color: string;
  fillOpacity: number;
  featureCount: number;
  geometryType: string;
  propertiesList: { name: string; type: 'number' | 'string' | 'boolean'; min?: number; max?: number }[];
  sourceType: 'upload' | 'sample';
  data: GeoJsonFeatureCollection;
  isMCDAActive?: boolean;
}

export type CriterionDirection = 'benefit' | 'cost';

export interface MCDACriterion {
  id: string;
  propertyName: string;
  label: string;
  direction: CriterionDirection;
  weight: number; // 0 - 100
  minVal?: number;
  maxVal?: number;
  unit?: string;
}

export type SuitabilityGrade = 'Very High' | 'High' | 'Moderate' | 'Low' | 'Very Low';

export interface MCDAResultItem {
  featureId: string | number;
  featureName: string;
  rawValues: Record<string, number>;
  normalizedScores: Record<string, number>; // 0 - 100
  finalScore: number; // 0 - 100
  rank: number;
  grade: SuitabilityGrade;
}

export interface MCDAResults {
  id: string;
  name: string;
  targetLayerId: string;
  timestamp: string;
  criteria: MCDACriterion[];
  items: MCDAResultItem[];
  stats: {
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
  };
  gradeCounts: Record<SuitabilityGrade, number>;
  methodology: {
    normalization: string;
    weighting: string;
    aggregation: string;
    formula: string;
  };
}

export interface MCDAPreset {
  id: string;
  name: string;
  description: string;
  criteria: {
    propertyName: string;
    label: string;
    direction: CriterionDirection;
    weight: number;
    unit?: string;
  }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    isSyntheticDisclaimer?: boolean;
    suggestedQuestions?: string[];
    topDistricts?: { name: string; score: number }[];
  };
}
