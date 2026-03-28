export interface Category {
  id: string;
  label: string;
  icon: string;
  color: string;
  sdg: number;
  group: string;
  severity: number; // 1 (minor) to 5 (critical)
}

export const CATEGORIES: Category[] = [
  // Waste & Pollution (SDG 12)
  {
    id: "illegal-dumping",
    label: "Illegal Dumping",
    icon: "FaTrash",
    color: "#f97316", // orange
    sdg: 12,
    group: "Waste & Pollution",
    severity: 4,
  },
  {
    id: "unsegregated-waste",
    label: "Unsegregated Waste",
    icon: "FaRecycle",
    color: "#a3e635", // lime
    sdg: 12,
    group: "Waste & Pollution",
    severity: 1,
  },
  {
    id: "illegal-burning",
    label: "Kaingin / Burning",
    icon: "FaFire",
    color: "#ef4444", // vibrant red
    sdg: 12,
    group: "Waste & Pollution",
    severity: 4,
  },
  {
    id: "water-pollution",
    label: "Water Pollution",
    icon: "FaTint",
    color: "#a855f7", // purple
    sdg: 12,
    group: "Waste & Pollution",
    severity: 4,
  },

  // Energy & Infrastructure (SDG 7)
  {
    id: "broken-streetlight",
    label: "Broken Streetlight",
    icon: "FaLightbulb",
    color: "#f5c542", // yellow
    sdg: 7,
    group: "Energy & Infrastructure",
    severity: 3,
  },
  {
    id: "traffic-light",
    label: "Malfunctioning Traffic Light",
    icon: "FaTrafficLight",
    color: "#f5c542", // yellow
    sdg: 7,
    group: "Energy & Infrastructure",
    severity: 3,
  },

  // Urban Environment (SDG 11)
  {
    id: "pothole",
    label: "Pothole / Road Damage",
    icon: "FaRoad",
    color: "#78716c", // stone
    sdg: 11,
    group: "Urban Environment",
    severity: 4,
  },
  {
    id: "flooding",
    label: "Flooding / Drainage",
    icon: "FaWater",
    color: "#3b82f6", // blue
    sdg: 11,
    group: "Urban Environment",
    severity: 5,
  },
  {
    id: "fallen-tree",
    label: "Fallen Tree / Debris",
    icon: "FaTree",
    color: "#22c55e", // green
    sdg: 11,
    group: "Urban Environment",
    severity: 2,
  },
  {
    id: "unsafe-structure",
    label: "Unsafe Structure",
    icon: "FaExclamationTriangle",
    color: "#eab308", // amber
    sdg: 11,
    group: "Urban Environment",
    severity: 5,
  },
  {
    id: "noise-pollution",
    label: "Noise Pollution",
    icon: "FaVolumeUp",
    color: "#d946ef", // fuchsia
    sdg: 11,
    group: "Urban Environment",
    severity: 1,
  },
  {
    id: "stray-animal",
    label: "Stray Animal Hazard",
    icon: "FaDog",
    color: "#fb923c", // light orange
    sdg: 11,
    group: "Urban Environment",
    severity: 2,
  },
];

export const CATEGORY_GROUPS = [...new Set(CATEGORIES.map((c) => c.group))];

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
