import React from 'react';
import {
  Compass,
  Upload,
  Table,
  BarChart3,
  Sparkles,
  Info,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface HeaderProps {
  layerCount: number;
  featureCount: number;
  hasMCDA: boolean;
  onOpenUpload: () => void;
  onLoadSample: () => void;
  isLoadingSample: boolean;
  isTableOpen: boolean;
  onToggleTable: () => void;
  isResultsOpen: boolean;
  onToggleResults: () => void;
  onOpenVisionInfo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  layerCount,
  featureCount,
  hasMCDA,
  onOpenUpload,
  onLoadSample,
  isLoadingSample,
  isTableOpen,
  onToggleTable,
  isResultsOpen,
  onToggleResults,
  onOpenVisionInfo,
}) => {
  return (
    <header className="h-16 bg-slate-950/95 border-b border-slate-800/80 px-4 flex items-center justify-between z-30 select-none">
      {/* Brand & Vision */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 p-0.5 shadow-lg shadow-cyan-950/50 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <Compass className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
              <span>Bengal</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                GeoAI
              </span>
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              WB Pilot
            </span>
          </div>
          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <span>AI-Assisted Geospatial Analysis</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400/90 font-medium">West Bengal &amp; Beyond</span>
          </p>
        </div>
      </div>

      {/* Center Status Badges */}
      <div className="hidden lg:flex items-center gap-2 text-xs">
        <div className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>{layerCount} {layerCount === 1 ? 'Layer' : 'Layers'}</span>
        </div>
        <div className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{featureCount} Districts/Polygons</span>
        </div>
        {hasMCDA ? (
          <div className="px-3 py-1 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>MCDA Model Active</span>
          </div>
        ) : (
          <div className="px-3 py-1 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-600" />
            <span>No MCDA Computed</span>
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onLoadSample}
          disabled={isLoadingSample}
          title="Load 23 Districts of West Bengal with Synthetic MCDA Indicators"
          className="px-3 py-2 rounded-xl text-xs font-medium text-cyan-300 bg-cyan-950/50 hover:bg-cyan-900/50 border border-cyan-700/60 shadow-sm transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSample ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Load WB Sample</span>
        </button>

        <button
          onClick={onOpenUpload}
          className="px-3 py-2 rounded-xl text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
        >
          <Upload className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Upload GeoJSON</span>
        </button>

        <button
          onClick={onToggleTable}
          className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 active:scale-95 ${
            isTableOpen
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60'
              : 'text-slate-300 bg-slate-900 hover:bg-slate-800 border-slate-800'
          }`}
          title="Toggle Attribute Table"
        >
          <Table className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Attribute Table</span>
        </button>

        {hasMCDA && (
          <button
            onClick={onToggleResults}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 active:scale-95 ${
              isResultsOpen
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60'
                : 'text-emerald-400 bg-slate-900 hover:bg-slate-800 border-slate-800'
            }`}
            title="Toggle MCDA Suitability Results Dashboard"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Results</span>
          </button>
        )}

        <button
          onClick={onOpenVisionInfo}
          className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
          title="About Bengal GeoAI & Vision"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
