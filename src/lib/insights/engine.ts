import type { Insight, InsightContext, InsightSeverity } from "./types";
import { fetchWeather, fetchRainForecast, fetchAirQuality, fetchFloodRisk, detectAbnormalEmissions } from "./external-apis";
import { getFloodZonesForPoint, getFloodZonesNearPoint } from "../../data/flood-zones";
import { buildWasteFloodPrompt, buildCarbonEmissionPrompt } from "./prompts";

const WASTE_CATEGORIES = [
  "illegal-dumping",
  "unsegregated-waste",
  "illegal-burning",
  "water-pollution",
];

const FLOOD_RELATED_CATEGORIES = [
  ...WASTE_CATEGORIES,
  "flooding",
  "pothole",
  "fallen-tree",
];

/**
 * Gather all external context for a given location.
 * Uses only Open-Meteo APIs (free, no key needed).
 */
export async function gatherContext(
  lat: number,
  lng: number,
  nearbyReports: InsightContext["nearbyReports"] = []
): Promise<InsightContext> {
  const [weather, rainForecast, airQuality, floodRisk] = await Promise.allSettled([
    fetchWeather(lat, lng),
    fetchRainForecast(lat, lng),
    fetchAirQuality(lat, lng),
    fetchFloodRisk(lat, lng),
  ]);

  const floodZones = getFloodZonesForPoint(lat, lng);
  const nearbyFloodZones = getFloodZonesNearPoint(lat, lng, 0.5);

  return {
    weather: weather.status === "fulfilled" ? weather.value : null,
    rainForecast: rainForecast.status === "fulfilled" ? rainForecast.value : null,
    airQuality: airQuality.status === "fulfilled" ? airQuality.value : null,
    flood: {
      isInFloodZone: floodZones.length > 0,
      floodZones: floodZones.map((z) => ({ name: z.name, hazardLevel: z.hazardLevel })),
      nearbyFloodZones: nearbyFloodZones
        .filter((z) => !floodZones.some((fz) => fz.id === z.id))
        .map((z) => ({ name: z.name, hazardLevel: z.hazardLevel })),
      riverDischarge: floodRisk.status === "fulfilled" ? floodRisk.value : null,
    },
    nearbyReports,
  };
}

/**
 * Call Groq Llama to analyze context and generate a structured insight.
 */
async function callGroqAI(prompt: string): Promise<{
  severity: InsightSeverity;
  priorityScore: number;
  title: string;
  body: string;
  recommendation: string;
  citizenTip: string;
  riskFactors: string[];
}> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY not set");
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a concise environmental risk analyst. Respond only with valid JSON, no markdown formatting.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from Groq");

  return JSON.parse(content);
}

/**
 * Generate an insight for a waste/flood cross-reference report.
 * Triggered when a citizen submits a waste-related report.
 */
export async function generateWasteFloodInsight(
  pinId: string,
  categoryId: string,
  description: string,
  lat: number,
  lng: number,
  municipality: string | null,
  nearbyReports: InsightContext["nearbyReports"] = []
): Promise<Insight | null> {
  const context = await gatherContext(lat, lng, nearbyReports);

  const hasFloodRisk =
    context.flood.isInFloodZone ||
    context.flood.nearbyFloodZones.length > 0 ||
    (context.flood.riverDischarge?.isElevated ?? false);

  const hasRainComing = (context.rainForecast?.totalRainMm ?? 0) > 10;
  const hasNearbyWaste = nearbyReports.some((r) => WASTE_CATEGORIES.includes(r.categoryId));

  const isRelevant =
    FLOOD_RELATED_CATEGORIES.includes(categoryId) &&
    (hasFloodRisk || hasRainComing || hasNearbyWaste);

  if (!isRelevant) return null;

  const prompt = buildWasteFloodPrompt(categoryId, description, context);

  try {
    const ai = await callGroqAI(prompt);

    return {
      pinId,
      type: "waste_flood",
      severity: ai.severity,
      priorityScore: ai.priorityScore,
      title: ai.title,
      body: ai.body,
      recommendation: ai.recommendation,
      citizenTip: ai.citizenTip,
      riskFactors: ai.riskFactors,
      lat,
      lng,
      municipality,
    };
  } catch (err) {
    console.error("Waste-flood insight generation failed:", err);
    return buildFallbackWasteInsight(pinId, categoryId, lat, lng, municipality, context);
  }
}

/**
 * Analyze air quality at a location for abnormal carbon/GHG emissions.
 * Can be triggered periodically or on-demand.
 */
export async function analyzeAirQuality(
  lat: number,
  lng: number,
  municipality: string | null,
  nearbyReports: InsightContext["nearbyReports"] = []
): Promise<Insight | null> {
  const context = await gatherContext(lat, lng, nearbyReports);

  if (!context.airQuality) return null;

  const emissions = detectAbnormalEmissions(context.airQuality);
  if (!emissions.isAbnormal) return null;

  const prompt = buildCarbonEmissionPrompt(context, lat, lng);

  try {
    const ai = await callGroqAI(prompt);

    return {
      pinId: null,
      type: "carbon_emission",
      severity: ai.severity,
      priorityScore: ai.priorityScore,
      title: ai.title,
      body: ai.body,
      recommendation: ai.recommendation,
      citizenTip: ai.citizenTip,
      riskFactors: ai.riskFactors,
      lat,
      lng,
      municipality,
    };
  } catch (err) {
    console.error("Carbon emission insight generation failed:", err);
    return buildFallbackCarbonInsight(lat, lng, municipality, context, emissions);
  }
}

/**
 * Fallback insight when AI is unavailable for waste/flood.
 */
function buildFallbackWasteInsight(
  pinId: string,
  categoryId: string,
  lat: number,
  lng: number,
  municipality: string | null,
  context: InsightContext
): Insight {
  const inFloodZone = context.flood.isInFloodZone;
  const rainComing = (context.rainForecast?.totalRainMm ?? 0) > 10;
  const riskFactors: string[] = [];

  if (inFloodZone) riskFactors.push("Located in flood-prone area");
  if (rainComing) riskFactors.push(`${context.rainForecast!.totalRainMm.toFixed(0)}mm rain expected`);
  if (context.flood.riverDischarge?.isElevated) riskFactors.push("Elevated river discharge");

  const severity: InsightSeverity =
    inFloodZone && rainComing ? "critical" : inFloodZone ? "warning" : "info";

  return {
    pinId,
    type: "waste_flood",
    severity,
    priorityScore: severity === "critical" ? 85 : severity === "warning" ? 60 : 35,
    title: inFloodZone
      ? "Waste in flood zone — contamination risk"
      : "Waste near drainage — monitor during rain",
    body: inFloodZone
      ? `This ${categoryId.replace(/-/g, " ")} report is inside a known flood zone. ${rainComing ? `With ${context.rainForecast!.totalRainMm.toFixed(0)}mm of rain expected, contamination risk is high.` : "During monsoon season, this waste could contaminate floodwater."}`
      : `This report is near areas prone to flooding. Monitor during heavy rainfall.`,
    recommendation: inFloodZone
      ? "Deploy cleanup crew before next rainfall. Prioritize waste removal in flood zones."
      : "Schedule routine cleanup and monitor drainage in this area.",
    citizenTip: rainComing
      ? "Heavy rain expected — avoid this area and report any drainage blockage."
      : "If you see waste accumulating near drains, report it to help prevent flooding.",
    riskFactors,
    lat,
    lng,
    municipality,
  };
}

/**
 * Fallback insight when AI is unavailable for carbon emissions.
 */
function buildFallbackCarbonInsight(
  lat: number,
  lng: number,
  municipality: string | null,
  context: InsightContext,
  emissions: { alerts: string[]; dominantPollutant: string }
): Insight {
  const severity: InsightSeverity =
    (context.airQuality?.usAqi ?? 0) > 200 ? "critical" :
    (context.airQuality?.usAqi ?? 0) > 100 ? "warning" : "info";

  return {
    pinId: null,
    type: "carbon_emission",
    severity,
    priorityScore: severity === "critical" ? 90 : severity === "warning" ? 65 : 40,
    title: `Abnormal ${emissions.dominantPollutant} levels detected`,
    body: `Air quality monitoring shows elevated pollutant levels: ${emissions.alerts.join(". ")}. Current AQI: ${context.airQuality?.usAqi ?? "unknown"}.`,
    recommendation: "Investigate potential emission sources in this area. Check for industrial activity, illegal burning, or vehicle congestion.",
    citizenTip: severity === "critical"
      ? "Air quality is hazardous. Stay indoors and wear a mask if going outside."
      : "Air quality is degraded. Sensitive groups should limit outdoor activity.",
    riskFactors: emissions.alerts,
    lat,
    lng,
    municipality,
  };
}
