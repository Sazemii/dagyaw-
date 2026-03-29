/**
 * ==================================================================================
 * Team Smart Dito sa Globe (SDG)
 * BLUE HACKS 2026: GENERATIVE AI DISCLOSURE
 * * This code was created with the assistance of AI tools such as:
 * - Claude 4.6 Opus (Anthropic)
 * - GPT 5.3 - Codex (OpenAI)
 * - Claude Gemini 3.1 Pro (Google)
 * * Purpose: This AI was utilized for code generation (logic and functions), 
 * brainstorming, code refinement (debugging), and performance optimization.
 * ==================================================================================
 */

import type { WeatherData, AirQualityData, RainForecast, FloodRiskData } from "./types";

const OPEN_METEO_WEATHER = "https://api.open-meteo.com/v1/forecast";
const OPEN_METEO_AQ = "https://air-quality-api.open-meteo.com/v1/air-quality";
const OPEN_METEO_FLOOD = "https://flood-api.open-meteo.com/v1/flood";

export async function fetchWeather(
  lat: number,
  lng: number
): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,rain,wind_speed_10m",
    forecast_days: "1",
    timezone: "Asia/Manila",
  });

  const res = await fetch(`${OPEN_METEO_WEATHER}?${params}`);
  if (!res.ok) throw new Error(`Weather API failed: ${res.status}`);

  const data = await res.json();
  const c = data.current;

  return {
    temperature: c.temperature_2m,
    apparentTemperature: c.apparent_temperature,
    humidity: c.relative_humidity_2m,
    rain: c.rain,
    windSpeed: c.wind_speed_10m,
  };
}

export async function fetchRainForecast(
  lat: number,
  lng: number
): Promise<RainForecast> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    hourly: "rain",
    forecast_days: "2",
    timezone: "Asia/Manila",
  });

  const res = await fetch(`${OPEN_METEO_WEATHER}?${params}`);
  if (!res.ok) throw new Error(`Rain forecast API failed: ${res.status}`);

  const data = await res.json();
  const hourlyRain: number[] = data.hourly?.rain ?? [];

  return {
    totalRainMm: hourlyRain.reduce((sum, r) => sum + r, 0),
    hoursWithRain: hourlyRain.filter((r) => r > 0).length,
  };
}

/**
 * Fetch air quality including greenhouse gas indicators.
 * Open-Meteo Air Quality API provides CO, CO2, CH4, PM2.5, PM10, NO2, SO2, O3.
 * All free, no API key needed.
 */
export async function fetchAirQuality(
  lat: number,
  lng: number
): Promise<AirQualityData> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    current: [
      "pm2_5",
      "pm10",
      "carbon_monoxide",
      "carbon_dioxide",
      "methane",
      "nitrogen_dioxide",
      "sulphur_dioxide",
      "ozone",
      "us_aqi",
    ].join(","),
    timezone: "Asia/Manila",
  });

  const res = await fetch(`${OPEN_METEO_AQ}?${params}`);
  if (!res.ok) throw new Error(`Air quality API failed: ${res.status}`);

  const data = await res.json();
  const c = data.current;

  return {
    pm2_5: c.pm2_5 ?? 0,
    pm10: c.pm10 ?? 0,
    carbonMonoxide: c.carbon_monoxide ?? 0,
    carbonDioxide: c.carbon_dioxide ?? 0,
    methane: c.methane ?? 0,
    nitrogenDioxide: c.nitrogen_dioxide ?? 0,
    sulphurDioxide: c.sulphur_dioxide ?? 0,
    ozone: c.ozone ?? 0,
    usAqi: c.us_aqi ?? 0,
  };
}

/**
 * Fetch river discharge data from Open-Meteo Flood API (GloFAS v4).
 * 5km resolution, daily data, 7-month forecast.
 * The API may not always find a river at the exact coordinates —
 * adjusting by 0.1° can help.
 */
export async function fetchFloodRisk(
  lat: number,
  lng: number
): Promise<FloodRiskData> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    daily: "river_discharge,river_discharge_max,river_discharge_min,river_discharge_median",
    forecast_days: "7",
  });

  const res = await fetch(`${OPEN_METEO_FLOOD}?${params}`);
  if (!res.ok) throw new Error(`Flood API failed: ${res.status}`);

  const data = await res.json();
  const daily = data.daily;

  if (!daily?.river_discharge?.length) {
    return {
      riverDischarge: 0,
      riverDischargeMax: 0,
      riverDischargeMin: 0,
      riverDischargeMedian: 0,
      isElevated: false,
      riskLevel: "low",
    };
  }

  const currentDischarge = daily.river_discharge[0] ?? 0;
  const maxDischarge = Math.max(...(daily.river_discharge_max ?? [0]));
  const minDischarge = Math.min(...(daily.river_discharge_min ?? [0]));
  const medianDischarge = daily.river_discharge_median?.[0] ?? 0;

  const ratio = medianDischarge > 0 ? currentDischarge / medianDischarge : 0;

  let riskLevel: FloodRiskData["riskLevel"] = "low";
  if (ratio > 5) riskLevel = "extreme";
  else if (ratio > 3) riskLevel = "high";
  else if (ratio > 1.5) riskLevel = "moderate";

  return {
    riverDischarge: currentDischarge,
    riverDischargeMax: maxDischarge,
    riverDischargeMin: minDischarge,
    riverDischargeMedian: medianDischarge,
    isElevated: ratio > 1.5,
    riskLevel,
  };
}

export function classifyAqi(aqi: number): {
  level: string;
  label: string;
  color: string;
  isAbnormal: boolean;
} {
  if (aqi <= 50)
    return { level: "good", label: "Good", color: "#22c55e", isAbnormal: false };
  if (aqi <= 100)
    return { level: "moderate", label: "Moderate", color: "#a16207", isAbnormal: false };
  if (aqi <= 150)
    return {
      level: "unhealthy_sensitive",
      label: "Unhealthy for Sensitive Groups",
      color: "#92400e",
      isAbnormal: true,
    };
  if (aqi <= 200)
    return { level: "unhealthy", label: "Unhealthy", color: "#78350f",  isAbnormal: true };
  if (aqi <= 300)
    return {
      level: "very_unhealthy",
      label: "Very Unhealthy",
      color: "#713f12",
      isAbnormal: true,
    };
  return { level: "hazardous", label: "Hazardous", color: "#451a03", isAbnormal: true };
}

/**
 * Detect abnormal greenhouse gas levels.
 * Thresholds based on WHO/EPA guidelines.
 */
export function detectAbnormalEmissions(aq: AirQualityData): {
  isAbnormal: boolean;
  alerts: string[];
  dominantPollutant: string;
} {
  const alerts: string[] = [];
  let dominant = "none";
  let worstRatio = 0;

  // CO threshold: > 10,000 µg/m³ is concerning (WHO 8-hour mean)
  if (aq.carbonMonoxide > 10000) {
    alerts.push(`Carbon monoxide elevated: ${Math.round(aq.carbonMonoxide)} µg/m³`);
    const ratio = aq.carbonMonoxide / 10000;
    if (ratio > worstRatio) { worstRatio = ratio; dominant = "CO"; }
  }

  // PM2.5 threshold: > 35 µg/m³ is unhealthy (EPA 24-hour)
  if (aq.pm2_5 > 35) {
    alerts.push(`PM2.5 elevated: ${Math.round(aq.pm2_5)} µg/m³`);
    const ratio = aq.pm2_5 / 35;
    if (ratio > worstRatio) { worstRatio = ratio; dominant = "PM2.5"; }
  }

  // NO2 threshold: > 200 µg/m³ is dangerous (WHO 1-hour)
  if (aq.nitrogenDioxide > 200) {
    alerts.push(`NO₂ elevated: ${Math.round(aq.nitrogenDioxide)} µg/m³`);
    const ratio = aq.nitrogenDioxide / 200;
    if (ratio > worstRatio) { worstRatio = ratio; dominant = "NO2"; }
  }

  // SO2 threshold: > 500 µg/m³ is very dangerous (WHO 10-min)
  if (aq.sulphurDioxide > 500) {
    alerts.push(`SO₂ elevated: ${Math.round(aq.sulphurDioxide)} µg/m³`);
    const ratio = aq.sulphurDioxide / 500;
    if (ratio > worstRatio) { worstRatio = ratio; dominant = "SO2"; }
  }

  // PM10 threshold: > 150 µg/m³ is unhealthy (EPA 24-hour)
  if (aq.pm10 > 150) {
    alerts.push(`PM10 elevated: ${Math.round(aq.pm10)} µg/m³`);
    const ratio = aq.pm10 / 150;
    if (ratio > worstRatio) { worstRatio = ratio; dominant = "PM10"; }
  }

  // CO2 threshold: > 450 ppm is elevated (ambient is ~420 ppm)
  if (aq.carbonDioxide > 450) {
    alerts.push(`CO₂ above normal: ${Math.round(aq.carbonDioxide)} ppm`);
    const ratio = aq.carbonDioxide / 450;
    if (ratio > worstRatio) { worstRatio = ratio; dominant = "CO2"; }
  }

  // Methane threshold: > 2000 ppb is elevated (ambient is ~1900 ppb)
  if (aq.methane > 2000) {
    alerts.push(`Methane above normal: ${Math.round(aq.methane)} ppb`);
    const ratio = aq.methane / 2000;
    if (ratio > worstRatio) { worstRatio = ratio; dominant = "CH4"; }
  }

  return {
    isAbnormal: alerts.length > 0,
    alerts,
    dominantPollutant: dominant,
  };
}
