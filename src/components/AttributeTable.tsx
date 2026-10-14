import React, { useState, useMemo } from 'react';
import {
  Table as TableIcon,
  X,
  Search,
  ArrowUpDown,
  Download,
  Crosshair,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { LayerMetadata, MCDAResults } from '../types/gis';
import { getScoreColor } from '../utils/mcda';

interface AttributeTableProps {
  isOpen: boolean;
  onClose: () => void;
  layers: LayerMetadata[];
  activeLayerId: string | null;
  onSelectLayer: (layerId: string) => void;
  activeMCDA: MCDAResults | null;
  selectedFeatureId: string | number | null;
  onSelectAndFlyToFeature: (featureId: string | number) => void;
}

export const AttributeTable: React.FC<AttributeTableProps> = ({
  isOpen,
  onClose,
  layers,
  activeLayerId,
  onSelectLayer,
  activeMCDA,
  selectedFeatureId,
  onSelectAndFlyToFeature,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('district');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  if (!isOpen) return null;

  const currentLayer = layers.find((l) => l.id === activeLayerId) || layers[0];

  // Map MCDA scores if active
  const mcdaMap = useMemo(() => {
    const map = new Map<string, { score: number; rank: number; grade: string }>();
    if (activeMCDA && activeMCDA.targetLayerId === currentLayer?.id) {
      activeMCDA.items.forEach((item) => {
        map.set(String(item.featureId), {
          score: item.finalScore,
          rank: item.rank,
          grade: item.grade,
        });
        map.set(String(item.featureName), {
          score: item.finalScore,
          rank: item.rank,
          grade: item.grade,
        });
      });
    }
    return map;
  }, [activeMCDA, currentLayer]);

  // Extract columns
  const columns = useMemo(() => {
    if (!currentLayer) return [];
    const keys = new Set<string>();

    // If MCDA is active, put Rank and Score first
    const list: { key: string; label: string; isMCDA?: boolean }[] = [];
    if (activeMCDA && activeMCDA.targetLayerId === currentLayer.id) {
      list.push({ key: '_mcdaRank', label: 'MCDA Rank', isMCDA: true });
      list.push({ key: '_mcdaScore', label: 'Suitability Score', isMCDA: true });
      list.push({ key: '_mcdaGrade', label: 'Tier', isMCDA: true });
    }

    currentLayer.data.features.forEach((f) => {
      if (f.properties) {
        Object.keys(f.properties).forEach((k) => {
          if (!k.startsWith('_') && k !== 'is_synthetic') {
            keys.add(k);
          }
        });
      }
    });

    Array.from(keys).forEach((k) => {
      list.push({
        key: k,
        label: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      });
    });

    return list;
  }, [currentLayer, activeMCDA]);

  // Prepare & sort table rows
  const filteredAndSortedRows = useMemo(() => {
    if (!currentLayer) return [];

    let rows: Record<string, any>[] = currentLayer.data.features.map((f, i) => {
      const id = f.id || f.properties?.id || `feat-${i}`;
      const name = f.properties?.district || f.properties?.name || `Feature ${i + 1}`;
      const mcda = mcdaMap.get(String(id)) || mcdaMap.get(String(name));

      return {
        _id: id,
        _name: name,
        _mcdaRank: mcda?.rank ?? 9999,
        _mcdaScore: mcda?.score ?? null,
        _mcdaGrade: mcda?.grade ?? null,
        ...f.properties,
      };
    });

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      rows = rows.filter((row) =>
        Object.values(row).some((val) =>
          val !== null && val !== undefined && String(val).toLowerCase().includes(q)
        )
      );
    }

    // Sort
    rows.sort((a, b) => {
      let valA = a[sortColumn];
      let valB = b[sortColumn];

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });

    return rows;
  }, [currentLayer, mcdaMap, searchTerm, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedRows.slice(start, start + pageSize);
  }, [filteredAndSortedRows, currentPage, pageSize]);

  const handleSort = (colKey: string) => {
    if (sortColumn === colKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(colKey);
      setSortDirection('asc');
    }
  };

  const exportCSV = () => {
    if (!currentLayer) return;
    const headerRow = columns.map((c) => `"${c.label}"`).join(',');
    const dataRows = filteredAndSortedRows.map((row) =>
      columns.map((c) => `"${row[c.key] ?? ''}"`).join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headerRow, ...dataRows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${currentLayer.name.toLowerCase()}_attributes.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 h-80 bg-slate-950/95 border-t border-slate-800 shadow-2xl z-25 flex flex-col backdrop-blur-md animate-in slide-in-from-bottom-6">
      {/* Table Header Bar */}
      <div className="px-4 py-2.5 border-b border-slate-800/80 flex items-center justify-between gap-4">
        {/* Layer Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <TableIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span className="text-xs font-bold text-white uppercase tracking-wider hidden sm:inline">
            Attribute Table:
          </span>
          {layers.map((l) => (
            <button
              key={l.id}
              onClick={() => onSelectLayer(l.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activeLayerId === l.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
              }`}
            >
              {l.name}
            </button>
          ))}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search table..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 w-36 sm:w-48"
            />
          </div>

          <button
            onClick={exportCSV}
            title="Export Table to CSV"
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            title="Close Attribute Table"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table Data View */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-900/90 sticky top-0 z-10 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th className="py-2 px-3 w-10 text-center">Action</th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`py-2 px-3 font-semibold cursor-pointer select-none transition-colors whitespace-nowrap ${
                    col.isMCDA ? 'text-cyan-300 bg-cyan-950/20' : 'hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.label}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="text-center py-8 text-slate-500 italic">
                  No features match your query.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => {
                const isSelected = selectedFeatureId !== null && String(selectedFeatureId) === String(row._id);
                return (
                  <tr
                    key={String(row._id)}
                    onClick={() => onSelectAndFlyToFeature(row._id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-cyan-950/60 text-cyan-200 border-l-4 border-cyan-400'
                        : 'hover:bg-slate-900/70 text-slate-300'
                    }`}
                  >
                    <td className="py-1.5 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAndFlyToFeature(row._id);
                        }}
                        className="p-1 text-cyan-400 hover:text-cyan-200 rounded"
                        title="Zoom to feature on map"
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                      </button>
                    </td>
                    {columns.map((col) => {
                      const val = row[col.key];
                      if (col.key === '_mcdaScore' && val !== null) {
                        return (
                          <td key={col.key} className="py-1.5 px-3 font-bold font-mono">
                            <span
                              className="px-2 py-0.5 rounded text-[11px]"
                              style={{
                                backgroundColor: `${getScoreColor(Number(val))}22`,
                                color: getScoreColor(Number(val)),
                              }}
                            >
                              {val}/100
                            </span>
                          </td>
                        );
                      }
                      if (col.key === '_mcdaRank' && val !== null && val !== 9999) {
                        return (
                          <td key={col.key} className="py-1.5 px-3 font-semibold text-cyan-400">
                            #{val}
                          </td>
                        );
                      }
                      if (col.key === '_mcdaGrade' && val !== null) {
                        return (
                          <td key={col.key} className="py-1.5 px-3 font-semibold text-slate-200">
                            {val}
                          </td>
                        );
                      }
                      return (
                        <td key={col.key} className="py-1.5 px-3 whitespace-nowrap">
                          {val !== undefined && val !== null ? String(val) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Status Footer */}
      <div className="px-4 py-2 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
        <div>
          Showing {Math.min(filteredAndSortedRows.length, (currentPage - 1) * pageSize + 1)} to{' '}
          {Math.min(filteredAndSortedRows.length, currentPage * pageSize)} of{' '}
          {filteredAndSortedRows.length} districts
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-slate-300 font-mono text-xs">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
