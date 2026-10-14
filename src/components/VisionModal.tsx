import React from 'react';
import { X, Compass, Globe, Sparkles, Database, CheckCircle, ShieldAlert } from 'lucide-react';

interface VisionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VisionModal: React.FC<VisionModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-emerald-400 p-0.5 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[6px] flex items-center justify-center">
                <Compass className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">About Bengal GeoAI</h2>
              <p className="text-[11px] text-slate-400">
                AI-Assisted Geospatial Intelligence Platform
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto text-xs text-slate-300 leading-relaxed">
          <div className="space-y-1.5">
            <h3 className="font-semibold text-cyan-300 text-sm flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>Platform Vision</span>
            </h3>
            <p>
              <strong>Bengal GeoAI</strong> is built to democratize spatial decision-making. Starting
              with a pilot for the 23 administrative districts of West Bengal, India, the platform
              integrates interactive vector mapping, client-and-server Multi-Criteria Decision
              Analysis (MCDA), and an intelligent spatial assistant.
            </p>
            <p>
              The platform is architected for seamless scaling across all states of India and
              worldwide administrative or watershed boundaries.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
            <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Core Capabilities</span>
            </h4>
            <ul className="space-y-1.5 list-disc list-inside text-slate-400 text-[11px]">
              <li>
                <span className="text-slate-200">Interactive OpenLayers Engine:</span> High-speed
                vector rendering with dynamic choropleths, CartoDB Dark Matter / OSM basemaps, and
                precision district fly-to.
              </li>
              <li>
                <span className="text-slate-200">Flexible Multi-Criteria Decision Analysis (MCDA):</span>{' '}
                Weighted Linear Combination (WLC) with Min-Max benefit/cost normalization, weight
                distribution checks, and 5-tier classification.
              </li>
              <li>
                <span className="text-slate-200">GeoJSON Ingestion &amp; Validation:</span> Drag-and-drop
                upload with CRS validation, bounding box extraction, and numeric attribute detection.
              </li>
              <li>
                <span className="text-slate-200">Interactive Attribute Table &amp; Inspector:</span>{' '}
                Full tabular search, multi-column sorting, CSV exports, and map synchronization.
              </li>
              <li>
                <span className="text-slate-200">GeoAI Spatial Assistant:</span> Conversational queries
                with Gemini 2.5 Flash and built-in heuristic spatial reasoning (zero API keys required
                for standard exploration).
              </li>
            </ul>
          </div>

          <div className="p-3.5 bg-amber-950/30 rounded-xl border border-amber-600/30 text-amber-200 text-[11px] space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-amber-300">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Scientific Data Integrity Notice</span>
            </div>
            <p>
              The administrative boundaries represent realistic polygon representations of West
              Bengal's 23 districts. The socioeconomic, soil fertility, and rainfall figures in the demo
              dataset are synthetic simulation models intended for methodology demonstration and UI
              testing. Real-world decisions should be paired with verified department ground surveys.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 transition-colors"
          >
            Got it, explore platform
          </button>
        </div>
      </div>
    </div>
  );
};
