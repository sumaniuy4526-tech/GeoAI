import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { validateGeoJSON } from './src/utils/geojson';
import { calculateMCDA, MCDAValidationError } from './src/utils/mcda';
import { WEST_BENGAL_DISTRICTS_GEOJSON, MCDA_PRESETS } from './src/data/westBengalSampleData';
import { MCDACriterion } from './src/types/gis';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Bengal GeoAI Engine',
    version: '1.0.0',
    hasGeminiApiKey: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});

// Sample Dataset
app.get('/api/datasets/sample', (_req: Request, res: Response) => {
  res.json({
    success: true,
    dataset: WEST_BENGAL_DISTRICTS_GEOJSON,
    presets: MCDA_PRESETS,
    metadata: {
      name: 'West Bengal 23 Districts (Agro-Climatic Model)',
      region: 'West Bengal, India',
      featureCount: WEST_BENGAL_DISTRICTS_GEOJSON.features.length,
      isSynthetic: true,
      disclaimer: 'Administrative boundaries are authentic geometric representations. Numeric attribute metrics (soil, rainfall, infrastructure) are synthetic models for decision analysis prototyping.',
    },
  });
});

// GeoJSON Validation Endpoint
app.post('/api/geojson/validate', (req: Request, res: Response) => {
  try {
    const { geojson } = req.body;
    const result = validateGeoJSON(geojson);
    if (!result.valid) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({
      success: true,
      featureCount: result.featureCount,
      geometryTypes: result.geometryTypes,
      numericProperties: result.numericProperties,
      allProperties: result.allProperties,
      bbox: result.bbox,
      previewData: result.previewData,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Validation failed' });
  }
});

// MCDA Suitability Calculation Endpoint
app.post('/api/mcda/calculate', (req: Request, res: Response) => {
  try {
    const { layerId, analysisName, geojson, criteria } = req.body;

    if (!geojson) {
      res.status(400).json({ success: false, error: 'Missing GeoJSON dataset.' });
      return;
    }

    if (!Array.isArray(criteria) || criteria.length === 0) {
      res.status(400).json({ success: false, error: 'Criteria list must be a non-empty array.' });
      return;
    }

    const results = calculateMCDA(
      layerId || 'layer-1',
      analysisName || 'Suitability Analysis',
      geojson,
      criteria as MCDACriterion[]
    );

    res.json({
      success: true,
      results,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || 'Error occurred while computing MCDA suitability.',
    });
  }
});

// GeoAI Assistant Query Endpoint (Gemini + Heuristic Fallback)
app.post('/api/geoai/query', async (req: Request, res: Response) => {
  try {
    const { question, datasetSummary, activeAnalysis, selectedFeature } = req.body;

    if (!question || typeof question !== 'string') {
      res.status(400).json({ success: false, error: 'Question is required.' });
      return;
    }

    // Try Gemini API if key is available
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({});
        const prompt = `You are Bengal GeoAI, an expert Geospatial Data Scientist and Multi-Criteria Decision Analysis (MCDA) consultant specialized in West Bengal and spatial planning.
Respond authoritatively, concisely, and accurately based ONLY on the provided spatial and MCDA data context.
Do NOT fabricate data or claim real-world field verification if the dataset is synthetic.

CURRENT CONTEXT:
Dataset: ${JSON.stringify(datasetSummary || 'West Bengal 23 Districts')}
Active MCDA Analysis: ${JSON.stringify(activeAnalysis ? {
  name: activeAnalysis.name,
  criteria: activeAnalysis.criteria.map((c: any) => `${c.label} (${c.direction}, weight: ${c.weight})`),
  top3: activeAnalysis.items?.slice(0, 3).map((i: any) => `${i.featureName}: ${i.finalScore} (Rank #${i.rank}, ${i.grade})`),
  bottom3: activeAnalysis.items?.slice(-3).map((i: any) => `${i.featureName}: ${i.finalScore} (Rank #${i.rank}, ${i.grade})`),
  stats: activeAnalysis.stats,
} : 'No MCDA has been run yet')}
Selected Feature / District: ${JSON.stringify(selectedFeature || 'None')}

USER QUESTION: "${question}"

Provide a structured, helpful, professional response formatted with clean markdown bullet points or paragraphs. Include practical geospatial observations. Mention clearly that any synthetic demo figures are for analytical demonstration.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        res.json({
          success: true,
          answer: response.text,
          engine: 'Gemini 2.5 Flash',
          isSyntheticDisclaimer: true,
        });
        return;
      } catch (geminiError: any) {
        console.warn('Gemini API call failed, falling back to local heuristic reasoning engine:', geminiError.message);
      }
    }

    // Heuristic Local Spatial Assistant (100% Free, Reliable, Instant)
    const answer = generateLocalGeoAIResponse(question, datasetSummary, activeAnalysis, selectedFeature);
    res.json({
      success: true,
      answer,
      engine: 'Bengal GeoAI Local Heuristic Engine',
      isSyntheticDisclaimer: true,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'GeoAI assistant error',
    });
  }
});

// Intelligent Built-in Spatial Reasoning Engine (No API Key Required)
function generateLocalGeoAIResponse(
  question: string,
  datasetSummary: any,
  activeAnalysis: any,
  selectedFeature: any
): string {
  const q = question.toLowerCase();

  // If question is about selected district
  if (selectedFeature && (q.includes('selected') || q.includes(selectedFeature.district?.toLowerCase() || 'this district'))) {
    const props = selectedFeature.properties || selectedFeature;
    const district = props.district || props.name || 'Selected District';
    const analysisItem = activeAnalysis?.items?.find((it: any) =>
      it.featureName?.toLowerCase() === district.toLowerCase() || String(it.featureId) === String(selectedFeature.id)
    );

    let text = `### Analysis for ${district}\n\n`;
    text += `- **Administrative Division:** ${props.division || 'N/A'}\n`;
    text += `- **Area:** ${props.area_sq_km ? props.area_sq_km.toLocaleString() + ' sq km' : 'N/A'}\n`;
    text += `- **Annual Rainfall:** ${props.annual_rainfall_mm ? props.annual_rainfall_mm + ' mm' : 'N/A'}\n`;
    text += `- **Soil Fertility Index:** ${props.soil_fertility_index ?? 'N/A'}/100\n`;
    text += `- **Road Connectivity:** ${props.road_connectivity_index ?? 'N/A'}/100\n`;
    text += `- **Flood Risk Score:** ${props.flood_risk_score ?? 'N/A'}/100\n\n`;

    if (analysisItem) {
      text += `#### MCDA Suitability Position:\n`;
      text += `- **Suitability Score:** **${analysisItem.finalScore}/100** (Grade: **${analysisItem.grade}**)\n`;
      text += `- **State-wide Rank:** **#${analysisItem.rank}** out of ${activeAnalysis.items.length} districts\n\n`;
      text += `**Criterion Contributions:**\n`;
      Object.entries(analysisItem.normalizedScores).forEach(([k, score]) => {
        text += `- *${k}*: ${score}/100 (raw: ${analysisItem.rawValues[k]})\n`;
      });
    } else {
      text += `*Note: Run an MCDA suitability model from the left sidebar to see specific ranked suitability scores for ${district}.*`;
    }
    return text;
  }

  // Top / Best Districts Question
  if (q.includes('top') || q.includes('best') || q.includes('highest') || q.includes('rank') || q.includes('winner')) {
    if (!activeAnalysis) {
      return `### Top Districts Overview\n\nNo Multi-Criteria Decision Analysis (MCDA) has been run yet.\n\nTo view the top-ranking districts:\n1. Open the **MCDA Suitability** tab on the left.\n2. Choose a pre-configured preset (such as *Paddy Cultivation* or *Cold Storage Hub*).\n3. Adjust the weights according to your priorities and click **Calculate Suitability**.\n\nThe system will dynamically compute weighted normalized scores for all 23 districts of West Bengal and generate an interactive thematic map!`;
    }

    const items = activeAnalysis.items || [];
    const top3 = items.slice(0, 3);
    let resp = `### Top Ranked Districts (${activeAnalysis.name})\n\n`;
    resp += `Based on the active Weighted Linear Combination (WLC) model, the top districts are:\n\n`;
    top3.forEach((item: any, i: number) => {
      resp += `${i + 1}. **${item.featureName}** — **Score: ${item.finalScore}/100** (Rank #${item.rank}, Tier: *${item.grade}*)\n`;
    });

    resp += `\n**Key Driving Factors:**\n`;
    const topCrit = [...activeAnalysis.criteria].sort((a: any, b: any) => b.weight - a.weight)[0];
    if (topCrit) {
      resp += `- Heaviest assigned weight was **${topCrit.label}** (${topCrit.weight}% weight, ${topCrit.direction.toUpperCase()} direction).\n`;
      resp += `- Top candidates scored exceptionally well on ${topCrit.label} and balanced favorable logistics/climate parameters.\n`;
    }
    resp += `\n*Notice: The dataset values are synthetic models created for simulation purposes.*`;
    return resp;
  }

  // Lowest / Vulnerable Districts Question
  if (q.includes('bottom') || q.includes('lowest') || q.includes('worst') || q.includes('vulnerable') || q.includes('least')) {
    if (!activeAnalysis) {
      return `Please run an MCDA analysis first to identify lowest scoring or highest risk districts.`;
    }

    const items = activeAnalysis.items || [];
    const bottom3 = items.slice(-3).reverse();
    let resp = `### Lowest Scoring Districts (${activeAnalysis.name})\n\n`;
    bottom3.forEach((item: any, i: number) => {
      resp += `${i + 1}. **${item.featureName}** — **Score: ${item.finalScore}/100** (Rank #${item.rank}, Tier: *${item.grade}*)\n`;
    });
    resp += `\n**Primary Bottlenecks:**\n`;
    resp += `- Severe penalties on cost criteria (e.g. flood inundation risks or extreme transport distance) or low normalized values on heavy benefit factors.\n`;
    return resp;
  }

  // Methodology / Math Formula Question
  if (q.includes('formula') || q.includes('method') || q.includes('math') || q.includes('how') || q.includes('calculate') || q.includes('mcda') || q.includes('normalize')) {
    return `### Multi-Criteria Decision Analysis (MCDA) Methodology

Bengal GeoAI employs a standard **Weighted Linear Combination (WLC)** spatial decision model:

1. **Min-Max Linear Normalization ($r_{ij}$):**
   - **Benefit criteria** (higher is better, e.g. Soil Fertility, Rainfall):
     $$r_{ij} = \\frac{x_{ij} - \\min_j}{\\max_j - \\min_j} \\times 100$$
   - **Cost criteria** (lower is better, e.g. Flood Risk, Market Distance):
     $$r_{ij} = \\frac{\\max_j - x_{ij}}{\\max_j - \\min_j} \\times 100$$

2. **Weight Normalization ($W_j$):**
   $$W_j = \\frac{w_j}{\\sum_{k=1}^m w_k} \\quad \\left(\\sum W_j = 1.0\\right)$$

3. **Composite Suitability Aggregation ($S_i$):**
   $$S_i = \\sum_{j=1}^m W_j \\times r_{ij}$$

4. **Classification Tiers:**
   - **Very High:** $\\ge 80$ (Emerald)
   - **High:** $60 - 79.9$ (Cyan)
   - **Moderate:** $40 - 59.9$ (Amber)
   - **Low:** $20 - 39.9$ (Orange)
   - **Very Low:** $< 20$ (Rose Red)`;
  }

  // General Dataset Overview
  return `### Bengal GeoAI Spatial Assistant

I am your geospatial intelligence assistant for West Bengal spatial analytics.

**Active Dataset Status:**
- Region: **West Bengal, India**
- Administrative Coverage: **23 Districts** (Himalayan North, Gangetic Plains, Rarh, Western Plateau, Sundarbans Coastal)
- Primary Numeric Indicators: Soil Fertility, Annual Rainfall, Groundwater Table, Road Density, Market Distance, Flood Risk, Power Grid Reliability.
${activeAnalysis ? `- Current MCDA Model: **${activeAnalysis.name}** with **${activeAnalysis.criteria.length} criteria**.` : '- No active MCDA model running. Select a preset or customize weights in the left panel.'}

**Suggested Questions to Ask:**
- *"Which district ranked #1 and what are the main reasons?"*
- *"Show me the bottom 3 districts with lowest suitability."*
- *"Explain the MCDA formula and Min-Max normalization."*
- *"Click any district on the map and ask me for a detailed breakdown!"*

*Data Notice: The district polygons represent authentic administrative boundaries of West Bengal. The socio-economic and agro-climatic values are synthetic models designed for prototyping spatial analysis workflows.*`;
}

// Development and Production Server Setup
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bengal GeoAI Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
