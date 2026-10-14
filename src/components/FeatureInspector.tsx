import React from 'react';
import {
  X,
  MapPin,
  Sparkles,
  Crosshair,
  BarChart2,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { MCDAResults } from '../types/gis';
import { getScoreColor } from '../utils/mcda';

interface FeatureInspectorProps {
  feature: any | null;
  activeMCDA: MCDAResults | null;
  onClose: () => void;
  onFlyTo: (featureId: string | number) => void;
  onAskGeoAI: (query: string) => void;
}

export const FeatureInspector: React.FC<FeatureInspectorProps> = ({
  feature,
  activeMCDA,
  onClose,
  onFlyTo,
  onAskGeoAI,
}) => {
  if (!feature) return null;

  const props = feature.properties || {};
  const districtName = props.district || props.name || props.NAME || 'District Details';
  const division = props.division;
  const featId = feature.id || props.id || districtName;

  // Find MCDA item if available
  const mcdaItem = activeMCDA?.items.find(
    (item) => String(item.featureId) === String(featId) || item.featureName === districtName
  );

  return (
    <div className="absolute top-20 right-4 w-84 md:w-96 max-h-[calc(100vh-140px)] bg-slate-950/95 border border-slate-700/80 rounded-2xl shadow-2xl z-30 flex flex-col backdrop-blur-md overflow-hidden animate-in slide-in-from-right-4 select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-start justify-between bg-gradient-to-r from-slate-900 to-slate-950">
        <div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-base text-white">{districtName}</h3>
          </div>
          {division && (
            <p className="text-xs text-slate-400 mt-0.5">
              Division: <span className="text-cyan-300 font-medium">{division}</span>
              {props.headquarters && ` • HQ: ${props.headquarters}`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onFlyTo(featId)}
            className="p-1.5 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-slate-800"
            title="Zoom to District"
          >
            <Crosshair className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            title="Close Inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* MCDA Card if computed */}
        {mcdaItem ? (
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>MCDA Suitability Status</span>
              </span>
              <span className="text-cyan-300 font-bold">Rank #{mcdaItem.rank}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950">
              <span className="text-slate-400">Composite Score</span>
              <span
                className="px-2 py-0.5 rounded font-mono font-bold text-sm"
                style={{
                  backgroundColor: `${getScoreColor(mcdaItem.finalScore)}25`,
                  color: getScoreColor(mcdaItem.finalScore),
                }}
              >
                {mcdaItem.finalScore} / 100 ({mcdaItem.grade})
              </span>
            </div>

            {/* Normalized Breakdown */}
            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Normalized Criteria (0–100):
              </p>
              {Object.entries(mcdaItem.normalizedScores).map(([key, score]) => (
                <div key={key} className="space-y-0.5">
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span className="truncate">{key.replace(/_/g, ' ')}</span>
                    <span className="font-mono text-cyan-300">{score}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-400 text-[11px]">
            No MCDA suitability analysis currently computed. Select criteria in the MCDA panel to
            generate ranked scores.
          </div>
        )}

        {/* Ask GeoAI Button */}
        <button
          onClick={() => onAskGeoAI(`Tell me about ${districtName} in West Bengal and how it ranks.`)}
          className="w-full py-2 px-3 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-600/40 text-cyan-300 font-medium flex items-center justify-center gap-2 transition-all active:scale-98"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Ask GeoAI about {districtName}</span>
        </button>

        {/* All Attributes Grid */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            District Properties ({Object.keys(props).length})
          </h4>
          <div className="divide-y divide-slate-800/80 bg-slate-900/60 rounded-xl border border-slate-800 p-1">
            {Object.entries(props)
              .filter(([k]) => !k.startsWith('_'))
              .map(([key, val]) => (
                <div key={key} className="py-1.5 px-2.5 flex items-center justify-between gap-2">
                  <span className="text-slate-400 text-[11px] truncate">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className="text-slate-200 font-mono text-[11px] truncate text-right font-medium">
                    {val !== undefined && val !== null ? String(val) : '—'}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Disclaimer */}
        {props.is_synthetic && (
          <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-600/30 text-amber-300/80 text-[10px] flex items-start gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-400" />
            <span>
              Synthetic indicator simulation for West Bengal pilot demonstration. Does not claim
              validated field measurements.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
