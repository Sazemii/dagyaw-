"use client";

import { useCallback, useRef } from "react";
import Map, {
  Marker,
  NavigationControl,
  type MapRef,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { getCategoryById } from "./categories";
import CategoryIcon from "./CategoryIcon";
import UserLocationTracker, { type LocationStatus } from "./UserLocationTracker";
import { useTheme } from "./ThemeContext";

// --- Types ---
export interface Pin {
  id: string;
  lat: number;
  lng: number;
  categoryId: string;
  description: string;
  photoDataUrl: string;
  createdAt: Date;
}

interface MapViewProps {
  pins: Pin[];
  onMapClick?: (lat: number, lng: number) => void;
  onPinClick?: (pin: Pin) => void;
  isPlacingPin: boolean;
  locateTrigger: number;
  onLocationStatus: (status: LocationStatus) => void;
}

const CARTO_DARK_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const CARTO_LIGHT_STYLE =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

// --- Pin marker component ---
function PinMarker({ pin, onClick }: { pin: Pin; onClick?: (pin: Pin) => void }) {
  const category = getCategoryById(pin.categoryId);
  const theme = useTheme();
  if (!category) return null;

  const circleFill = theme === "dark" ? "#1a1a1a" : "#ffffff";

  return (
    <Marker longitude={pin.lng} latitude={pin.lat} anchor="bottom">
      <div className="pin-marker" onClick={(e) => { e.stopPropagation(); onClick?.(pin); }}>
        <svg
          width="40"
          height="52"
          viewBox="0 0 40 52"
          fill="none"
          className="pin-drop"
        >
          <polygon points="14,34 26,34 20,50" fill={category.color} />
          <circle
            cx="20"
            cy="19"
            r="17"
            fill={circleFill}
            stroke={category.color}
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
                color={category.color}
                size={16}
              />
            </div>
          </foreignObject>
        </svg>
      </div>
    </Marker>
  );
}

// --- Main Map Component ---
export default function MapView({
  pins,
  onMapClick,
  onPinClick,
  isPlacingPin,
  locateTrigger,
  onLocationStatus,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const theme = useTheme();

  const initialView = {
    longitude: 120.9842,
    latitude: 14.5995,
    zoom: 13,
  };

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
        // Dark mode: subtle grey roads
        if (
          id.includes("road") ||
          id.includes("bridge") ||
          id.includes("tunnel") ||
          id.includes("highway") ||
          id.includes("street") ||
          id.includes("path") ||
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
        // Light mode: darken roads for contrast
        if (
          id.includes("road") ||
          id.includes("bridge") ||
          id.includes("tunnel") ||
          id.includes("highway") ||
          id.includes("street") ||
          id.includes("path") ||
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

  return (
    <Map
      key={theme}
      ref={mapRef}
      initialViewState={initialView}
      style={{ width: "100%", height: "100vh" }}
      mapStyle={theme === "dark" ? CARTO_DARK_STYLE : CARTO_LIGHT_STYLE}
      onClick={handleClick}
      cursor={isPlacingPin ? "crosshair" : "grab"}
      onLoad={handleStyleLoad}
      attributionControl={{}}
    >
      <NavigationControl position="bottom-right" showCompass={false} />
      <UserLocationTracker locateTrigger={locateTrigger} onLocationStatus={onLocationStatus} />
      {pins.map((pin) => (
        <PinMarker key={pin.id} pin={pin} onClick={onPinClick} />
      ))}
    </Map>
  );
}
