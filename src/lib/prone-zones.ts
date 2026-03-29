import type { Pin } from "../components/MapView";

export interface ProneZone {
  id: string;
  type: "pothole" | "accident";
  lat: number;
  lng: number;
  count: number;
  radiusKm: number;
  pinIds: string[];
}

const ACCIDENT_CATEGORIES = [
  "broken-streetlight",
  "traffic-light",
  "fallen-tree",
  "unsafe-structure",
];

const POTHOLE_CATEGORIES = ["pothole"];

export const PRONE_ZONE_CONFIG = {
  pothole: {
    categories: POTHOLE_CATEGORIES,
    threshold: 5,
    radiusKm: 0.4,
    color: "#fb923c",
    label: "Pothole-Prone Area",
    icon: "road",
  },
  accident: {
    categories: ACCIDENT_CATEGORIES,
    threshold: 5,
    radiusKm: 0.4,
    color: "#f87171",
    label: "Accident-Prone Area",
    icon: "warning",
  },
} as const;

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

/**
 * Detect clusters of related pins that indicate a prone area.
 * Uses greedy density-first clustering: starts from the pin with the most
 * neighbors, absorbs all within radius, repeats until no cluster meets threshold.
 */
export function computeProneZones(
  pins: Pin[],
  type: "pothole" | "accident"
): ProneZone[] {
  const config = PRONE_ZONE_CONFIG[type];
  const relevantPins = pins.filter(
    (p) => config.categories.includes(p.categoryId) && p.status === "active"
  );

  if (relevantPins.length < config.threshold) return [];

  const pinDensity = relevantPins.map((pin) => ({
    pin,
    neighborCount: relevantPins.filter(
      (p) =>
        p.id !== pin.id &&
        haversineKm(pin.lat, pin.lng, p.lat, p.lng) <= config.radiusKm
    ).length,
  }));
  pinDensity.sort((a, b) => b.neighborCount - a.neighborCount);

  const zones: ProneZone[] = [];
  const usedPins = new Set<string>();

  for (const { pin } of pinDensity) {
    if (usedPins.has(pin.id)) continue;

    const nearby = relevantPins.filter(
      (p) =>
        !usedPins.has(p.id) &&
        haversineKm(pin.lat, pin.lng, p.lat, p.lng) <= config.radiusKm
    );

    if (nearby.length >= config.threshold) {
      const centroidLat =
        nearby.reduce((s, p) => s + p.lat, 0) / nearby.length;
      const centroidLng =
        nearby.reduce((s, p) => s + p.lng, 0) / nearby.length;

      for (const p of nearby) usedPins.add(p.id);

      zones.push({
        id: `${type}-zone-${zones.length}`,
        type,
        lat: centroidLat,
        lng: centroidLng,
        count: nearby.length,
        radiusKm: config.radiusKm,
        pinIds: nearby.map((p) => p.id),
      });
    }
  }

  return zones;
}

function createCirclePolygon(
  centerLng: number,
  centerLat: number,
  radiusKm: number,
  numPoints = 64
): [number, number][] {
  const coords: [number, number][] = [];
  const radiusDeg = radiusKm / 111.32;

  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    const lng =
      centerLng +
      (radiusDeg * Math.cos(angle)) /
        Math.cos((centerLat * Math.PI) / 180);
    const lat = centerLat + radiusDeg * Math.sin(angle);
    coords.push([lng, lat]);
  }

  return coords;
}

export function proneZonesToGeoJSON(
  zones: ProneZone[]
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: zones.map((zone) => ({
      type: "Feature" as const,
      properties: {
        id: zone.id,
        type: zone.type,
        count: zone.count,
        label: PRONE_ZONE_CONFIG[zone.type].label,
        color: PRONE_ZONE_CONFIG[zone.type].color,
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [createCirclePolygon(zone.lng, zone.lat, zone.radiusKm)],
      },
    })),
  };
}
