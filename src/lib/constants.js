// ========================================
// Carbon Database — per-item detection values
// ========================================
export const CARBON_DB = {
  // People & Clothing
  person: 1.0, jacket: 12.0, shirt: 3.0, short: 2.0, pants: 5.5, sweater: 9.0, Tshirt: 2.5,
  "long-dress": 8.0, "long-skirt": 5.0, "midi-dress": 6.0, "midi-skirt": 4.0, "short-dress": 4.5, "short-skirt": 2.5,
  // Vehicles (kg CO₂ per detection/entry)
  car: 5.5, motorbike: 2.0, threewheel: 3.0, van: 8.0, bus: 15.0, truck: 20.0,
};

// Class names matching the ONNX model output order
export const CLASS_NAMES = [
  "Tshirt", "bus", "car", "jacket", "long-dress",
  "long-skirt", "midi-dress", "midi-skirt", "motorbike", "pants",
  "person", "shirt", "short", "short-dress", "short-skirt",
  "sweater", "threewheel", "truck", "van", "person",
];

// Category groups
export const VEHICLE_CLASSES = ["car", "truck", "bus", "van", "motorbike", "threewheel"];
export const CLOTHES_CLASSES = [
  "Tshirt", "jacket", "long-dress", "long-skirt", "midi-dress",
  "midi-skirt", "pants", "shirt", "short", "short-dress",
  "short-skirt", "sweater",
];

// Navigation items
export const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: "dashboard" },
  { label: "CO₂ Emissions", href: "/emissions", icon: "emissions" },
  { label: "Energy Usage", href: "/energy", icon: "energy" },
  { label: "Vehicles", href: "/vehicles", icon: "vehicles" },
  { label: "Reports", href: "/reports", icon: "reports" },
];

// Chart color palette
export const CHART_COLORS = {
  blue: "#2563eb",
  green: "#16a34a",
  yellow: "#eab308",
  red: "#ef4444",
  orange: "#f97316",
  purple: "#8b5cf6",
  teal: "#14b8a6",
  cyan: "#06b6d4",
};
