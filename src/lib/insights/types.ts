export interface WeatherData {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  rain: number;
  windSpeed: number;
}

export interface RainForecast {
  totalRainMm: number;
  hoursWithRain: number;
}

export interface AirQualityData {
  pm2_5: number;
  pm10: number;
  carbonMonoxide: number;
  carbonDioxide: number;
  methane: number;
  nitrogenDioxide: number;
  sulphurDioxide: number;
  ozone: number;
  usAqi: number;
}

export interface FloodRiskData {
  riverDischarge: number;
  riverDischargeMax: number;
  riverDischargeMin: number;
  riverDischargeMedian: number;
  isElevated: boolean;
  riskLevel: "low" | "moderate" | "high" | "extreme";
}

export interface FloodContext {
  isInFloodZone: boolean;
  floodZones: {
    name: string;
    hazardLevel: "low" | "medium" | "high";
  }[];
  nearbyFloodZones: {
    name: string;
    hazardLevel: "low" | "medium" | "high";
  }[];
  riverDischarge: FloodRiskData | null;
}

export interface NearbyReport {
  id: string;
  categoryId: string;
  distance: number;
  description: string;
  createdAt: string;
}

export interface InsightContext {
  weather: WeatherData | null;
  rainForecast: RainForecast | null;
  airQuality: AirQualityData | null;
  flood: FloodContext;
  nearbyReports: NearbyReport[];
}

export type InsightSeverity = "info" | "warning" | "critical";

export interface Insight {
  id?: string;
  pinId: string | null;
  type: "waste_flood" | "carbon_emission" | "pattern";
  severity: InsightSeverity;
  priorityScore: number;
  title: string;
  body: string;
  recommendation: string;
  citizenTip: string;
  riskFactors: string[];
  lat: number;
  lng: number;
  municipality: string | null;
  createdAt?: string;
}

export interface MunicipalityReportInput {
  municipality: string;
  total: number;
  active: number;
  resolved: number;
  resolutionRate: number;
  categoryBreakdown: { categoryId: string; label: string; count: number; percentage: number }[];
  recentDescriptions: { category: string; description: string; status: string; createdAt: string }[];
  locationClusters: { area: string; count: number; topCategories: string[] }[];
}

export interface MunicipalityReport {
  overallAssessment: string;
  biggestProblems: { issue: string; severity: string; explanation: string }[];
  locationHotspots: { area: string; concern: string; recommendation: string }[];
  congestionAnalysis: string;
  resolutionPerformance: string;
  recommendations: { priority: number; action: string; rationale: string }[];
}

export interface AirQualityAlert {
  level: "good" | "moderate" | "unhealthy_sensitive" | "unhealthy" | "very_unhealthy" | "hazardous";
  aqi: number;
  dominantPollutant: string;
  message: string;
  recommendation: string;
  isAbnormal: boolean;
  carbonMonoxide: number;
  carbonDioxide: number;
  methane: number;
}
