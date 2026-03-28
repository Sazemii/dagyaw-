"use client";

import {
  FaTrash,
  FaRecycle,
  FaFire,
  FaTint,
  FaLightbulb,
  FaTrafficLight,
  FaRoad,
  FaWater,
  FaTree,
  FaExclamationTriangle,
  FaVolumeUp,
  FaDog,
  FaSmog,
} from "react-icons/fa";
import type { IconType } from "react-icons";

const ICON_MAP: Record<string, IconType> = {
  FaTrash,
  FaRecycle,
  FaFire,
  FaTint,
  FaLightbulb,
  FaTrafficLight,
  FaRoad,
  FaWater,
  FaTree,
  FaExclamationTriangle,
  FaVolumeUp,
  FaDog,
  FaSmog,
};

interface CategoryIconProps {
  iconName: string;
  color: string;
  size?: number;
  className?: string;
}

export default function CategoryIcon({
  iconName,
  color,
  size = 18,
  className = "",
}: CategoryIconProps) {
  const Icon = ICON_MAP[iconName];
  if (!Icon) return null;
  return <Icon size={size} color={color} className={className} />;
}
