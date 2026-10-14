/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { MapView } from './components/MapView';
import { Sidebar } from './components/Sidebar';
import { AttributeTable } from './components/AttributeTable';
import { FeatureInspector } from './components/FeatureInspector';
import { MCDAResultsPanel } from './components/MCDAResultsPanel';
import { UploadModal } from './components/UploadModal';
import { VisionModal } from './components/VisionModal';
import { LayerMetadata, MCDACriterion, MCDAResults, ChatMessage } from './types/gis';
import { WEST_BENGAL_DISTRICTS_GEOJSON, MCDA_PRESETS } from './data/westBengalSampleData';
import { calculateMCDA } from './utils/mcda';

export default function App() {
  // Layer State
  const [layers, setLayers] = useState<LayerMetadata[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  // Selection & Map Navigation State
  const [selectedFeature, setSelectedFeature] = useState<any | null>(null);
  const [flyToTrigger, setFlyToTrigger] = useState<{
    featureId?: string | number;
    layerId?: string;
    timestamp: number;
  } | null>(null);

  // MCDA State
  const [activeMCDA, setActiveMCDA] = useState<MCDAResults | null>(null);
  const [isCalculatingMCDA, setIsCalculatingMCDA] = useState(false);

  // Drawer & Modal States
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isTableOpen, setIsTableOpen] = useState(false);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const [isVisionOpen, setIsVisionOpen] = useState(false);
  const [isFeatureInspectorOpen, setIsFeatureInspectorOpen] = useState(false);

  // GeoAI Assistant Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '👋 Welcome to Bengal GeoAI!\n\nI am your spatial analysis assistant. You can upload custom GeoJSON or explore our pilot dataset covering the 23 administrative districts of West Bengal, India.\n\nTry running an MCDA suitability model from the left sidebar or ask me questions about district parameters!',
      timestamp: new Date().toISOString(),
      metadata: {
        isSyntheticDisclaimer: true,
      },
    },
  ]);
  const [isAIThinking, setIsAIThinking] = useState(false);

  // Initialize with West Bengal sample dataset on mount
  useEffect(() => {
    loadSampleData();
  }, []);

  const loadSampleData = useCallback(() => {
    setIsLoadingSample(true);
    try {
      const sampleFeatures = WEST_BENGAL_DISTRICTS_GEOJSON.features;
      const propertiesList = Object.keys(sampleFeatures[0].properties)
        .filter((k) => !k.startsWith('_'))
        .map((key) => ({
          name: key,
          type: (typeof sampleFeatures[0].properties[key] === 'number' ? 'number' : 'string') as
            | 'number'
            | 'string',
        }));

      const sampleLayer: LayerMetadata = {
        id: 'wb-districts-pilot',
        name: 'West Bengal 23 Districts (Agro-Climatic)',
        visible: true,
        opacity: 0.9,
        color: '#0284c7',
        fillOpacity: 0.45,
        featureCount: sampleFeatures.length,
        geometryType: 'Polygon',
        propertiesList,
        sourceType: 'sample',
        data: WEST_BENGAL_DISTRICTS_GEOJSON,
      };

      setLayers([sampleLayer]);
      setActiveLayerId(sampleLayer.id);

      // Trigger map centering
      setFlyToTrigger({
        layerId: sampleLayer.id,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error('Failed to initialize sample data:', err);
    } finally {
      setIsLoadingSample(false);
    }
  }, []);

  // Layer Management Handlers
  const handleAddLayer = (newLayer: LayerMetadata) => {
    setLayers((prev) => [newLayer, ...prev]);
    setActiveLayerId(newLayer.id);
    setFlyToTrigger({
      layerId: newLayer.id,
      timestamp: Date.now(),
    });

    // Notify GeoAI
    const msg: ChatMessage = {
      id: `layer-added-${Date.now()}`,
      role: 'assistant',
      content: `📁 New layer "${newLayer.name}" loaded with ${newLayer.featureCount} features (${newLayer.geometryType}). You can now inspect its attributes or run Multi-Criteria Decision Analysis.`,
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, msg]);
  };

  const handleToggleLayerVisibility = (layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l))
    );
  };

  const handleChangeLayerOpacity = (layerId: string, opacity: number) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, opacity } : l))
    );
  };

  const handleRemoveLayer = (layerId: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== layerId));
    if (activeLayerId === layerId) {
      const remaining = layers.filter((l) => l.id !== layerId);
      setActiveLayerId(remaining.length > 0 ? remaining[0].id : null);
    }
    if (activeMCDA && activeMCDA.targetLayerId === layerId) {
      setActiveMCDA(null);
      setIsResultsOpen(false);
    }
  };

  const handleZoomToLayer = (layerId: string) => {
    setFlyToTrigger({
      layerId,
      timestamp: Date.now(),
    });
  };

  const handleDownloadLayer = (layer: LayerMetadata) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(layer.data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${layer.name.toLowerCase().replace(/\s+/g, '_')}.geojson`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Selection & Zoom Handlers
  const handleSelectFeature = (feat: any | null) => {
    setSelectedFeature(feat);
    if (feat) {
      setIsFeatureInspectorOpen(true);
    }
  };

  const handleSelectAndFlyToFeature = (featureId: string | number) => {
    // Locate feature in active layer
    const activeLayer = layers.find((l) => l.id === activeLayerId) || layers[0];
    if (activeLayer) {
      const found = activeLayer.data.features.find((f, i) => {
        const fid = f.id || f.properties?.id || f.properties?.district || f.properties?.name || `feat-${i}`;
        return String(fid) === String(featureId);
      });
      if (found) {
        setSelectedFeature({
          id: featureId,
          properties: found.properties,
          geometry: found.geometry.type,
        });
        setIsFeatureInspectorOpen(true);
      }
    }

    setFlyToTrigger({
      featureId,
      timestamp: Date.now(),
    });
  };

  // MCDA Handler
  const handleRunMCDA = async (criteria: MCDACriterion[], name: string) => {
    const currentLayer = layers.find((l) => l.id === activeLayerId) || layers[0];
    if (!currentLayer) return;

    setIsCalculatingMCDA(true);

    try {
      let results: MCDAResults;

      // Try backend endpoint first
      try {
        const resp = await fetch('/api/mcda/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            layerId: currentLayer.id,
            analysisName: name,
            geojson: currentLayer.data,
            criteria,
          }),
        });
        const resData = await resp.json();
        if (resData.success && resData.results) {
          results = resData.results;
        } else {
          throw new Error(resData.error || 'Server calculation failed');
        }
      } catch (err) {
        // Fallback to client-side MCDA engine
        results = calculateMCDA(currentLayer.id, name, currentLayer.data, criteria);
      }

      setActiveMCDA(results);
      setIsResultsOpen(true);

      // GeoAI notification
      const top1 = results.items[0];
      const bot1 = results.items[results.items.length - 1];
      const aiNote: ChatMessage = {
        id: `mcda-res-${Date.now()}`,
        role: 'assistant',
        content: `🎯 **${results.name}** computed successfully across ${results.items.length} districts.\n\n- **Top Candidate:** **${top1.featureName}** (Score: **${top1.finalScore}/100**, Rank #1, ${top1.grade})\n- **Lowest Score:** **${bot1.featureName}** (Score: **${bot1.finalScore}/100**, Rank #${bot1.rank}, ${bot1.grade})\n- **State Mean:** ${results.stats.mean} / 100\n\nThe map styling has updated with dynamic suitability choropleth tiers!`,
        timestamp: new Date().toISOString(),
        metadata: {
          isSyntheticDisclaimer: true,
          topDistricts: results.items.slice(0, 3).map((it) => ({
            name: it.featureName,
            score: it.finalScore,
          })),
        },
      };
      setChatMessages((prev) => [...prev, aiNote]);
    } catch (error: any) {
      alert(`MCDA Calculation Failed: ${error.message}`);
    } finally {
      setIsCalculatingMCDA(false);
    }
  };

  const handleClearMCDA = () => {
    setActiveMCDA(null);
    setIsResultsOpen(false);
  };

  // GeoAI Chat Query Handler
  const handleSendMessage = async (query: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setIsAIThinking(true);

    try {
      const currentLayer = layers.find((l) => l.id === activeLayerId) || layers[0];
      const resp = await fetch('/api/geoai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          datasetSummary: currentLayer
            ? {
                name: currentLayer.name,
                featureCount: currentLayer.featureCount,
                properties: currentLayer.propertiesList.map((p) => p.name),
              }
            : null,
          activeAnalysis: activeMCDA,
          selectedFeature: selectedFeature?.properties,
        }),
      });

      const data = await resp.json();
      if (data.success && data.answer) {
        const assistantMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.answer,
          timestamp: new Date().toISOString(),
          metadata: {
            isSyntheticDisclaimer: data.isSyntheticDisclaimer,
          },
        };
        setChatMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error(data.error || 'No response returned');
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        role: 'assistant',
        content: `Apologies, I encountered an issue analyzing your query. Please check your network or rephrase your question.`,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAIThinking(false);
    }
  };

  const totalFeatures = layers.reduce((sum, l) => sum + l.featureCount, 0);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#070b14] text-slate-100 font-sans">
      {/* Top Navigation & Status Bar */}
      <Header
        layerCount={layers.length}
        featureCount={totalFeatures}
        hasMCDA={Boolean(activeMCDA)}
        onOpenUpload={() => setIsUploadOpen(true)}
        onLoadSample={loadSampleData}
        isLoadingSample={isLoadingSample}
        isTableOpen={isTableOpen}
        onToggleTable={() => setIsTableOpen((prev) => !prev)}
        isResultsOpen={isResultsOpen}
        onToggleResults={() => setIsResultsOpen((prev) => !prev)}
        onOpenVisionInfo={() => setIsVisionOpen(true)}
      />

      {/* Main Workspace: Left Sidebar + Central Map + Overlays */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar (Layers, MCDA, GeoAI) */}
        <Sidebar
          layers={layers}
          activeLayerId={activeLayerId}
          onSelectLayer={(id) => setActiveLayerId(id)}
          onToggleLayerVisibility={handleToggleLayerVisibility}
          onChangeLayerOpacity={handleChangeLayerOpacity}
          onRemoveLayer={handleRemoveLayer}
          onZoomToLayer={handleZoomToLayer}
          onDownloadLayer={handleDownloadLayer}
          onOpenUpload={() => setIsUploadOpen(true)}
          onLoadSample={loadSampleData}
          activeMCDA={activeMCDA}
          onRunMCDA={handleRunMCDA}
          onClearMCDA={handleClearMCDA}
          isCalculatingMCDA={isCalculatingMCDA}
          chatMessages={chatMessages}
          onSendMessage={handleSendMessage}
          isAIThinking={isAIThinking}
          selectedFeature={selectedFeature}
          onInspectSelected={() => setIsFeatureInspectorOpen(true)}
        />

        {/* Center OpenLayers Map Canvas */}
        <main className="flex-1 relative h-full">
          <MapView
            layers={layers}
            activeMCDA={activeMCDA}
            selectedFeatureId={selectedFeature?.id ?? null}
            onSelectFeature={handleSelectFeature}
            flyToTrigger={flyToTrigger}
          />

          {/* Feature Properties Inspector Drawer */}
          {isFeatureInspectorOpen && (
            <FeatureInspector
              feature={selectedFeature}
              activeMCDA={activeMCDA}
              onClose={() => setIsFeatureInspectorOpen(false)}
              onFlyTo={handleSelectAndFlyToFeature}
              onAskGeoAI={(q) => handleSendMessage(q)}
            />
          )}

          {/* Bottom Expandable Attribute Table */}
          <AttributeTable
            isOpen={isTableOpen}
            onClose={() => setIsTableOpen(false)}
            layers={layers}
            activeLayerId={activeLayerId}
            onSelectLayer={(id) => setActiveLayerId(id)}
            activeMCDA={activeMCDA}
            selectedFeatureId={selectedFeature?.id ?? null}
            onSelectAndFlyToFeature={handleSelectAndFlyToFeature}
          />

          {/* Right Floating MCDA Results Dashboard */}
          <MCDAResultsPanel
            isOpen={isResultsOpen}
            onClose={() => setIsResultsOpen(false)}
            results={activeMCDA}
            onSelectAndFlyTo={handleSelectAndFlyToFeature}
          />
        </main>
      </div>

      {/* Upload GeoJSON Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onAddLayer={handleAddLayer}
      />

      {/* Vision & Platform Info Modal */}
      <VisionModal
        isOpen={isVisionOpen}
        onClose={() => setIsVisionOpen(false)}
      />
    </div>
  );
}
