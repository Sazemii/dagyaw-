import type { InsightContext } from "./types";

export function buildWasteFloodPrompt(
  categoryId: string,
  description: string,
  context: InsightContext
): string {
  const { weather, rainForecast, flood, nearbyReports } = context;

  const floodInfo = flood.isInFloodZone
    ? `CRITICAL: This location IS inside a flood zone: ${flood.floodZones.map((z) => `${z.name} (${z.hazardLevel} hazard)`).join(", ")}`
    : flood.nearbyFloodZones.length > 0
      ? `WARNING: Nearby flood zones (within 500m): ${flood.nearbyFloodZones.map((z) => `${z.name} (${z.hazardLevel})`).join(", ")}`
      : "No known flood zones nearby.";

  const riverInfo = flood.riverDischarge
    ? `River discharge: ${flood.riverDischarge.riverDischarge.toFixed(1)} m³/s (median: ${flood.riverDischarge.riverDischargeMedian.toFixed(1)}, max forecast: ${flood.riverDischarge.riverDischargeMax.toFixed(1)}). Risk level: ${flood.riverDischarge.riskLevel}`
    : "River discharge data unavailable.";

  const weatherInfo = weather
    ? `Current weather: ${weather.temperature}°C (feels ${weather.apparentTemperature}°C), humidity ${weather.humidity}%, rain ${weather.rain}mm, wind ${weather.windSpeed} km/h`
    : "Weather data unavailable.";

  const rainInfo = rainForecast
    ? `Rain forecast (48h): ${rainForecast.totalRainMm.toFixed(1)}mm total, ${rainForecast.hoursWithRain} hours with rain`
    : "Rain forecast unavailable.";

  const nearbyInfo = nearbyReports.length > 0
    ? `Nearby reports (500m, 30 days): ${nearbyReports.map((r) => `${r.categoryId} (${r.distance.toFixed(0)}m away, "${r.description}")`).join("; ")}`
    : "No nearby reports.";

  return `You are an AI analyst for Bayanihan, a community-driven urban sustainability platform in the Philippines.

A citizen just reported: "${description}"
Category: ${categoryId}
Location context:

FLOOD DATA:
${floodInfo}
${riverInfo}

WEATHER:
${weatherInfo}
${rainInfo}

NEARBY REPORTS:
${nearbyInfo}

Analyze this report and generate an actionable insight. Focus on:
1. Is there a flood contamination risk from this waste/issue?
2. Is rain coming that could worsen the situation?
3. Are there nearby reports that form a pattern?
4. What should the LGU (local government) do?
5. What tip should citizens in the area receive?

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "severity": "info" | "warning" | "critical",
  "priorityScore": 0-100,
  "title": "short alert title (max 60 chars)",
  "body": "2-3 sentence explanation of the risk and why it matters",
  "recommendation": "what should the LGU/admin do about this",
  "citizenTip": "what should citizens nearby know or do",
  "riskFactors": ["factor1", "factor2"]
}`;
}

export function buildCarbonEmissionPrompt(
  context: InsightContext,
  lat: number,
  lng: number
): string {
  const { airQuality, weather, nearbyReports } = context;

  const aqInfo = airQuality
    ? `Air Quality Index (US EPA): ${airQuality.usAqi}
CO: ${airQuality.carbonMonoxide} µg/m³
CO₂: ${airQuality.carbonDioxide} ppm
CH₄ (methane): ${airQuality.methane} ppb
NO₂: ${airQuality.nitrogenDioxide} µg/m³
SO₂: ${airQuality.sulphurDioxide} µg/m³
PM2.5: ${airQuality.pm2_5} µg/m³
PM10: ${airQuality.pm10} µg/m³
O₃: ${airQuality.ozone} µg/m³`
    : "Air quality data unavailable.";

  const weatherInfo = weather
    ? `Temperature: ${weather.temperature}°C, humidity: ${weather.humidity}%, wind: ${weather.windSpeed} km/h`
    : "";

  const nearbyInfo = nearbyReports.length > 0
    ? `Nearby citizen reports: ${nearbyReports.map((r) => `${r.categoryId} (${r.distance.toFixed(0)}m, "${r.description}")`).join("; ")}`
    : "No nearby citizen reports.";

  return `You are an AI environmental analyst for Bayanihan, monitoring greenhouse gas emissions and air quality in the Philippines.

Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}

AIR QUALITY DATA (from Open-Meteo CAMS):
${aqInfo}

WEATHER CONDITIONS:
${weatherInfo}

CITIZEN REPORTS IN AREA:
${nearbyInfo}

Analyze whether there are suspicious or abnormal carbon/greenhouse gas emissions at this location.
Consider:
1. Are any pollutant levels above WHO/EPA safe thresholds?
2. Could citizen reports (burning, industrial activity) explain elevated readings?
3. What is the health risk for people in this area?
4. What should authorities investigate?

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "severity": "info" | "warning" | "critical",
  "priorityScore": 0-100,
  "title": "short alert title (max 60 chars)",
  "body": "2-3 sentence explanation of what's abnormal and why it matters",
  "recommendation": "what should the authorities/admin investigate or do",
  "citizenTip": "health advisory for citizens in the area",
  "riskFactors": ["factor1", "factor2"]
}`;
}
