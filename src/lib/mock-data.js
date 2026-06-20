/**
 * Mock data generator for development without Supabase
 * Generates realistic-looking data for all dashboard components
 */

// Helper: generate date strings for last N days
function getLastNDays(n) {
  const dates = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Today"];

// ========================================
// Dashboard Summary Stats
// ========================================
export function getMockSummary() {
  return {
    totalCO2: 2562,
    co2Change: 12,
    energyUse: 4320,
    energyChange: 13,
    vehicleEntries: 1245,
    vehicleChange: 5,
    estimatedCost: 21450,
    costChange: 3,
  };
}

// ========================================
// CO₂ Emissions (Weekly bar chart)
// ========================================
export function getMockEmissionsWeekly() {
  return [
    { day: "Mon", emissions: 180, target: 200 },
    { day: "Tue", emissions: 220, target: 200 },
    { day: "Wed", emissions: 190, target: 200 },
    { day: "Thu", emissions: 310, target: 200 },
    { day: "Fri", emissions: 420, target: 200 },
    { day: "Sat", emissions: 280, target: 200 },
    { day: "Sun", emissions: 195, target: 200 },
    { day: "Today", emissions: 350, target: 200 },
  ];
}

export function getMockEmissionsMonthly() {
  return [
    { day: "Week 1", emissions: 1200, target: 1400 },
    { day: "Week 2", emissions: 1450, target: 1400 },
    { day: "Week 3", emissions: 1100, target: 1400 },
    { day: "Week 4", emissions: 1380, target: 1400 },
  ];
}

// ========================================
// Carbon Emission Breakdown (Donut chart)
// ========================================
export function getMockBreakdown() {
  return [
    { name: "Vehicles", value: 50.2, color: "#2563eb" },
    { name: "Electricity", value: 35.8, color: "#eab308" },
    { name: "Water Usage", value: 8.5, color: "#06b6d4" },
    { name: "Waste", value: 5.5, color: "#ef4444" },
  ];
}

// ========================================
// Energy Consumption Trends (Multi-line)
// ========================================
export function getMockEnergyTrends() {
  return [
    { day: "Mon", electricity: 520, water: 180, waste: 45 },
    { day: "Tue", electricity: 580, water: 200, waste: 52 },
    { day: "Wed", electricity: 490, water: 170, waste: 48 },
    { day: "Thu", electricity: 620, water: 220, waste: 55 },
    { day: "Fri", electricity: 700, water: 250, waste: 62 },
    { day: "Sat", electricity: 450, water: 160, waste: 40 },
    { day: "Sun", electricity: 410, water: 140, waste: 35 },
    { day: "Today", electricity: 550, water: 190, waste: 50 },
  ];
}

// ========================================
// Vehicle Entries / Detection Log
// ========================================
export function getMockVehicleEntries() {
  return [
    { id: 1, plate: "ABC 1234", type: "car", time: "02:45 am", location: "Gate 1", co2: 1.05 },
    { id: 2, plate: "DEF-5678", type: "van", time: "09:24 am", location: "Gate 1", co2: 1.35 },
    { id: 3, plate: "GHI 9101", type: "truck", time: "09:15 am", location: "Gate 2", co2: 3.10 },
    { id: 4, plate: "JKL 2345", type: "motorbike", time: "10:02 am", location: "Gate 1", co2: 0.36 },
    { id: 5, plate: "MNO 6789", type: "car", time: "10:30 am", location: "Gate 2", co2: 1.05 },
    { id: 6, plate: "PQR 1122", type: "bus", time: "11:15 am", location: "Gate 1", co2: 0.45 },
  ];
}

// ========================================
// Entry & Exit Statistics
// ========================================
export function getMockEntryStats() {
  return {
    personEntry: 365,
    personCO2: 315,
    vehicleEntry: 310,
    vehicleCO2: 310,
    personExit: 220,
    vehicleRejected: 22,
  };
}

// ========================================
// Carbon Forecast (prediction line)
// ========================================
export function getMockForecast() {
  return [
    { day: "Today", actual: 1300, predicted: 1300 },
    { day: "J4", actual: 1280, predicted: 1290 },
    { day: "Tips", actual: null, predicted: 1250 },
    { day: "TMOR", actual: null, predicted: 1200 },
    { day: "Track", actual: null, predicted: 1180 },
    { day: "Forecast", actual: null, predicted: 1322 },
  ];
}

// ========================================
// Carbon Tips
// ========================================
export function getMockTips() {
  return [
    "Promote public transportation",
    "Reduce electricity consumption",
    "Increase recycling programs",
    "Conserve water",
    "Use energy-efficient appliances",
    "Plant trees in campus areas",
  ];
}

// ========================================
// Emissions Detail Table (for emissions page)
// ========================================
export function getMockEmissionsTable() {
  const dates = getLastNDays(14);
  return dates.map((date, i) => ({
    id: i + 1,
    date,
    electricity_kwh: 400 + Math.floor(Math.random() * 300),
    electricity_co2: 0,
    water_m3: 100 + Math.floor(Math.random() * 150),
    water_co2: 0,
    waste_kg: 30 + Math.floor(Math.random() * 40),
    waste_co2: 0,
    vehicles_co2: 50 + Math.floor(Math.random() * 100),
    total_co2: 0,
    cost: 0,
  })).map(row => {
    row.electricity_co2 = +(row.electricity_kwh * 0.4999).toFixed(1);
    row.water_co2 = +(row.water_m3 * 0.0997).toFixed(1);
    row.waste_co2 = +(row.waste_kg * 0.458).toFixed(1);
    row.total_co2 = +(row.electricity_co2 + row.water_co2 + row.waste_co2 + row.vehicles_co2).toFixed(1);
    row.cost = +(row.electricity_kwh * 4.15 + row.water_m3 * 17.5 + row.waste_kg * 1.2).toFixed(0);
    return row;
  });
}

// ========================================
// Energy Detail (for energy page)
// ========================================
export function getMockEnergyDetail() {
  const dates = getLastNDays(30);
  return dates.map((date, i) => ({
    id: i + 1,
    date,
    electricity_kwh: 380 + Math.floor(Math.random() * 340),
    water_m3: 80 + Math.floor(Math.random() * 170),
    waste_kg: 25 + Math.floor(Math.random() * 50),
  }));
}

// ========================================
// Reports — Monthly Summary
// ========================================
export function getMockMonthlySummary() {
  return [
    { month: "Jan", co2: 2100, cost: 18500 },
    { month: "Feb", co2: 1950, cost: 17200 },
    { month: "Mar", co2: 2300, cost: 20100 },
    { month: "Apr", co2: 2150, cost: 19000 },
    { month: "May", co2: 2400, cost: 21000 },
    { month: "Jun", co2: 2562, cost: 21450 },
  ];
}
