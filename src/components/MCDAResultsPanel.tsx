import React, { useState } from 'react';
import {
  X,
  Trophy,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Download,
  Crosshair,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { MCDAResults, MCDAResultItem, SuitabilityGrade } from '../types/gis';
import { getScoreColor } from '../utils/mcda';

interface MCDAResultsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  results: MCDAResults | null;
  onSelectAndFlyTo: (featureId: string | number) => void;
}

export const MCDAResultsPanel: React.FC<MCDAResultsPanelProps> = ({
  isOpen,
  onClose,
  results,
  onSelectAndFlyTo,
}) => {
  const [showMethodology, setShowMethodology] = useState(false);
  const [filterGrade, setFilterGrade] = useState<SuitabilityGrade | 'ALL'>('ALL');

  if (!isOpen || !results) return null;

  const topDistrict = results.items[0];
  const lowestDistrict = results.items[results.items.length - 1];

  const filteredItems =
    filterGrade === 'ALL'
      ? results.items
      : results.items.filter((item) => item.grade === filterGrade);

  const exportResultsCSV = () => {
    const headers = ['Rank', 'District', 'Suitability_Score', 'Grade', ...results.criteria.map((c) => `Norm_${c.propertyName}`)];
    const rows = results.items.map((item) => {
      const critScores = results.criteria.map((c) => item.normalizedScores[c.propertyName] ?? '');
      return [item.rank, `"${item.featureName}"`, item.finalScore, `"${item.grade}"`, ...critScores].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${results.name.toLowerCase().replace(/\s+/g, '_')}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] md:w-[540px] bg-slate-950/98 border-l border-slate-800 shadow-2xl z-40 flex flex-col backdrop-blur-xl animate-in slide-in-from-right select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white">{results.name}</h2>
            <p className="text-[11px] text-slate-400">
              Evaluated {results.items.length} districts across {results.criteria.length} criteria
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={exportResultsCSV}
            className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors"
            title="Export Results CSV"
          >
            <Download className="w-4 h-4 text-cyan-400" />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
              <Trophy className="w-3.5 h-3.5" />
              <span>Rank #1 (Highest)</span>
            </div>
            <p className="font-bold text-white text-sm truncate">{topDistrict?.featureName}</p>
            <p className="text-emerald-300 font-mono text-xs font-semibold">
              {topDistrict?.finalScore} / 100 ({topDistrict?.grade})
            </p>
          </div>

          <div className="p-3 bg-gradient-to-br from-rose-950/30 to-slate-900 border border-rose-500/30 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 text-rose-400 font-semibold text-[11px]">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Lowest Ranked</span>
            </div>
            <p className="font-bold text-white text-sm truncate">{lowestDistrict?.featureName}</p>
            <p className="text-rose-300 font-mono text-xs font-semibold">
              {lowestDistrict?.finalScore} / 100 ({lowestDistrict?.grade})
            </p>
          </div>

          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
            <span className="text-slate-400 text-[10px]">Mean Suitability</span>
            <p className="font-mono text-sm font-bold text-cyan-300">{results.stats.mean} / 100</p>
          </div>

          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
            <span className="text-slate-400 text-[10px]">Std Deviation</span>
            <p className="font-mono text-sm font-bold text-slate-300">± {results.stats.stdDev}</p>
          </div>
        </div>

        {/* Suitability Grade Tier Filter Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Grade Tier Distribution</span>
            <span className="text-[10px] text-slate-400">Click tier to filter</span>
          </div>

          <div className="grid grid-cols-5 gap-1 text-[10px]">
            {(['Very High', 'High', 'Moderate', 'Low', 'Very Low'] as SuitabilityGrade[]).map(
              (grade) => {
                const count = results.gradeCounts[grade] || 0;
                const isSelected = filterGrade === grade;
                return (
                  <button
                    key={grade}
                    onClick={() => setFilterGrade(isSelected ? 'ALL' : grade)}
                    className={`p-1.5 rounded-lg border text-center transition-all ${
                      isSelected
                        ? 'bg-slate-800 ring-2 ring-cyan-400 border-cyan-400'
                        : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <div
                      className="w-2.5 h-2.5 mx-auto rounded-full mb-1"
                      style={{ backgroundColor: getScoreColor(grade === 'Very High' ? 90 : grade === 'High' ? 70 : grade === 'Moderate' ? 50 : grade === 'Low' ? 30 : 10) }}
                    />
                    <div className="font-semibold text-slate-200 truncate">{grade}</div>
                    <div className="font-mono text-cyan-300 font-bold">{count}</div>
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Districts Ranked ({filteredItems.length})
            </h3>
            {filterGrade !== 'ALL' && (
              <button
                onClick={() => setFilterGrade('ALL')}
                className="text-[10px] text-cyan-400 hover:underline"
              >
                Clear Tier Filter
              </button>
            )}
          </div>

          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
            {filteredItems.map((item) => (
              <div
                key={String(item.featureId)}
                onClick={() => onSelectAndFlyTo(item.featureId)}
                className="p-2.5 bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 rounded-xl flex items-center justify-between gap-2 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span
                    className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                      item.rank === 1
                        ? 'bg-amber-400 text-slate-950 shadow-md'
                        : item.rank === 2
                        ? 'bg-slate-300 text-slate-950'
                        : item.rank === 3
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.rank}
                  </span>
                  <div className="truncate">
                    <p className="text-xs font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">
                      {item.featureName}
                    </p>
                    <p className="text-[10px] text-slate-400">Tier: {item.grade}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-mono font-bold"
                      style={{
                        backgroundColor: `${getScoreColor(item.finalScore)}22`,
                        color: getScoreColor(item.finalScore),
                      }}
                    >
                      {item.finalScore}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAndFlyTo(item.featureId);
                    }}
                    className="p-1 text-slate-400 hover:text-cyan-400 rounded"
                    title="Zoom on map"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Methodology Accordion */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
          <button
            onClick={() => setShowMethodology(!showMethodology)}
            className="w-full p-3 flex items-center justify-between text-xs font-semibold text-slate-300 hover:bg-slate-800/60 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>Mathematical Formula &amp; Methodology</span>
            </span>
            {showMethodology ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showMethodology && (
            <div className="p-3.5 border-t border-slate-800 space-y-3 text-xs text-slate-300 bg-slate-950/60">
              <div className="space-y-1">
                <p className="font-semibold text-cyan-300">1. Normalization (0–100 Scale)</p>
                <p className="text-slate-400 text-[11px]">{results.methodology.normalization}</p>
              </div>

              <div className="space-y-1">
                <p className="font-semibold text-cyan-300">2. Weight Normalization</p>
                <p className="text-slate-400 text-[11px]">{results.methodology.weighting}</p>
              </div>

              <div className="space-y-1">
                <p className="font-semibold text-cyan-300">3. Aggregation Equation</p>
                <div className="p-2 rounded bg-slate-900 font-mono text-[11px] text-emerald-300 border border-slate-800">
                  {results.methodology.formula}
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <p className="font-semibold text-slate-300 text-[11px]">Applied Weights:</p>
                <div className="divide-y divide-slate-800">
                  {results.criteria.map((c) => (
                    <div key={c.id} className="py-1 flex justify-between text-[11px]">
                      <span className="text-slate-400">
                        {c.label} ({c.direction})
                      </span>
                      <span className="font-mono text-cyan-300 font-semibold">{c.weight}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
