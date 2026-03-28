"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-map-gl/maplibre";

// Amber/gold that fits the dark mode palette
const USER_COLOR = "#f5c542";
const USER_COLOR_RGB = "245, 197, 66";
const CONE_RADIUS = 160;
const CONE_ANGLE = 65;
const DOT_SIZE = 20;
const SVG_SIZE = CONE_RADIUS * 2 + DOT_SIZE;
const CENTER = SVG_SIZE / 2;

function buildUserSVG(heading: number): string {
  const startDeg = heading - CONE_ANGLE / 2 - 90;
  const endDeg = heading + CONE_ANGLE / 2 - 90;
  const startRad = (startDeg * Math.PI) / 180;
  const endRad = (endDeg * Math.PI) / 180;

  const x1 = CENTER + CONE_RADIUS * Math.cos(startRad);
  const y1 = CENTER + CONE_RADIUS * Math.sin(startRad);
  const x2 = CENTER + CONE_RADIUS * Math.cos(endRad);
  const y2 = CENTER + CONE_RADIUS * Math.sin(endRad);

  // Large arc flag: 0 since cone < 180deg
  const largeArc = CONE_ANGLE > 180 ? 1 : 0;

  return `
    <svg width="${SVG_SIZE}" height="${SVG_SIZE}" viewBox="0 0 ${SVG_SIZE} ${SVG_SIZE}"
         style="position:absolute;left:-${CENTER}px;top:-${CENTER}px;pointer-events:none;overflow:visible;">
      <defs>
        <!-- Cone gradient: bright near user, fading out -->
        <radialGradient id="ug" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgb(${USER_COLOR_RGB})" stop-opacity="0.22"/>
          <stop offset="40%" stop-color="rgb(${USER_COLOR_RGB})" stop-opacity="0.10"/>
          <stop offset="80%" stop-color="rgb(${USER_COLOR_RGB})" stop-opacity="0.03"/>
          <stop offset="100%" stop-color="rgb(${USER_COLOR_RGB})" stop-opacity="0"/>
        </radialGradient>
        <!-- Glow filter for the dot -->
        <filter id="dotglow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <!-- Direction cone -->
      <path d="M ${CENTER} ${CENTER} L ${x1} ${y1} A ${CONE_RADIUS} ${CONE_RADIUS} 0 ${largeArc} 1 ${x2} ${y2} Z"
            fill="url(#ug)" />

      <!-- Outer glow ring -->
      <circle cx="${CENTER}" cy="${CENTER}" r="${DOT_SIZE * 0.9}"
              fill="none" stroke="rgb(${USER_COLOR_RGB})" stroke-width="1"
              stroke-opacity="0.15" class="gps-pulse-ring" />

      <!-- Ambient glow -->
      <circle cx="${CENTER}" cy="${CENTER}" r="${DOT_SIZE * 0.65}"
              fill="rgb(${USER_COLOR_RGB})" fill-opacity="0.08"
              filter="url(#dotglow)" />

      <!-- Outer ring -->
      <circle cx="${CENTER}" cy="${CENTER}" r="${DOT_SIZE / 2}"
              fill="none" stroke="rgb(${USER_COLOR_RGB})" stroke-width="2.5"
              stroke-opacity="0.4" />

      <!-- Inner filled dot -->
      <circle cx="${CENTER}" cy="${CENTER}" r="${DOT_SIZE / 2 - 3}"
              fill="${USER_COLOR}" fill-opacity="0.9"
              stroke="rgba(255,255,255,0.6)" stroke-width="1.5" />

      <!-- Center highlight -->
      <circle cx="${CENTER - 2}" cy="${CENTER - 2}" r="2.5"
              fill="white" fill-opacity="0.5" />
    </svg>
  `;
}

export default function UserLocationTracker() {
  const { current: mapInstance } = useMap();
  const markerElRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const headingRef = useRef<number>(0);
  const posRef = useRef<{ lat: number; lng: number } | null>(null);
  const firstFixRef = useRef(true);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mapInstance || !navigator.geolocation) return;

    const map = mapInstance.getMap();

    const el = document.createElement("div");
    el.className = "user-location-icon";
    markerElRef.current = el;

    let marker: maplibregl.Marker | null = null;

    import("maplibre-gl").then((mgl) => {
      marker = new mgl.Marker({ element: el }).setLngLat([0, 0]).addTo(map);
      markerRef.current = marker;
      if (posRef.current) render();
    });

    function render() {
      if (!posRef.current || !markerElRef.current) return;
      markerElRef.current.innerHTML = buildUserSVG(headingRef.current);
      markerRef.current?.setLngLat([posRef.current.lng, posRef.current.lat]);
    }

    // Throttle renders to animation frames
    function scheduleRender() {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        render();
      });
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        posRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };

        if (pos.coords.heading != null && !isNaN(pos.coords.heading)) {
          headingRef.current = pos.coords.heading;
        }

        if (firstFixRef.current) {
          firstFixRef.current = false;
          map.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 16 });
        }

        scheduleRender();
      },
      (err) => console.warn("Geolocation error:", err.message),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );

    function handleOrientation(e: DeviceOrientationEvent) {
      let heading: number | null = null;
      if ("webkitCompassHeading" in e) {
        heading = (e as DeviceOrientationEvent & { webkitCompassHeading: number })
          .webkitCompassHeading;
      } else if (e.alpha != null) {
        heading = (360 - e.alpha) % 360;
      }
      if (heading != null) {
        headingRef.current = heading;
        scheduleRender();
      }
    }

    window.addEventListener("deviceorientationabsolute", handleOrientation as EventListener, true);
    window.addEventListener("deviceorientation", handleOrientation as EventListener);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      window.removeEventListener("deviceorientationabsolute", handleOrientation as EventListener, true);
      window.removeEventListener("deviceorientation", handleOrientation as EventListener);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      marker?.remove();
      markerRef.current = null;
    };
  }, [mapInstance]);

  return null;
}
