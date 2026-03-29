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

"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-map-gl/maplibre";

export type LocationStatus =
  | "idle"
  | "requesting"
  | "active"
  | "denied"
  | "unavailable"
  | "error";

const USER_COLOR = "#f5c542";
const USER_COLOR_RGB = "245, 197, 66";
const CONE_RADIUS = 160;
const CONE_ANGLE = 65;
const DOT_SIZE = 20;
const SVG_SIZE = CONE_RADIUS * 2 + DOT_SIZE;
const CENTER = SVG_SIZE / 2;

function buildStaticSVG(): string {
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
  return true;
}

interface UserLocationTrackerProps {
  locateTrigger: number;
  onLocationStatus: (status: LocationStatus) => void;
  onLocation?: (lat: number, lng: number) => void;
}

export default function UserLocationTracker({
  locateTrigger,
  onLocationStatus,
  onLocation,
}: UserLocationTrackerProps) {
  const { current: mapInstance } = useMap();
  const markerElRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const headingRef = useRef<number>(0);
  const posRef = useRef<{ lat: number; lng: number } | null>(null);
  const animPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const targetPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastFixTimeRef = useRef<number>(0);
  const firstFixRef = useRef(true);
  const orientationBoundRef = useRef(false);
  const watchIdRef = useRef<number | null>(null);
  const statusRef = useRef<LocationStatus>("idle");

  const setStatus = useCallback(
    (s: LocationStatus) => {
      statusRef.current = s;
      onLocationStatus(s);
    },
    [onLocationStatus],
  );

  const applyRotation = useCallback(() => {
    if (!markerElRef.current) return;
    const svg = markerElRef.current.querySelector(
      ".gps-icon-svg",
    ) as SVGElement | null;
    if (svg) {
      svg.style.transform = `rotate(${headingRef.current}deg)`;
    }
  }, []);

  const lerp = useCallback(
    (a: number, b: number, t: number) => a + (b - a) * t,
    [],
  );

  const animatePosition = useCallback(() => {
    if (!animPosRef.current || !targetPosRef.current || !markerRef.current)
      return;

    const ANIM_DURATION = 1000;
    const elapsed = performance.now() - lastFixTimeRef.current;
    const t = Math.min(elapsed / ANIM_DURATION, 1);
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const lat = lerp(animPosRef.current.lat, targetPosRef.current.lat, eased);
    const lng = lerp(animPosRef.current.lng, targetPosRef.current.lng, eased);

    markerRef.current.setLngLat([lng, lat]);

    if (t < 1) {
      animFrameRef.current = requestAnimationFrame(animatePosition);
    } else {
      animPosRef.current = { ...targetPosRef.current };
      animFrameRef.current = null;
    }
  }, [lerp]);

  const updatePosition = useCallback(() => {
    if (!posRef.current || !markerRef.current) return;

    if (!animPosRef.current) {
      animPosRef.current = { ...posRef.current };
      markerRef.current.setLngLat([posRef.current.lng, posRef.current.lat]);
      return;
    }

    targetPosRef.current = { ...posRef.current };
    lastFixTimeRef.current = performance.now();

    if (animFrameRef.current != null) {
      cancelAnimationFrame(animFrameRef.current);
    }
    animFrameRef.current = requestAnimationFrame(animatePosition);
  }, [animatePosition]);

  const bindOrientation = useCallback(() => {
    if (orientationBoundRef.current) return;
    orientationBoundRef.current = true;

    function handleOrientation(e: DeviceOrientationEvent) {
      let heading: number | null = null;

      if ("webkitCompassHeading" in e) {
        heading = (
          e as DeviceOrientationEvent & { webkitCompassHeading: number }
        ).webkitCompassHeading;
      } else if (e.alpha != null) {
        heading = (360 - e.alpha) % 360;
      }

      if (heading != null && !isNaN(heading)) {
        headingRef.current = heading;
        applyRotation();
      }
    }

    window.addEventListener(
      "deviceorientationabsolute",
      handleOrientation as EventListener,
      true,
    );
    window.addEventListener(
      "deviceorientation",
      handleOrientation as EventListener,
    );

    return () => {
      window.removeEventListener(
        "deviceorientationabsolute",
        handleOrientation as EventListener,
        true,
      );
      window.removeEventListener(
        "deviceorientation",
        handleOrientation as EventListener,
      );
      orientationBoundRef.current = false;
    };
  }, [applyRotation]);

  const flyToUser = useCallback(() => {
    if (!posRef.current || !mapInstance) return;
    const map = mapInstance.getMap();
    map.flyTo({
      center: [posRef.current.lng, posRef.current.lat],
      zoom: Math.max(map.getZoom(), 16),
      duration: 1200,
    });
  }, [mapInstance]);

  // Start GPS watching — called from the effect triggered by locateTrigger
  const startWatching = useCallback(() => {
    if (!mapInstance) return;
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    if (watchIdRef.current != null) return; // already watching

    const map = mapInstance.getMap();

    // Build marker
    const el = document.createElement("div");
    el.className = "user-location-icon";
    el.innerHTML = buildStaticSVG();
    markerElRef.current = el;

    setStatus("requesting");

    import("maplibre-gl").then((mgl) => {
      const marker = new mgl.Marker({ element: el })
        .setLngLat([0, 0])
        .addTo(map);
      markerRef.current = marker;

      if (posRef.current) {
        updatePosition();
      }

      // Orientation (works immediately on Android, needs permission on iOS — handled below)
      bindOrientation();
    });

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        posRef.current = { lat: latitude, lng: longitude };
        onLocation?.(latitude, longitude);

        if (
          pos.coords.heading != null &&
          !isNaN(pos.coords.heading) &&
          pos.coords.speed &&
          pos.coords.speed > 0.5
        ) {
          headingRef.current = pos.coords.heading;
          applyRotation();
        }

        updatePosition();

        if (statusRef.current !== "active") {
          setStatus("active");
        }

        if (firstFixRef.current) {
          firstFixRef.current = false;
          map.flyTo({
            center: [longitude, latitude],
            zoom: 16,
            duration: 1500,
          });
        }
      },
      (err) => {
        console.warn("Geolocation error:", err.code, err.message);
        if (err.code === 1) {
          setStatus("denied");
        } else if (err.code === 2) {
          setStatus("unavailable");
        } else {
          setStatus("error");
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      },
    );

    watchIdRef.current = watchId;

    // Request iOS DeviceOrientation permission (must be from user gesture context)
    requestOrientationPermission().then((granted) => {
      if (granted) {
        bindOrientation();
      }
    });
  }, [
    mapInstance,
    setStatus,
    updatePosition,
    applyRotation,
    bindOrientation,
    onLocation,
  ]);

  // React to locateTrigger changes
  useEffect(() => {
    if (locateTrigger <= 0) return;

    if (watchIdRef.current == null) {
      startWatching();
    } else {
      flyToUser();
    }
  }, [locateTrigger, startWatching, flyToUser]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (animFrameRef.current != null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      markerRef.current?.remove();
      markerRef.current = null;
    };
  }, []);

  return null;
}
