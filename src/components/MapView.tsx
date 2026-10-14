import React, { useEffect, useRef, useState, useCallback } from 'react';
import 'ol/ol.css';
import OLMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import GeoJSON from 'ol/format/GeoJSON';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Style, Fill, Stroke, Text } from 'ol/style';
import Overlay from 'ol/Overlay';
import { ScaleLine } from 'ol/control';
import Feature from 'ol/Feature';
import { Geometry } from 'ol/geom';
import { LayerMetadata, MCDAResults } from '../types/gis';
import { getScoreColor } from '../utils/mcda';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crosshair,
  MapPin,
  Eye,
  Info,
} from 'lucide-react';

interface MapViewProps {
  layers: LayerMetadata[];
  activeMCDA: MCDAResults | null;
  selectedFeatureId: string | number | null;
  onSelectFeature: (feature: any | null) => void;
  flyToTrigger?: { featureId?: string | number; layerId?: string; timestamp: number } | null;
}

export const MapView: React.FC<MapViewProps> = ({
  layers,
  activeMCDA,
  selectedFeatureId,
  onSelectFeature,
  flyToTrigger,
}) => {
  const mapElement = useRef<HTMLDivElement>(null);
  const tooltipElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<OLMap | null>(null);
  const vectorLayersRef = useRef<Map<string, VectorLayer<VectorSource>>>(new Map());
  const baseLayerRef = useRef<TileLayer<XYZ | OSM> | null>(null);
  const tooltipOverlayRef = useRef<Overlay | null>(null);

  const [basemap, setBasemap] = useState<'dark' | 'osm' | 'light'>('dark');
  const [coordinates, setCoordinates] = useState<{ lon: string; lat: string } | null>(null);
  const [tooltipContent, setTooltipContent] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(true);

  // Initialize Map
  useEffect(() => {
    if (!mapElement.current || mapRef.current) return;

    // West Bengal Center: 87.85 Lon, 24.0 Lat
    const initialCenter = fromLonLat([87.85, 24.0]);

    // Dark Matter basemap tile URL
    const darkSource = new XYZ({
      url: 'https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attributions: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    });

    const tileLayer = new TileLayer({
      source: darkSource,
    });
    baseLayerRef.current = tileLayer;

    // Overlay for hover tooltip
    if (tooltipElement.current) {
      tooltipOverlayRef.current = new Overlay({
        element: tooltipElement.current,
        offset: [15, 0],
        positioning: 'center-left',
        stopEvent: false,
      });
    }

    const map = new OLMap({
      target: mapElement.current,
      layers: [tileLayer],
      view: new View({
        center: initialCenter,
        zoom: 7.2,
        minZoom: 4,
        maxZoom: 18,
      }),
      controls: [
        new ScaleLine({
          units: 'metric',
          bar: true,
          steps: 4,
          text: true,
          minWidth: 100,
        }),
      ],
    });

    if (tooltipOverlayRef.current) {
      map.addOverlay(tooltipOverlayRef.current);
    }

    // Pointer move listener for coordinates & tooltip
    map.on('pointermove', (evt) => {
      if (evt.dragging) {
        if (tooltipOverlayRef.current) tooltipOverlayRef.current.setPosition(undefined);
        return;
      }

      const coords = toLonLat(evt.coordinate);
      setCoordinates({
        lon: coords[0].toFixed(4) + '° E',
        lat: coords[1].toFixed(4) + '° N',
      });

      // Feature detection under cursor
      const hit = map.forEachFeatureAtPixel(evt.pixel, (f, layer) => {
        return { feature: f as Feature<Geometry>, layer };
      });

      const targetEl = map.getTargetElement();

      if (hit && tooltipOverlayRef.current) {
        const props = hit.feature.getProperties();
        const districtName = props.district || props.name || props.NAME || 'Feature';
        const division = props.division ? `<span class="text-xs text-slate-400">Div: ${props.division}</span>` : '';

        // Check if MCDA score exists
        let mcdaBadge = '';
        if (props._mcdaScore !== undefined) {
          mcdaBadge = `
            <div class="mt-1 pt-1 border-t border-slate-700/80 flex items-center justify-between text-xs">
              <span class="text-cyan-300 font-semibold">Rank #${props._mcdaRank}</span>
              <span class="px-1.5 py-0.5 rounded text-[10px] font-bold" style="background-color: ${getScoreColor(props._mcdaScore)}33; color: ${getScoreColor(props._mcdaScore)}">
                ${props._mcdaScore}/100 (${props._mcdaGrade})
              </span>
            </div>
          `;
        }

        const html = `
          <div class="text-xs font-semibold text-white">${districtName}</div>
          ${division}
          ${mcdaBadge}
        `;
        setTooltipContent(html);
        tooltipOverlayRef.current.setPosition(evt.coordinate);
        if (targetEl) targetEl.style.cursor = 'pointer';
      } else {
        if (tooltipOverlayRef.current) tooltipOverlayRef.current.setPosition(undefined);
        if (targetEl) targetEl.style.cursor = '';
      }
    });

    // Feature Click Listener
    map.on('singleclick', (evt) => {
      const hit = map.forEachFeatureAtPixel(evt.pixel, (f) => f as Feature<Geometry>);
      if (hit) {
        const props = hit.getProperties();
        const featId = hit.getId() || props.id || props.district || props.name;
        onSelectFeature({
          id: featId,
          properties: props,
          geometry: hit.getGeometry()?.getType(),
        });
      } else {
        onSelectFeature(null);
      }
    });

    mapRef.current = map;

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, []);

  // Update Basemap Source
  useEffect(() => {
    if (!baseLayerRef.current) return;

    if (basemap === 'dark') {
      baseLayerRef.current.setSource(
        new XYZ({
          url: 'https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
          attributions: '&copy; OpenStreetMap &copy; CARTO',
          maxZoom: 19,
        })
      );
    } else if (basemap === 'light') {
      baseLayerRef.current.setSource(
        new XYZ({
          url: 'https://{a-c}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
          attributions: '&copy; OpenStreetMap &copy; CARTO',
          maxZoom: 19,
        })
      );
    } else {
      baseLayerRef.current.setSource(
        new OSM({
          attributions: '&copy; OpenStreetMap contributors',
        })
      );
    }
  }, [basemap]);

  // Sync Vector Layers with props
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentLayerIds = new Set(layers.map((l) => l.id));

    // Remove obsolete layers
    vectorLayersRef.current.forEach((layer: VectorLayer<VectorSource>, id: string) => {
      if (!currentLayerIds.has(id)) {
        map.removeLayer(layer);
        vectorLayersRef.current.delete(id);
      }
    });

    // Add or update layers
    layers.forEach((layerMeta) => {
      let vLayer = vectorLayersRef.current.get(layerMeta.id);

      if (!vLayer) {
        // Create new vector layer
        const format = new GeoJSON();
        const features = format.readFeatures(layerMeta.data, {
          featureProjection: 'EPSG:3857',
        });

        const vSource = new VectorSource({
          features,
        });

        vLayer = new VectorLayer({
          source: vSource,
          visible: layerMeta.visible,
          opacity: layerMeta.opacity,
        });

        // Attach custom ID for lookup
        vLayer.set('layerId', layerMeta.id);
        map.addLayer(vLayer);
        vectorLayersRef.current.set(layerMeta.id, vLayer);
      } else {
        vLayer.setVisible(layerMeta.visible);
        vLayer.setOpacity(layerMeta.opacity);
      }

      // Compute style function (handles MCDA coloring & selection)
      const isMCDAActiveForThisLayer = activeMCDA && activeMCDA.targetLayerId === layerMeta.id;
      const scoreMap = new globalThis.Map<string, { score: number; rank: number; grade: string }>();

      if (isMCDAActiveForThisLayer && activeMCDA) {
        activeMCDA.items.forEach((item) => {
          scoreMap.set(String(item.featureId), {
            score: item.finalScore,
            rank: item.rank,
            grade: item.grade,
          });
          scoreMap.set(String(item.featureName), {
            score: item.finalScore,
            rank: item.rank,
            grade: item.grade,
          });
        });
      }

      // Update feature properties with MCDA scores for tooltips
      const source = vLayer.getSource();
      if (source) {
        source.getFeatures().forEach((feat: Feature<Geometry>) => {
          const fid = String(feat.getId() || feat.get('district') || feat.get('name') || '');
          const mcdaInfo = scoreMap.get(fid) || scoreMap.get(feat.get('district'));
          if (mcdaInfo) {
            feat.set('_mcdaScore', mcdaInfo.score);
            feat.set('_mcdaRank', mcdaInfo.rank);
            feat.set('_mcdaGrade', mcdaInfo.grade);
          } else {
            feat.unset('_mcdaScore');
            feat.unset('_mcdaRank');
            feat.unset('_mcdaGrade');
          }
        });
      }

      vLayer.setStyle((feature: any) => {
        const fid = String(feature.getId() || feature.get('district') || feature.get('name') || '');
        const isSelected = selectedFeatureId !== null && String(selectedFeatureId) === fid;
        const mcdaScore = feature.get('_mcdaScore');

        let fillColor = layerMeta.color || '#0284c7';
        let fillAlpha = layerMeta.fillOpacity ?? 0.45;
        let strokeColor = '#38bdf8';
        let strokeWidth = 1.5;

        if (mcdaScore !== undefined) {
          fillColor = getScoreColor(mcdaScore);
          fillAlpha = 0.65;
          strokeColor = '#ffffff';
          strokeWidth = 1.5;
        }

        if (isSelected) {
          strokeColor = '#22d3ee'; // vibrant cyan glow
          strokeWidth = 3.5;
          fillAlpha = Math.min(0.9, fillAlpha + 0.25);
        }

        const hexToRgba = (hex: string, alpha: number) => {
          const cleanHex = hex.replace('#', '');
          const r = parseInt(cleanHex.substring(0, 2), 16) || 2;
          const g = parseInt(cleanHex.substring(2, 4), 16) || 132;
          const b = parseInt(cleanHex.substring(4, 6), 16) || 199;
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        const label = feature.get('district') || feature.get('name');

        return new Style({
          fill: new Fill({
            color: hexToRgba(fillColor, fillAlpha),
          }),
          stroke: new Stroke({
            color: strokeColor,
            width: strokeWidth,
          }),
          text: new Text({
            text: label ? String(label) : '',
            font: 'bold 11px system-ui, sans-serif',
            fill: new Fill({ color: '#ffffff' }),
            stroke: new Stroke({ color: '#090d16', width: 3 }),
            overflow: true,
          }),
        });
      });
    });
  }, [layers, activeMCDA, selectedFeatureId]);

  // Handle FlyTo trigger (e.g. from attribute table, search, or zoom to layer)
  useEffect(() => {
    if (!flyToTrigger || !mapRef.current) return;

    const map = mapRef.current;
    if (flyToTrigger.featureId !== undefined) {
      // Find feature in vector layers
      let targetFeature: Feature<Geometry> | null = null;
      for (const vLayer of vectorLayersRef.current.values()) {
        const source = vLayer.getSource();
        if (!source) continue;
        const found = source.getFeatures().find((f: Feature<Geometry>) => {
          const fid = f.getId() || f.get('district') || f.get('name');
          return String(fid) === String(flyToTrigger.featureId);
        });
        if (found) {
          targetFeature = found;
          break;
        }
      }

      if (targetFeature) {
        const geom = targetFeature.getGeometry();
        if (geom) {
          map.getView().fit(geom.getExtent(), {
            padding: [60, 60, 60, 60],
            duration: 900,
            maxZoom: 11,
          });
        }
      }
    } else if (flyToTrigger.layerId) {
      const vLayer = vectorLayersRef.current.get(flyToTrigger.layerId);
      if (vLayer) {
        const extent = vLayer.getSource()?.getExtent();
        if (extent && isFinite(extent[0])) {
          map.getView().fit(extent, {
            padding: [50, 50, 50, 50],
            duration: 800,
          });
        }
      }
    }
  }, [flyToTrigger]);

  const handleZoomIn = () => {
    const view = mapRef.current?.getView();
    if (view) view.animate({ zoom: (view.getZoom() || 7) + 1, duration: 250 });
  };

  const handleZoomOut = () => {
    const view = mapRef.current?.getView();
    if (view) view.animate({ zoom: (view.getZoom() || 7) - 1, duration: 250 });
  };

  const handleResetBengalView = () => {
    const view = mapRef.current?.getView();
    if (view) {
      view.animate({
        center: fromLonLat([87.85, 24.0]),
        zoom: 7.2,
        duration: 800,
      });
    }
  };

  return (
    <div className="relative w-full h-full bg-[#070b14] overflow-hidden select-none">
      {/* Map Container */}
      <div ref={mapElement} className="w-full h-full" />

      {/* Hover Tooltip Overlay (handled by OpenLayers Overlay) */}
      <div
        ref={tooltipElement}
        className="pointer-events-none absolute z-50 px-3 py-2 bg-slate-950/90 text-white rounded-lg shadow-2xl border border-cyan-500/40 backdrop-blur-md transition-all duration-75 text-xs max-w-xs"
        dangerouslySetInnerHTML={{ __html: tooltipContent || '' }}
      />

      {/* Map Controls (Top Right) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        {/* Basemap Switcher */}
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-1 shadow-xl backdrop-blur-md flex gap-1">
          <button
            onClick={() => setBasemap('dark')}
            title="Dark Matter (Default)"
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
              basemap === 'dark'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Dark
          </button>
          <button
            onClick={() => setBasemap('osm')}
            title="OpenStreetMap Standard"
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
              basemap === 'osm'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            OSM
          </button>
          <button
            onClick={() => setBasemap('light')}
            title="CartoDB Positron Light"
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
              basemap === 'light'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Light
          </button>
        </div>

        {/* Zoom & View Controls */}
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl shadow-xl backdrop-blur-md overflow-hidden flex flex-col">
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-2.5 text-slate-300 hover:text-white hover:bg-slate-800/80 border-b border-slate-800 transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-2.5 text-slate-300 hover:text-white hover:bg-slate-800/80 border-b border-slate-800 transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetBengalView}
            title="Reset to West Bengal"
            className="p-2.5 text-cyan-400 hover:text-cyan-200 hover:bg-slate-800/80 transition-colors"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Map Legend Overlay (Bottom Right) */}
      <div className="absolute bottom-6 right-4 z-20">
        {showLegend ? (
          <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-3.5 shadow-2xl backdrop-blur-md max-w-xs text-xs">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                {activeMCDA ? 'MCDA Suitability Tiers' : 'Map Legend'}
              </span>
              <button
                onClick={() => setShowLegend(false)}
                className="text-slate-400 hover:text-slate-200 p-0.5 rounded"
                title="Hide Legend"
              >
                ✕
              </button>
            </div>

            {activeMCDA ? (
              <div className="space-y-1.5">
                <div className="text-[11px] text-cyan-400 font-medium truncate mb-1">
                  {activeMCDA.name}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded bg-emerald-500 shadow-sm" />
                    <span className="text-slate-300">Very High (80–100)</span>
                  </div>
                  <span className="text-slate-400 text-[10px]">
                    {activeMCDA.gradeCounts['Very High']}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded bg-cyan-500 shadow-sm" />
                    <span className="text-slate-300">High (60–79.9)</span>
                  </div>
                  <span className="text-slate-400 text-[10px]">
                    {activeMCDA.gradeCounts['High']}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded bg-amber-500 shadow-sm" />
                    <span className="text-slate-300">Moderate (40–59.9)</span>
                  </div>
                  <span className="text-slate-400 text-[10px]">
                    {activeMCDA.gradeCounts['Moderate']}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded bg-orange-500 shadow-sm" />
                    <span className="text-slate-300">Low (20–39.9)</span>
                  </div>
                  <span className="text-slate-400 text-[10px]">
                    {activeMCDA.gradeCounts['Low']}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded bg-red-500 shadow-sm" />
                    <span className="text-slate-300">Very Low (&lt;20)</span>
                  </div>
                  <span className="text-slate-400 text-[10px]">
                    {activeMCDA.gradeCounts['Very Low']}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {layers.length === 0 ? (
                  <p className="text-slate-500 italic text-[11px]">No active vector layers.</p>
                ) : (
                  layers.map((l) => (
                    <div key={l.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-3 h-3 rounded flex-shrink-0"
                          style={{ backgroundColor: l.color }}
                        />
                        <span className="text-slate-300 truncate">{l.name}</span>
                      </div>
                      <span className="text-slate-500 text-[10px]">{l.featureCount}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowLegend(true)}
            className="bg-slate-900/90 border border-slate-700/80 p-2 text-slate-300 hover:text-white rounded-xl shadow-xl backdrop-blur-md"
            title="Show Legend"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
          </button>
        )}
      </div>

      {/* Coordinates & Region Bar (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
        <div className="bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-300 px-3 py-1.5 rounded-lg shadow-lg backdrop-blur-md flex items-center gap-2">
          <MapPin className="w-3 h-3 text-cyan-400" />
          <span>{coordinates ? `${coordinates.lat}, ${coordinates.lon}` : 'West Bengal, India'}</span>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 text-[10px] text-slate-400 px-2.5 py-1.5 rounded-lg shadow-lg backdrop-blur-md hidden sm:block">
          EPSG:3857 (Web Mercator)
        </div>
      </div>
    </div>
  );
};
