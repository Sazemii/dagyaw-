"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-map-gl/maplibre";

const USER_COLOR = "#f5c542";
const USER_COLOR_RGB = "245, 197, 66";
const CONE_RADIUS = 160;
const CONE_ANGLE = 65;
const DOT_SIZE = 20;
const SVG_SIZE = CONE_RADIUS * 2 + DOT_SIZE;
const CENTER = SVG_SIZE / 2;

// Pre-build the static parts of the SVG (cone shape at 0 degrees, rotated via CSS)
function buildStaticSVG(): string {
  // Cone pointing UP (north = -90deg in SVG coords) at heading=0
  const startRad = ((-CONE_ANGLE / 2 - 90) * Math.PI) / 180;
  const endRad = ((CONE_ANGLE / 2 - 90) * Math.PI) / 180;
  const x1 = CENTER + CONE_RADIUS * Math.cos(startRad);
  const y1 = CENTER + CONE_RADIUS * Math.sin(startRad);
  const x2 = CENTER + CONE_RADIUS * Math.cos(endRad);
  const y2 = CENTER + CONE_RADIUS * Math.sin(endRad);

  return `
    <svg width="${SVG_SIZE}" height="${SVG_SIZE}" viewBox="0 0 ${SVG_SIZE} ${SVG_SIZE}"
         class="gps-icon-svg"
         style="position:absolute;left:-${CENTER}px;top:-${CENTER}px;pointer-events:none;overflow:visible;">
      <defs>
        <radialGradient id="ug" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgb(${USER_COLOR_RGB})" stop-opacity="0.25"/>
          <stop offset="35%" stop-color="rgb(${USER_COLOR_RGB})" stop-opacity="0.12"/>
          <stop offset="70%" stop-color="rgb(${USER_COLOR_RGB})" stop-opacity="0.04"/>
          <stop offset="100%" stop-color="rgb(${USER_COLOR_RGB})" stop-opacity="0"/>
        </radialGradient>
        <filter id="dotglow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <!-- Cone (rotated via CSS on parent) -->
      <path class="gps-cone" d="M ${CENTER} ${CENTER} L ${x1} ${y1} A ${CONE_RADIUS} ${CONE_RADIUS} 0 0 1 ${x2} ${y2} Z"
            fill="url(#ug)" />

      <!-- Pulse ring -->
      <circle cx="${CENTER}" cy="${CENTER}" r="18"
              fill="none" stroke="rgb(${USER_COLOR_RGB})" stroke-width="1.5"
              class="gps-pulse-ring" />

      <!-- Ambient glow -->
      <circle cx="${CENTER}" cy="${CENTER}" r="14"
              fill="rgb(${USER_COLOR_RGB})" fill-opacity="0.1"
              filter="url(#dotglow)" />

      <!-- Outer ring -->
      <circle cx="${CENTER}" cy="${CENTER}" r="${DOT_SIZE / 2}"
              fill="rgba(${USER_COLOR_RGB}, 0.12)" stroke="rgb(${USER_COLOR_RGB})" stroke-width="2"
              stroke-opacity="0.5" />

      <!-- Inner dot -->
      <circle cx="${CENTER}" cy="${CENTER}" r="${DOT_SIZE / 2 - 3}"
              fill="${USER_COLOR}" fill-opacity="0.95"
              stroke="rgba(255,255,255,0.7)" stroke-width="1.5" />

      <!-- Specular highlight -->
      <circle cx="${CENTER - 2}" cy="${CENTER - 2}" r="2.5"
              fill="white" fill-opacity="0.55" />
    </svg>
  `;
}

// Request DeviceOrientation permission (required on iOS 13+)
async function requestOrientationPermission(): Promise<boolean> {
  const DOE = DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<"granted" | "denied">;
  };
  if (typeof DOE.requestPermission === "function") {
    try {
      const result = await DOE.requestPermission();
      return result === "granted";
    } catch {
      return false;
    }
  }
  // Android / desktop — no permission needed
  return true;
}

interface UserLocationTrackerProps {
  permissionRequested: boolean;
}

export default function UserLocationTracker({ permissionRequested }: UserLocationTrackerProps) {
  const { current: mapInstance } = useMap();
  const markerElRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const headingRef = useRef<number>(0);
  const posRef = useRef<{ lat: number; lng: number } | null>(null);
  const firstFixRef = useRef(true);
  const orientationBoundRef = useRef(false);
  const svgBuilt = useRef(false);

  // Apply heading rotation via CSS (no SVG rebuild)
  const applyRotation = useCallback(() => {
    if (!markerElRef.current) return;
    const svg = markerElRef.current.querySelector(".gps-icon-svg") as SVGElement | null;
    if (svg) {
      svg.style.transform = `rotate(${headingRef.current}deg)`;
    }
  }, []);

  // Update marker position on map
  const updatePosition = useCallback(() => {
    if (!posRef.current || !markerRef.current) return;
    markerRef.current.setLngLat([posRef.current.lng, posRef.current.lat]);
  }, []);

  // Bind orientation listeners
  const bindOrientation = useCallback(() => {
    if (orientationBoundRef.current) return;
    orientationBoundRef.current = true;

    function handleOrientation(e: DeviceOrientationEvent) {
      let heading: number | null = null;

      if ("webkitCompassHeading" in e) {
        heading = (e as DeviceOrientationEvent & { webkitCompassHeading: number })
          .webkitCompassHeading;
      } else if (e.alpha != null) {
        // Android: alpha is degrees from north
        heading = e.absolute ? (360 - e.alpha) % 360 : (360 - e.alpha) % 360;
      }

      if (heading != null && !isNaN(heading)) {
        headingRef.current = heading;
        applyRotation();
      }
    }

    // Prefer absolute orientation
    window.addEventListener("deviceorientationabsolute", handleOrientation as EventListener, true);
    window.addEventListener("deviceorientation", handleOrientation as EventListener);

    return () => {
      window.removeEventListener("deviceorientationabsolute", handleOrientation as EventListener, true);
      window.removeEventListener("deviceorientation", handleOrientation as EventListener);
      orientationBoundRef.current = false;
    };
  }, [applyRotation]);

  // When permission is requested, set up orientation
  useEffect(() => {
    if (!permissionRequested) return;

    let cleanup: (() => void) | undefined;

    requestOrientationPermission().then((granted) => {
      if (granted) {
        cleanup = bindOrientation();
      }
    });

    return () => cleanup?.();
  }, [permissionRequested, bindOrientation]);

  // Main geolocation + marker effect
  useEffect(() => {
    if (!mapInstance || !navigator.geolocation) return;

    const map = mapInstance.getMap();

    // Create marker element once
    const el = document.createElement("div");
    el.className = "user-location-icon";
    el.innerHTML = buildStaticSVG();
    markerElRef.current = el;
    svgBuilt.current = true;

    let marker: maplibregl.Marker | null = null;
    let cleanupOrientation: (() => void) | undefined;

    // Create MapLibre marker
    import("maplibre-gl").then((mgl) => {
      marker = new mgl.Marker({ element: el })
        .setLngLat([120.9842, 14.5995]) // default, will update
        .addTo(map);
      markerRef.current = marker;

      // If position already arrived, apply it
      if (posRef.current) {
        updatePosition();
      }

      // Try binding orientation immediately (works on Android without permission)
      cleanupOrientation = bindOrientation();
    });

    // Watch GPS position
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        posRef.current = { lat: latitude, lng: longitude };

        // Use GPS heading when moving
        if (pos.coords.heading != null && !isNaN(pos.coords.heading) && pos.coords.speed && pos.coords.speed > 0.5) {
          headingRef.current = pos.coords.heading;
          applyRotation();
        }

        updatePosition();

        // Fly to user on first fix
        if (firstFixRef.current) {
          firstFixRef.current = false;
          map.flyTo({
            center: [longitude, latitude],
            zoom: 16,
            duration: 1500,
          });
        }
      },
      (err) => console.warn("Geolocation error:", err.message),
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 15000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      cleanupOrientation?.();
      marker?.remove();
      markerRef.current = null;
    };
  }, [mapInstance, updatePosition, applyRotation, bindOrientation]);

  return null;
}
