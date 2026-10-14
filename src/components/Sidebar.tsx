import React, { useState } from 'react';
import {
  Layers,
  Sliders,
  Sparkles,
  Eye,
  EyeOff,
  Trash2,
  Maximize2,
  Download,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Send,
  HelpCircle,
  CheckCircle2,
  FileCheck,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { LayerMetadata, MCDACriterion, MCDAResults, MCDAPreset, ChatMessage } from '../types/gis';
import { MCDA_PRESETS } from '../data/westBengalSampleData';

interface SidebarProps {
  layers: LayerMetadata[];
  activeLayerId: string | null;
  onSelectLayer: (layerId: string) => void;
  onToggleLayerVisibility: (layerId: string) => void;
  onChangeLayerOpacity: (layerId: string, opacity: number) => void;
  onRemoveLayer: (layerId: string) => void;
  onZoomToLayer: (layerId: string) => void;
  onDownloadLayer: (layer: LayerMetadata) => void;
  onOpenUpload: () => void;
  onLoadSample: () => void;

  // MCDA props
  activeMCDA: MCDAResults | null;
  onRunMCDA: (criteria: MCDACriterion[], name: string) => Promise<void>;
  onClearMCDA: () => void;
  isCalculatingMCDA: boolean;

  // GeoAI props
  chatMessages: ChatMessage[];
  onSendMessage: (query: string) => Promise<void>;
  isAIThinking: boolean;

  // Selection
  selectedFeature: any | null;
  onInspectSelected: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  layers,
  activeLayerId,
  onSelectLayer,
  onToggleLayerVisibility,
  onChangeLayerOpacity,
  onRemoveLayer,
  onZoomToLayer,
  onDownloadLayer,
  onOpenUpload,
  onLoadSample,
  activeMCDA,
  onRunMCDA,
  onClearMCDA,
  isCalculatingMCDA,
  chatMessages,
  onSendMessage,
  isAIThinking,
  selectedFeature,
  onInspectSelected,
}) => {
  const [activeTab, setActiveTab] = useState<'layers' | 'mcda' | 'geoai'>('layers');

  // MCDA local state
  const [analysisName, setAnalysisName] = useState<string>('Paddy Cultivation Suitability');
  const [criteria, setCriteria] = useState<MCDACriterion[]>(() => {
    const p = MCDA_PRESETS[0];
    return p.criteria.map((c, i) => ({
      id: `crit-${i}`,
      propertyName: c.propertyName,
      label: c.label,
      direction: c.direction,
      weight: c.weight,
      unit: c.unit,
    }));
  });
  const [selectedPresetId, setSelectedPresetId] = useState<string>(MCDA_PRESETS[0].id);

  // GeoAI chat state
  const [inputQuery, setInputQuery] = useState('');

  const currentLayer = layers.find((l) => l.id === activeLayerId) || layers[0];

  const handleApplyPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = MCDA_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setAnalysisName(preset.name);
    setCriteria(
      preset.criteria.map((c, i) => ({
        id: `crit-${Date.now()}-${i}`,
        propertyName: c.propertyName,
        label: c.label,
        direction: c.direction,
        weight: c.weight,
        unit: c.unit,
      }))
    );
  };

  const handleAddCriterion = (propName: string) => {
    if (!propName) return;
    const newCrit: MCDACriterion = {
      id: `crit-${Date.now()}`,
      propertyName: propName,
      label: propName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      direction: 'benefit',
      weight: 20,
    };
    setCriteria([...criteria, newCrit]);
  };

  const handleUpdateCriterion = (id: string, updates: Partial<MCDACriterion>) => {
    setCriteria(criteria.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const handleRemoveCriterion = (id: string) => {
    setCriteria(criteria.filter((c) => c.id !== id));
  };

  const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);

  const handleRunAnalysis = async () => {
    if (criteria.length === 0) return;
    await onRunMCDA(criteria, analysisName);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || isAIThinking) return;
    const q = inputQuery.trim();
    setInputQuery('');
    await onSendMessage(q);
  };

  const quickPrompts = [
    'Which district ranked #1 and why?',
    'Show bottom 3 vulnerable districts',
    'Explain the MCDA formula & weights',
    'Summarize active dataset properties',
  ];

  return (
    <aside className="w-80 md:w-96 h-full bg-slate-950 border-r border-slate-800/80 flex flex-col z-20 select-none">
      {/* Navigation Tabs */}
      <div className="grid grid-cols-3 border-b border-slate-800 p-1.5 gap-1 bg-slate-900/60">
        <button
          onClick={() => setActiveTab('layers')}
          className={`py-2 px-1 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'layers'
              ? 'bg-slate-800 text-cyan-300 shadow-sm border border-cyan-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Layers</span>
        </button>

        <button
          onClick={() => setActiveTab('mcda')}
          className={`py-2 px-1 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'mcda'
              ? 'bg-slate-800 text-emerald-300 shadow-sm border border-emerald-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>MCDA</span>
        </button>

        <button
          onClick={() => setActiveTab('geoai')}
          className={`py-2 px-1 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all relative ${
            activeTab === 'geoai'
              ? 'bg-slate-800 text-cyan-300 shadow-sm border border-cyan-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>GeoAI</span>
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping absolute top-1.5 right-2" />
        </button>
      </div>

      {/* Selected Feature Quick Bar */}
      {selectedFeature && (
        <div className="px-3.5 py-2 bg-gradient-to-r from-cyan-950/60 to-slate-900 border-b border-cyan-500/30 flex items-center justify-between text-xs animate-in slide-in-from-top-1">
          <div className="truncate pr-2">
            <span className="text-slate-400 text-[10px]">SELECTED: </span>
            <span className="font-bold text-cyan-300">
              {selectedFeature.properties?.district || selectedFeature.properties?.name || 'Feature'}
            </span>
            {selectedFeature.properties?.division && (
              <span className="text-[10px] text-slate-400 ml-1.5">
                ({selectedFeature.properties.division})
              </span>
            )}
          </div>
          <button
            onClick={onInspectSelected}
            className="text-[10px] font-semibold text-cyan-400 hover:text-cyan-200 bg-cyan-900/40 px-2 py-0.5 rounded border border-cyan-600/40"
          >
            Inspect
          </button>
        </div>
      )}

      {/* Tab 1: Layers */}
      {activeTab === 'layers' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Layer Catalog ({layers.length})
            </h2>
            <button
              onClick={onOpenUpload}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add GeoJSON</span>
            </button>
          </div>

          {layers.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30 space-y-3">
              <Layers className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-xs text-slate-400">No geospatial layers currently loaded.</p>
              <button
                onClick={onLoadSample}
                className="w-full py-2 px-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-semibold transition-colors"
              >
                Load West Bengal 23 Districts
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {layers.map((layer) => (
                <div
                  key={layer.id}
                  onClick={() => onSelectLayer(layer.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    activeLayerId === layer.id
                      ? 'bg-slate-900 border-cyan-500/60 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 truncate">
                      <span
                        className="w-3.5 h-3.5 rounded-md flex-shrink-0"
                        style={{ backgroundColor: layer.color }}
                      />
                      <span className="text-xs font-semibold text-white truncate">
                        {layer.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLayerVisibility(layer.id);
                        }}
                        className="p-1 text-slate-400 hover:text-white rounded"
                        title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                      >
                        {layer.visible ? (
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onZoomToLayer(layer.id);
                        }}
                        className="p-1 text-slate-400 hover:text-white rounded"
                        title="Zoom to Layer Bounds"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownloadLayer(layer);
                        }}
                        className="p-1 text-slate-400 hover:text-white rounded"
                        title="Export GeoJSON"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveLayer(layer.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-400 rounded"
                        title="Remove Layer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{layer.featureCount} Features ({layer.geometryType})</span>
                    {layer.sourceType === 'sample' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        Synthetic Demo
                      </span>
                    )}
                  </div>

                  {/* Opacity Slider */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="w-12">Opacity:</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={layer.opacity}
                      onChange={(e) => onChangeLayerOpacity(layer.id, parseFloat(e.target.value))}
                      className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                    <span className="w-8 text-right font-mono text-[10px] text-slate-300">
                      {Math.round(layer.opacity * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* District Highlights Summary */}
          {currentLayer && (
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Dataset Schema Summary</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Loaded {currentLayer.featureCount} administrative polygons with{' '}
                {currentLayer.propertiesList.length} attribute columns.
              </p>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {currentLayer.propertiesList.map((p) => (
                  <span
                    key={p.name}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      p.type === 'number'
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: MCDA Suitability Analysis */}
      {activeTab === 'mcda' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                <span>Multi-Criteria Analysis (MCDA)</span>
              </h2>
            </div>
            <p className="text-[11px] text-slate-400">
              Weighted Linear Combination (WLC) suitability scoring for spatial planning.
            </p>
          </div>

          {/* Presets Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Analysis Presets</label>
            <select
              value={selectedPresetId}
              onChange={(e) => handleApplyPreset(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
            >
              {MCDA_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Criteria List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">
                Evaluation Criteria ({criteria.length})
              </label>
              <span className="text-[10px] font-mono text-cyan-400">
                Weights Sum: {totalWeight}
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {criteria.map((crit) => (
                <div
                  key={crit.id}
                  className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-slate-200 truncate">{crit.label}</span>
                    <button
                      onClick={() => handleRemoveCriterion(crit.id)}
                      className="text-slate-500 hover:text-red-400 p-0.5 rounded"
                      title="Remove Criterion"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {/* Direction Toggle */}
                    <button
                      onClick={() =>
                        handleUpdateCriterion(crit.id, {
                          direction: crit.direction === 'benefit' ? 'cost' : 'benefit',
                        })
                      }
                      className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border transition-colors ${
                        crit.direction === 'benefit'
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-600/40 hover:bg-emerald-900/50'
                          : 'bg-rose-950/60 text-rose-400 border-rose-600/40 hover:bg-rose-900/50'
                      }`}
                      title={
                        crit.direction === 'benefit'
                          ? 'Benefit: Higher value is more suitable'
                          : 'Cost: Lower value is more suitable'
                      }
                    >
                      {crit.direction === 'benefit' ? (
                        <>
                          <ArrowUpRight className="w-3 h-3" /> Benefit
                        </>
                      ) : (
                        <>
                          <ArrowDownRight className="w-3 h-3" /> Cost (Invert)
                        </>
                      )}
                    </button>

                    {/* Weight Slider */}
                    <div className="flex items-center gap-1.5 flex-1 justify-end">
                      <span className="text-[10px] text-slate-400">Weight:</span>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={crit.weight}
                        onChange={(e) =>
                          handleUpdateCriterion(crit.id, { weight: Number(e.target.value) })
                        }
                        className="w-20 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                      />
                      <span className="font-mono text-[11px] text-emerald-400 w-6 text-right">
                        {crit.weight}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Criterion from Dataset attributes */}
            {currentLayer && (
              <div className="pt-1">
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddCriterion(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-400"
                >
                  <option value="" disabled>
                    + Add criterion from layer attributes...
                  </option>
                  {currentLayer.propertiesList
                    .filter((p) => p.type === 'number' && !criteria.some((c) => c.propertyName === p.name))
                    .map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} (numeric)
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {/* Calculate Button */}
          <div className="pt-2 space-y-2">
            <button
              onClick={handleRunAnalysis}
              disabled={isCalculatingMCDA || criteria.length === 0}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/60 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              {isCalculatingMCDA ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Computing Weighted Scores...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Calculate Suitability</span>
                </>
              )}
            </button>

            {activeMCDA && (
              <button
                onClick={onClearMCDA}
                className="w-full py-1.5 text-[11px] text-slate-400 hover:text-red-400 transition-colors text-center"
              >
                Clear Active MCDA Model &amp; Styling
              </button>
            )}
          </div>

          {/* Methodological Transparency Box */}
          <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1.5 text-[11px] text-slate-400">
            <div className="font-semibold text-slate-300 flex items-center gap-1">
              <HelpCircle className="w-3 h-3 text-cyan-400" />
              <span>Calculation Method</span>
            </div>
            <p>
              Linear Min-Max normalization standardizes raw numbers into a 0–100 scale. Weights
              are automatically normalized such that $\sum W_i = 1.0$.
            </p>
            <p className="font-mono text-[10px] text-cyan-300">
              S_i = Σ (w_j / Σ w) × r_ij
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: GeoAI Assistant */}
      {activeTab === 'geoai' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chat Header / Disclaimer */}
          <div className="p-3 bg-cyan-950/30 border-b border-cyan-800/30 flex items-start gap-2 text-xs">
            <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-cyan-300">GeoAI Spatial Assistant</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Asks questions about West Bengal district attributes, MCDA suitability, and weights.
                Synthetic indicators are clearly flagged.
              </p>
            </div>
          </div>

          {/* Message History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 && (
              <div className="text-center py-6 space-y-2">
                <Sparkles className="w-8 h-8 mx-auto text-cyan-500/50" />
                <p className="text-xs text-slate-400">
                  Ask me about district attributes, MCDA rankings, or methodology.
                </p>
              </div>
            )}

            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col text-xs rounded-xl p-3 space-y-1 ${
                  msg.role === 'user'
                    ? 'bg-cyan-950/50 border border-cyan-600/40 text-slate-200 ml-6'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 mr-2'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span className="font-semibold uppercase tracking-wider">
                    {msg.role === 'user' ? 'You' : 'Bengal GeoAI'}
                  </span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="text-xs whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                {msg.metadata?.isSyntheticDisclaimer && (
                  <div className="pt-1 text-[9px] text-amber-400/80 flex items-center gap-1">
                    <AlertCircle className="w-2.5 h-2.5" />
                    <span>Demo dataset contains synthetic simulation indicators.</span>
                  </div>
                )}
              </div>
            ))}

            {isAIThinking && (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-2 text-xs text-cyan-300 animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>GeoAI is analyzing spatial parameters...</span>
              </div>
            )}
          </div>

          {/* Quick Questions */}
          <div className="p-2 border-t border-slate-800/80 bg-slate-900/40">
            <p className="text-[10px] text-slate-500 mb-1 px-1">Suggested inquiries:</p>
            <div className="flex flex-wrap gap-1">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => onSendMessage(prompt)}
                  className="px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] transition-colors truncate max-w-full"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Input */}
          <form
            onSubmit={handleChatSubmit}
            className="p-3 border-t border-slate-800 bg-slate-950 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask GeoAI about districts or MCDA..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isAIThinking}
              className="p-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl shadow transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </aside>
  );
};
