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

/**
 * Static flood zone data for Metro Manila.
 * Sourced from NOAH/MGB documented flood-prone areas.
 * Each zone is a simplified polygon (array of [lng, lat] coordinates)
 * with a hazard level (low / medium / high).
 *
 * For production: replace with LIPAD WFS or MGB FeatureServer queries.
 */

export interface FloodZone {
  id: string;
  name: string;
  hazardLevel: "low" | "medium" | "high";
  polygon: [number, number][]; // [lng, lat][]
}

export const FLOOD_ZONES: FloodZone[] = [
  // Marikina River Basin — historically severe flooding
  {
    id: "marikina-river-1",
    name: "Marikina River Basin (Provident Village - Tumana)",
    hazardLevel: "high",
    polygon: [
      [121.0980, 14.6350],
      [121.1050, 14.6350],
      [121.1050, 14.6500],
      [121.0980, 14.6500],
      [121.0980, 14.6350],
    ],
  },
  {
    id: "marikina-river-2",
    name: "Marikina River Basin (Sto. Niño - Nangka)",
    hazardLevel: "high",
    polygon: [
      [121.0900, 14.6200],
      [121.1020, 14.6200],
      [121.1020, 14.6350],
      [121.0900, 14.6350],
      [121.0900, 14.6200],
    ],
  },
  // Pasig River lowlands
  {
    id: "pasig-river-1",
    name: "Pasig River Lowlands (Mandaluyong-Pasig)",
    hazardLevel: "medium",
    polygon: [
      [121.0350, 14.5700],
      [121.0650, 14.5700],
      [121.0650, 14.5850],
      [121.0350, 14.5850],
      [121.0350, 14.5700],
    ],
  },
  // Tullahan River corridor
  {
    id: "tullahan-river",
    name: "Tullahan River Corridor (Malabon-Navotas-Valenzuela)",
    hazardLevel: "high",
    polygon: [
      [120.9500, 14.6600],
      [120.9900, 14.6600],
      [120.9900, 14.6850],
      [120.9500, 14.6850],
      [120.9500, 14.6600],
    ],
  },
  // San Juan River
  {
    id: "san-juan-river",
    name: "San Juan River Corridor",
    hazardLevel: "medium",
    polygon: [
      [121.0250, 14.5900],
      [121.0500, 14.5900],
      [121.0500, 14.6100],
      [121.0250, 14.6100],
      [121.0250, 14.5900],
    ],
  },
  // Manila Bay coastal areas
  {
    id: "manila-bay-coastal",
    name: "Manila Bay Coastal (Tondo-Baseco-Port Area)",
    hazardLevel: "high",
    polygon: [
      [120.9550, 14.5800],
      [120.9750, 14.5800],
      [120.9750, 14.6150],
      [120.9550, 14.6150],
      [120.9550, 14.5800],
    ],
  },
  // Quezon City low-lying areas
  {
    id: "qc-lowlying-1",
    name: "Quezon City (Project 6 - Bago Bantay)",
    hazardLevel: "medium",
    polygon: [
      [121.0100, 14.6450],
      [121.0300, 14.6450],
      [121.0300, 14.6600],
      [121.0100, 14.6600],
      [121.0100, 14.6450],
    ],
  },
  {
    id: "qc-lowlying-2",
    name: "Quezon City (Bagong Silangan - Payatas)",
    hazardLevel: "medium",
    polygon: [
      [121.0900, 14.6800],
      [121.1100, 14.6800],
      [121.1100, 14.7050],
      [121.0900, 14.7050],
      [121.0900, 14.6800],
    ],
  },
  // Laguna Lake lakeshore
  {
    id: "laguna-lakeshore",
    name: "Laguna Lake Shore (Taguig-Muntinlupa)",
    hazardLevel: "medium",
    polygon: [
      [121.0500, 14.4600],
      [121.0900, 14.4600],
      [121.0900, 14.4900],
      [121.0500, 14.4900],
      [121.0500, 14.4600],
    ],
  },
  // Caloocan low areas
  {
    id: "caloocan-low",
    name: "Caloocan (Dagat-dagatan - Camarin)",
    hazardLevel: "medium",
    polygon: [
      [120.9700, 14.6700],
      [121.0050, 14.6700],
      [121.0050, 14.7000],
      [120.9700, 14.7000],
      [120.9700, 14.6700],
    ],
  },
  // Paranaque-Las Pinas coastal
  {
    id: "paranaque-coastal",
    name: "Parañaque-Las Piñas Coastal",
    hazardLevel: "low",
    polygon: [
      [120.9700, 14.4600],
      [121.0100, 14.4600],
      [121.0100, 14.4900],
      [120.9700, 14.4900],
      [120.9700, 14.4600],
    ],
  },
  // Makati low areas near Pasig River
  {
    id: "makati-pasig-riverbank",
    name: "Makati (Guadalupe - Rockwell area)",
    hazardLevel: "low",
    polygon: [
      [121.0300, 14.5550],
      [121.0500, 14.5550],
      [121.0500, 14.5700],
      [121.0300, 14.5700],
      [121.0300, 14.5550],
    ],
  },
];

/**
 * Point-in-polygon test using ray casting algorithm.
 * polygon is an array of [lng, lat] pairs, first and last point should be the same.
 */
export function isPointInPolygon(
  lng: number,
  lat: number,
  polygon: [number, number][]
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0],
      yi = polygon[i][1];
    const xj = polygon[j][0],
      yj = polygon[j][1];

    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Find which flood zones a given point falls within.
 * Returns all matching zones sorted by hazard severity (high first).
 */
export function getFloodZonesForPoint(
  lat: number,
  lng: number
): FloodZone[] {
  const hazardOrder = { high: 0, medium: 1, low: 2 };
  return FLOOD_ZONES.filter((zone) => isPointInPolygon(lng, lat, zone.polygon)).sort(
    (a, b) => hazardOrder[a.hazardLevel] - hazardOrder[b.hazardLevel]
  );
}

/**
 * Check if a point is within a given radius (km) of any flood zone.
 * Uses haversine approximation for nearby zones.
 */
export function getFloodZonesNearPoint(
  lat: number,
  lng: number,
  radiusKm: number = 0.5
): FloodZone[] {
  const results: FloodZone[] = [];

  for (const zone of FLOOD_ZONES) {
    if (isPointInPolygon(lng, lat, zone.polygon)) {
      results.push(zone);
      continue;
    }

    // Check distance to nearest edge of polygon
    for (const [plng, plat] of zone.polygon) {
      const dist = haversineKm(lat, lng, plat, plng);
      if (dist <= radiusKm) {
        results.push(zone);
        break;
      }
    }
  }

  return results;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const WASTE_CATEGORY_IDS = [
  "illegal-dumping",
  "unsegregated-waste",
  "illegal-burning",
  "water-pollution",
];

export interface FloodWasteAlert {
  id: string;
  lat: number;
  lng: number;
  zoneName: string;
  wasteCount: number;
  hazardLevel: "low" | "medium" | "high";
}

/**
 * Convert flood zones to GeoJSON FeatureCollection for map rendering.
 * When pins are provided, computes waste density per zone to drive
 * dynamic opacity (more waste in a flood zone = more intense red).
 */
export function floodZonesToGeoJSON(
  pins?: { lat: number; lng: number; categoryId: string; status: string }[]
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: FLOOD_ZONES.map((zone) => {
      let wasteCount = 0;
      if (pins) {
        wasteCount = pins.filter(
          (p) =>
            WASTE_CATEGORY_IDS.includes(p.categoryId) &&
            p.status === "active" &&
            isPointInPolygon(p.lng, p.lat, zone.polygon)
        ).length;
      }

      return {
        type: "Feature" as const,
        properties: {
          id: zone.id,
          name: zone.name,
          hazardLevel: zone.hazardLevel,
          wasteCount,
        },
        geometry: {
          type: "Polygon" as const,
          coordinates: [zone.polygon],
        },
      };
    }),
  };
}

/**
 * Compute flood zones that meet the waste threshold.
 * Returns alert objects for zones with >= `threshold` active waste pins.
 */
export function computeFloodWasteAlerts(
  pins: { id: string; lat: number; lng: number; categoryId: string; status: string }[],
  threshold = 4
): FloodWasteAlert[] {
  const alerts: FloodWasteAlert[] = [];

  for (const zone of FLOOD_ZONES) {
    const wasteCount = pins.filter(
      (p) =>
        WASTE_CATEGORY_IDS.includes(p.categoryId) &&
        p.status === "active" &&
        isPointInPolygon(p.lng, p.lat, zone.polygon)
    ).length;

    if (wasteCount >= threshold) {
      const centroid = zone.polygon.reduce(
        (acc, [lng, lat]) => [acc[0] + lng, acc[1] + lat],
        [0, 0]
      );
      const n = zone.polygon.length - 1; // last point == first point
      alerts.push({
        id: `flood-waste-${zone.id}`,
        lng: centroid[0] / n,
        lat: centroid[1] / n,
        zoneName: zone.name,
        wasteCount,
        hazardLevel: zone.hazardLevel,
      });
    }
  }

  return alerts;
}
