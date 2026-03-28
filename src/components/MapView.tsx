"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import Map, {
  Marker,
  NavigationControl,
  Source,
  Layer,
  type MapRef,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { getCategoryById } from "./categories";
import CategoryIcon from "./CategoryIcon";
import UserLocationTracker, { type LocationStatus } from "./UserLocationTracker";
import { useTheme } from "./ThemeContext";
import { floodZonesToGeoJSON, type FloodWasteAlert } from "../data/flood-zones";
import type { Insight } from "../lib/insights/types";
import type { ProneZone } from "../lib/prone-zones";
import { proneZonesToGeoJSON, PRONE_ZONE_CONFIG } from "../lib/prone-zones";

export interface Pin {
  id: string;
  lat: number;
  lng: number;
  categoryId: string;
  description: string;
  photoUrl: string;
  status: "active" | "pending_resolved" | "resolved";
  resolvedPhotoUrl?: string;
  resolvedComment?: string;
  resolvedAt?: string;
  createdAt: string;
  municipality?: string;
  pendingResolvedAt?: string;
  pendingResolvedBy?: string;
  communityResolveRequested?: boolean;
  communityResolveBy?: string;
}

interface MapViewProps {
  pins: Pin[];
  onMapClick?: (lat: number, lng: number) => void;
  onPinClick?: (pin: Pin) => void;
  isPlacingPin: boolean;
  locateTrigger: number;
  onLocationStatus: (status: LocationStatus) => void;
  flyTarget?: { lat: number; lng: number } | null;
  highlightMunicipality?: string | null;
  showFloodZones?: boolean;
  insights?: Insight[];
  onInsightClick?: (insight: Insight) => void;
  floodAlerts?: FloodWasteAlert[];
  onFloodAlertClick?: (alert: FloodWasteAlert) => void;
  proneZones?: ProneZone[];
}

const CARTO_DARK_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const CARTO_LIGHT_STYLE =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

function PinMarker({ pin, onClick }: { pin: Pin; onClick?: (pin: Pin) => void }) {
  const category = getCategoryById(pin.categoryId);
  const theme = useTheme();
  if (!category) return null;

  const isDark = theme === "dark";
  const isResolved = pin.status === "resolved";
  const isPending = pin.status === "pending_resolved";

  const strokeColor = isResolved
    ? "#22c55e"
    : isPending
      ? "#f59e0b"
      : category.color;

  const circleFill = isResolved
    ? "#d1fae5"
    : isPending
      ? (isDark ? "#1a1500" : "#fffbeb")
      : (isDark ? "#1a1a1a" : "#ffffff");

  const opacity = isResolved ? 0.5 : 1;

  return (
    <Marker longitude={pin.lng} latitude={pin.lat} anchor="bottom">
      <div
        className="pin-marker"
        style={{ opacity }}
        onClick={(e) => { e.stopPropagation(); onClick?.(pin); }}
      >
        <svg
          width="40"
          height="52"
          viewBox="0 0 40 52"
          fill="none"
          className="pin-drop"
        >
          {isPending && (
            <circle
              cx="20"
              cy="19"
              r="17"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              className="pin-pending-pulse"
            />
          )}
          <polygon points="14,34 26,34 20,50" fill={strokeColor} />
          <circle
            cx="20"
            cy="19"
            r="17"
            fill={circleFill}
            stroke={strokeColor}
            strokeWidth="2.5"
          />
          <foreignObject x="8" y="7" width="24" height="24">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "100%",
              }}
            >
              <CategoryIcon
                iconName={category.icon}
                color={isResolved ? "#22c55e" : isPending ? "#f59e0b" : category.color}
                size={16}
              />
            </div>
          </foreignObject>
        </svg>
      </div>
    </Marker>
  );
}

function InsightMarker({
  insight,
  onClick,
}: {
  insight: Insight;
  onClick?: (insight: Insight) => void;
}) {
  const theme = useTheme();
  const isDark = theme === "dark";

  const colors = {
    info: "#3b82f6",
    warning: "#f59e0b",
    critical: "#ef4444",
  };
  const color = colors[insight.severity];
  const isCritical = insight.severity === "critical";

  return (
    <Marker longitude={insight.lng} latitude={insight.lat} anchor="center">
      <div
        className="cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onClick?.(insight); }}
      >
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          {isCritical && (
            <circle
              cx="14" cy="14" r="13"
              fill="none"
              stroke={color}
              strokeWidth="2"
              opacity="0.4"
              className="insight-pulse"
            />
          )}
          <rect
            x="4" y="4" width="20" height="20"
            rx="3"
            transform="rotate(45 14 14)"
            fill={isDark ? "#0f0f0f" : "#ffffff"}
            stroke={color}
            strokeWidth="2"
          />
          <text
            x="14" y="17"
            textAnchor="middle"
            fill={color}
            fontSize="12"
            fontWeight="bold"
          >
            {insight.type === "waste_flood" ? "!" : "⚠"}
          </text>
        </svg>
      </div>
    </Marker>
  );
}

function FloodAlertMarker({
  alert,
  onClick,
}: {
  alert: FloodWasteAlert;
  onClick?: (alert: FloodWasteAlert) => void;
}) {
  const theme = useTheme();
  const isDark = theme === "dark";

  return (
    <Marker longitude={alert.lng} latitude={alert.lat} anchor="center">
      <div
        className="cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(alert);
        }}
        title={`${alert.zoneName} — ${alert.wasteCount} waste reports`}
      >
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <circle
            cx="18" cy="18" r="16"
            fill="none" stroke="#ef4444" strokeWidth="2"
            opacity="0.5"
            className="insight-pulse"
          />
          <polygon
            points="18,4 33,30 3,30"
            fill={isDark ? "#1a0000" : "#fff5f5"}
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <text
            x="18" y="25"
            textAnchor="middle"
            fill="#ef4444"
            fontSize="16"
            fontWeight="bold"
          >
            !
          </text>
        </svg>
      </div>
    </Marker>
  );
}

function ProneZoneMarker({ zone }: { zone: ProneZone }) {
  const theme = useTheme();
  const isDark = theme === "dark";
  const config = PRONE_ZONE_CONFIG[zone.type];

  return (
    <Marker longitude={zone.lng} latitude={zone.lat} anchor="center">
      <div
        title={`${config.label}: ${zone.count} reports`}
        className="pointer-events-none"
      >
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <circle
            cx="22" cy="22" r="20"
            fill="none" stroke={config.color} strokeWidth="1.5"
            opacity="0.4"
            className="insight-pulse"
          />
          <polygon
            points="22,6 39,36 5,36"
            fill={isDark ? "#0f0f0f" : "#ffffff"}
            stroke={config.color}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <text
            x="22" y="31"
            textAnchor="middle"
            fill={config.color}
            fontSize="14"
            fontWeight="bold"
          >
            {zone.type === "pothole" ? "⚠" : "!"}
          </text>
          <text
            x="22" y="21"
            textAnchor="middle"
            fill={config.color}
            fontSize="8"
            fontWeight="bold"
          >
            {zone.count}
          </text>
        </svg>
      </div>
    </Marker>
  );
}

export default function MapView({
  pins,
  onMapClick,
  onPinClick,
  isPlacingPin,
  locateTrigger,
  onLocationStatus,
  flyTarget,
  highlightMunicipality,
  showFloodZones = false,
  insights = [],
  onInsightClick,
  floodAlerts = [],
  onFloodAlertClick,
  proneZones = [],
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const theme = useTheme();
  const boundaryAdded = useRef(false);

  const floodGeoJSON = useMemo(() => floodZonesToGeoJSON(pins), [pins]);

  const potholeZones = useMemo(
    () => proneZones.filter((z) => z.type === "pothole"),
    [proneZones]
  );
  const accidentZones = useMemo(
    () => proneZones.filter((z) => z.type === "accident"),
    [proneZones]
  );
  const potholeGeoJSON = useMemo(
    () => proneZonesToGeoJSON(potholeZones),
    [potholeZones]
  );
  const accidentGeoJSON = useMemo(
    () => proneZonesToGeoJSON(accidentZones),
    [accidentZones]
  );

  useEffect(() => {
    if (flyTarget && mapRef.current) {
      mapRef.current.flyTo({
        center: [flyTarget.lng, flyTarget.lat],
        zoom: 13,
        duration: 2000,
      });
    }
  }, [flyTarget]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !highlightMunicipality) return;

    const addBoundary = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(highlightMunicipality)},Philippines&format=json&polygon_geojson=1&limit=1`,
          { headers: { "User-Agent": "Bayanihan-App/1.0" } }
        );
        const data = await res.json();
        if (!data[0]?.geojson) return;

        const geojson = {
          type: "Feature" as const,
          properties: {},
          geometry: data[0].geojson,
        };

        if (map.getLayer("municipality-fill")) map.removeLayer("municipality-fill");
        if (map.getLayer("municipality-border")) map.removeLayer("municipality-border");
        if (map.getLayer("municipality-glow")) map.removeLayer("municipality-glow");
        if (map.getSource("municipality-boundary")) map.removeSource("municipality-boundary");

        map.addSource("municipality-boundary", {
          type: "geojson",
          data: geojson,
        });

        const isDark = theme === "dark";

        map.addLayer({
          id: "municipality-fill",
          type: "fill",
          source: "municipality-boundary",
          paint: {
            "fill-color": isDark ? "#f5c542" : "#b8860b",
            "fill-opacity": isDark ? 0.04 : 0.06,
          },
        });

        map.addLayer({
          id: "municipality-glow",
          type: "line",
          source: "municipality-boundary",
          paint: {
            "line-color": isDark ? "#f5c542" : "#b8860b",
            "line-width": 6,
            "line-opacity": isDark ? 0.15 : 0.12,
            "line-blur": 4,
          },
        });

        map.addLayer({
          id: "municipality-border",
          type: "line",
          source: "municipality-boundary",
          paint: {
            "line-color": isDark ? "#f5c542" : "#b8860b",
            "line-width": 2,
            "line-opacity": isDark ? 0.6 : 0.5,
            "line-dasharray": [3, 2],
          },
        });

        boundaryAdded.current = true;
      } catch (err) {
        console.warn("Failed to load municipality boundary:", err);
      }
    };

    if (map.isStyleLoaded()) {
      addBoundary();
    } else {
      map.once("styledata", addBoundary);
    }
  }, [highlightMunicipality, theme]);

  const initialView = {
    longitude: 121.0437,
    latitude: 14.6760,
    zoom: 13,
  };

  const maxBounds: [number, number, number, number] = [
    114.0, 4.5,
    127.0, 21.5,
  ];

  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      if (isPlacingPin && onMapClick) {
        onMapClick(e.lngLat.lat, e.lngLat.lng);
      }
    },
    [isPlacingPin, onMapClick]
  );

  const handleStyleLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const style = map.getStyle();
    if (!style?.layers) return;

    for (const layer of style.layers) {
      const id = layer.id.toLowerCase();

      if (theme === "dark") {
        if (
          id.includes("road") || id.includes("bridge") ||
          id.includes("tunnel") || id.includes("highway") ||
          id.includes("street") || id.includes("path") ||
          id.includes("link")
        ) {
          if (layer.type === "line") {
            map.setPaintProperty(layer.id, "line-color", "#999999");
            map.setPaintProperty(layer.id, "line-opacity", 0.45);
          }
        }
        if (id.includes("building") && layer.type === "fill") {
          map.setPaintProperty(layer.id, "fill-color", "#ffffff");
          map.setPaintProperty(layer.id, "fill-opacity", 0.04);
        }
        if (id.includes("water") && !id.includes("name") && layer.type === "fill") {
          map.setPaintProperty(layer.id, "fill-color", "#0c1a2e");
          map.setPaintProperty(layer.id, "fill-opacity", 0.8);
        }
        if (
          (id.includes("label") || id.includes("name") || id.includes("place")) &&
          layer.type === "symbol"
        ) {
          map.setPaintProperty(layer.id, "text-color", "#888888");
          map.setPaintProperty(layer.id, "text-halo-color", "#000000");
          map.setPaintProperty(layer.id, "text-halo-width", 1.5);
        }
        if (
          (id.includes("landuse") || id.includes("park") || id.includes("green")) &&
          layer.type === "fill"
        ) {
          map.setPaintProperty(layer.id, "fill-color", "#0a1a0a");
          map.setPaintProperty(layer.id, "fill-opacity", 0.5);
        }
      } else {
        if (
          id.includes("road") || id.includes("bridge") ||
          id.includes("tunnel") || id.includes("highway") ||
          id.includes("street") || id.includes("path") ||
          id.includes("link")
        ) {
          if (layer.type === "line") {
            map.setPaintProperty(layer.id, "line-color", "#aaaaaa");
            map.setPaintProperty(layer.id, "line-opacity", 0.8);
          }
        }
        if (id.includes("building") && layer.type === "fill") {
          map.setPaintProperty(layer.id, "fill-color", "#d4d4d4");
          map.setPaintProperty(layer.id, "fill-opacity", 0.5);
        }
        if (id.includes("water") && !id.includes("name") && layer.type === "fill") {
          map.setPaintProperty(layer.id, "fill-color", "#bfe0f5");
          map.setPaintProperty(layer.id, "fill-opacity", 0.6);
        }
        if (
          (id.includes("label") || id.includes("name") || id.includes("place")) &&
          layer.type === "symbol"
        ) {
          map.setPaintProperty(layer.id, "text-color", "#555555");
          map.setPaintProperty(layer.id, "text-halo-color", "#ffffff");
          map.setPaintProperty(layer.id, "text-halo-width", 1.5);
        }
        if (
          (id.includes("landuse") || id.includes("park") || id.includes("green")) &&
          layer.type === "fill"
        ) {
          map.setPaintProperty(layer.id, "fill-color", "#d5ecd4");
          map.setPaintProperty(layer.id, "fill-opacity", 0.4);
        }
      }
    }
  }, [theme]);

  const isDark = theme === "dark";

  return (
    <Map
      key={theme}
      ref={mapRef}
      initialViewState={initialView}
      maxBounds={maxBounds}
      style={{ width: "100%", height: "100vh" }}
      mapStyle={isDark ? CARTO_DARK_STYLE : CARTO_LIGHT_STYLE}
      onClick={handleClick}
      cursor={isPlacingPin ? "crosshair" : "grab"}
      onLoad={handleStyleLoad}
      attributionControl={{}}
    >
      <NavigationControl position="bottom-right" showCompass={false} />
      <UserLocationTracker locateTrigger={locateTrigger} onLocationStatus={onLocationStatus} />

      {/* Flood zone overlay — opacity driven by waste density */}
      {showFloodZones && (
        <Source id="flood-zones" type="geojson" data={floodGeoJSON}>
          <Layer
            id="flood-zone-fill"
            type="fill"
            paint={{
              "fill-color": [
                "match",
                ["get", "hazardLevel"],
                "high", "#ef4444",
                "medium", "#f87171",
                "low", "#fca5a5",
                "#fca5a5",
              ],
              "fill-opacity": [
                "interpolate",
                ["linear"],
                ["get", "wasteCount"],
                0, isDark ? 0.06 : 0.05,
                2, isDark ? 0.12 : 0.10,
                4, isDark ? 0.22 : 0.18,
                8, isDark ? 0.35 : 0.30,
              ],
            }}
          />
          <Layer
            id="flood-zone-border"
            type="line"
            paint={{
              "line-color": [
                "match",
                ["get", "hazardLevel"],
                "high", "#ef4444",
                "medium", "#f87171",
                "low", "#fca5a5",
                "#fca5a5",
              ],
              "line-width": [
                "interpolate",
                ["linear"],
                ["get", "wasteCount"],
                0, 1,
                4, 2.5,
                8, 3.5,
              ],
              "line-opacity": [
                "interpolate",
                ["linear"],
                ["get", "wasteCount"],
                0, isDark ? 0.25 : 0.2,
                4, isDark ? 0.6 : 0.5,
                8, isDark ? 0.8 : 0.7,
              ],
              "line-dasharray": [4, 2],
            }}
          />
        </Source>
      )}

      {/* Flood waste alert markers (>= threshold) */}
      {showFloodZones &&
        floodAlerts.map((alert) => (
          <FloodAlertMarker
            key={alert.id}
            alert={alert}
            onClick={onFloodAlertClick}
          />
        ))}

      {/* Pothole-prone zone overlays */}
      {potholeZones.length > 0 && (
        <Source id="pothole-zones" type="geojson" data={potholeGeoJSON}>
          <Layer
            id="pothole-zone-fill"
            type="fill"
            paint={{
              "fill-color": PRONE_ZONE_CONFIG.pothole.color,
              "fill-opacity": isDark ? 0.12 : 0.10,
            }}
          />
          <Layer
            id="pothole-zone-border"
            type="line"
            paint={{
              "line-color": PRONE_ZONE_CONFIG.pothole.color,
              "line-width": 2,
              "line-opacity": isDark ? 0.5 : 0.4,
              "line-dasharray": [6, 3],
            }}
          />
        </Source>
      )}

      {/* Accident-prone zone overlays */}
      {accidentZones.length > 0 && (
        <Source id="accident-zones" type="geojson" data={accidentGeoJSON}>
          <Layer
            id="accident-zone-fill"
            type="fill"
            paint={{
              "fill-color": PRONE_ZONE_CONFIG.accident.color,
              "fill-opacity": isDark ? 0.12 : 0.10,
            }}
          />
          <Layer
            id="accident-zone-border"
            type="line"
            paint={{
              "line-color": PRONE_ZONE_CONFIG.accident.color,
              "line-width": 2,
              "line-opacity": isDark ? 0.5 : 0.4,
              "line-dasharray": [6, 3],
            }}
          />
        </Source>
      )}

      {/* Prone zone center markers */}
      {proneZones.map((zone) => (
        <ProneZoneMarker key={zone.id} zone={zone} />
      ))}

      {pins.map((pin) => (
        <PinMarker key={pin.id} pin={pin} onClick={onPinClick} />
      ))}

      {insights.map((insight, i) => (
        <InsightMarker
          key={insight.id ?? `insight-${i}`}
          insight={insight}
          onClick={onInsightClick}
        />
      ))}
    </Map>
  );
}
