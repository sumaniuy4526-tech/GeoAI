import { GeoJsonFeatureCollection, GeoJsonFeature } from '../types/gis';

export interface GeoJsonValidationResult {
  valid: boolean;
  error?: string;
  featureCount: number;
  geometryTypes: string[];
  numericProperties: string[];
  allProperties: string[];
  bbox?: [number, number, number, number];
  previewData?: GeoJsonFeatureCollection;
}

export function validateGeoJSON(input: unknown): GeoJsonValidationResult {
  if (!input) {
    return {
      valid: false,
      error: 'Empty GeoJSON payload received.',
      featureCount: 0,
      geometryTypes: [],
      numericProperties: [],
      allProperties: [],
    };
  }

  let geojson: any = input;
  if (typeof input === 'string') {
    try {
      geojson = JSON.parse(input);
    } catch (e: any) {
      return {
        valid: false,
        error: `Invalid JSON syntax: ${e.message}`,
        featureCount: 0,
        geometryTypes: [],
        numericProperties: [],
        allProperties: [],
      };
    }
  }

  // Handle bare Feature or Geometry
  if (geojson.type === 'Feature') {
    geojson = {
      type: 'FeatureCollection',
      features: [geojson],
    };
  } else if (
    geojson.type === 'Polygon' ||
    geojson.type === 'MultiPolygon' ||
    geojson.type === 'Point' ||
    geojson.type === 'LineString'
  ) {
    geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: geojson,
        },
      ],
    };
  }

  if (geojson.type !== 'FeatureCollection') {
    return {
      valid: false,
      error: 'Root object must be a GeoJSON "FeatureCollection" or "Feature".',
      featureCount: 0,
      geometryTypes: [],
      numericProperties: [],
      allProperties: [],
    };
  }

  if (!Array.isArray(geojson.features)) {
    return {
      valid: false,
      error: 'GeoJSON FeatureCollection must contain a "features" array.',
      featureCount: 0,
      geometryTypes: [],
      numericProperties: [],
      allProperties: [],
    };
  }

  if (geojson.features.length === 0) {
    return {
      valid: false,
      error: 'FeatureCollection has 0 features.',
      featureCount: 0,
      geometryTypes: [],
      numericProperties: [],
      allProperties: [],
    };
  }

  const geomTypesSet = new Set<string>();
  const allPropsSet = new Set<string>();
  const numPropsSet = new Set<string>();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < geojson.features.length; i++) {
    const f = geojson.features[i];
    if (!f || f.type !== 'Feature') {
      return {
        valid: false,
        error: `Feature at index ${i} is missing or has invalid "type" (must be "Feature").`,
        featureCount: geojson.features.length,
        geometryTypes: [],
        numericProperties: [],
        allProperties: [],
      };
    }

    if (!f.geometry || !f.geometry.type || !f.geometry.coordinates) {
      return {
        valid: false,
        error: `Feature at index ${i} is missing a valid geometry object.`,
        featureCount: geojson.features.length,
        geometryTypes: [],
        numericProperties: [],
        allProperties: [],
      };
    }

    geomTypesSet.add(f.geometry.type);

    // Extract property types
    if (f.properties && typeof f.properties === 'object') {
      Object.entries(f.properties).forEach(([key, val]) => {
        allPropsSet.add(key);
        if (typeof val === 'number' && !isNaN(val)) {
          numPropsSet.add(key);
        }
      });
    }

    // Expand bounding box
    extractCoords(f.geometry.coordinates, (coord: [number, number]) => {
      const [x, y] = coord;
      if (typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y)) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    });
  }

  const bbox: [number, number, number, number] | undefined =
    minX !== Infinity && minY !== Infinity && maxX !== -Infinity && maxY !== -Infinity
      ? [minX, minY, maxX, maxY]
      : undefined;

  return {
    valid: true,
    featureCount: geojson.features.length,
    geometryTypes: Array.from(geomTypesSet),
    numericProperties: Array.from(numPropsSet),
    allProperties: Array.from(allPropsSet),
    bbox,
    previewData: geojson as GeoJsonFeatureCollection,
  };
}

function extractCoords(coords: any, callback: (coord: [number, number]) => void) {
  if (!Array.isArray(coords)) return;
  if (coords.length >= 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    callback([coords[0], coords[1]]);
  } else {
    for (const c of coords) {
      extractCoords(c, callback);
    }
  }
}

export function formatNumber(val: number | undefined | null, decimals = 1): string {
  if (val === undefined || val === null || isNaN(val)) return 'N/A';
  return val.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}
