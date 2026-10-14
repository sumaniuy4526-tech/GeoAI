import React, { useState, useRef } from 'react';
import { Upload, X, AlertCircle, CheckCircle2, FileCode, Sparkles } from 'lucide-react';
import { validateGeoJSON, GeoJsonValidationResult } from '../utils/geojson';
import { GeoJsonFeatureCollection, LayerMetadata } from '../types/gis';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLayer: (newLayer: LayerMetadata) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onAddLayer }) => {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [layerName, setLayerName] = useState<string>('');
  const [layerColor, setLayerColor] = useState<string>('#06b6d4');
  const [validation, setValidation] = useState<GeoJsonValidationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rawParsedGeoJSON, setRawParsedGeoJSON] = useState<GeoJsonFeatureCollection | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setLayerName(file.name.replace(/\.[^/.]+$/, ''));
    setIsProcessing(true);
    setValidation(null);

    try {
      const text = await file.text();
      // Try server validation endpoint first
      let valResult: GeoJsonValidationResult;
      try {
        const resp = await fetch('/api/geojson/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ geojson: JSON.parse(text) }),
        });
        const data = await resp.json();
        if (data.success) {
          valResult = {
            valid: true,
            featureCount: data.featureCount,
            geometryTypes: data.geometryTypes,
            numericProperties: data.numericProperties,
            allProperties: data.allProperties,
            bbox: data.bbox,
            previewData: data.previewData,
          };
        } else {
          valResult = {
            valid: false,
            error: data.error,
            featureCount: 0,
            geometryTypes: [],
            numericProperties: [],
            allProperties: [],
          };
        }
      } catch (err) {
        // Fallback to client-side validator
        valResult = validateGeoJSON(text);
      }

      setValidation(valResult);
      if (valResult.valid && valResult.previewData) {
        setRawParsedGeoJSON(valResult.previewData);
      }
    } catch (e: any) {
      setValidation({
        valid: false,
        error: `Could not read file: ${e.message}`,
        featureCount: 0,
        geometryTypes: [],
        numericProperties: [],
        allProperties: [],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleConfirm = () => {
    if (!validation?.valid || !rawParsedGeoJSON) return;

    const propertiesList = validation.allProperties.map((p) => ({
      name: p,
      type: (validation.numericProperties.includes(p) ? 'number' : 'string') as 'number' | 'string',
    }));

    const newLayer: LayerMetadata = {
      id: `layer-${Date.now()}`,
      name: layerName.trim() || fileName || 'Uploaded Layer',
      visible: true,
      opacity: 1,
      color: layerColor,
      fillOpacity: 0.5,
      featureCount: validation.featureCount,
      geometryType: validation.geometryTypes.join(', ') || 'Polygon',
      propertiesList,
      sourceType: 'upload',
      data: rawParsedGeoJSON,
    };

    onAddLayer(newLayer);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-white">Upload GeoJSON Dataset</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Drag & Drop Box */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-cyan-400 bg-cyan-950/30'
                : 'border-slate-700 hover:border-slate-500 bg-slate-950/40'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".geojson,.json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <FileCode className="w-10 h-10 mx-auto mb-2 text-cyan-400 opacity-80" />
            <p className="text-sm font-medium text-slate-200">
              Drag &amp; drop your GeoJSON file here, or{' '}
              <span className="text-cyan-400 underline">browse</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports .geojson and .json (WGS84 EPSG:4326 coordinates)
            </p>
          </div>

          {/* Validation Feedback */}
          {isProcessing && (
            <div className="p-3 bg-slate-800/80 rounded-xl text-center text-xs text-slate-300 animate-pulse">
              Validating geospatial geometries and attributes...
            </div>
          )}

          {validation && !validation.valid && (
            <div className="p-3.5 bg-red-950/40 border border-red-500/50 rounded-xl flex items-start gap-2.5 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-300">GeoJSON Validation Error</p>
                <p className="mt-0.5">{validation.error}</p>
              </div>
            </div>
          )}

          {validation && validation.valid && (
            <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-xl space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Valid GeoJSON Verified</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
                <div>
                  <span className="text-slate-400">Features: </span>
                  <span className="font-bold text-white">{validation.featureCount}</span>
                </div>
                <div>
                  <span className="text-slate-400">Geometry: </span>
                  <span className="font-bold text-white">
                    {validation.geometryTypes.join(', ')}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400">Numeric Criteria detected: </span>
                  <span className="font-bold text-cyan-300">
                    {validation.numericProperties.length} properties
                  </span>
                </div>
              </div>

              {validation.numericProperties.length > 0 && (
                <div className="pt-1">
                  <p className="text-[11px] text-slate-400 mb-1">MCDA-Ready Attributes:</p>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {validation.numericProperties.map((p) => (
                      <span
                        key={p}
                        className="px-2 py-0.5 bg-cyan-950/60 border border-cyan-700/40 rounded text-[10px] text-cyan-300 font-mono"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Layer Customization Form */}
          {validation?.valid && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Layer Label</label>
                <input
                  type="text"
                  value={layerName}
                  onChange={(e) => setLayerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Map Accent Color</label>
                <div className="flex items-center gap-2">
                  {['#06b6d4', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6'].map(
                    (color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setLayerColor(color)}
                        className={`w-7 h-7 rounded-full transition-transform ${
                          layerColor === color ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!validation?.valid}
            onClick={handleConfirm}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-md shadow-cyan-950/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add to Map
          </button>
        </div>
      </div>
    </div>
  );
};
