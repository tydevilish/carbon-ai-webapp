import { supabase, isSupabaseConfigured } from "./supabase";
import {
  getMockSummary,
  getMockEmissionsWeekly,
  getMockEmissionsMonthly,
  getMockBreakdown,
  getMockEnergyTrends,
  getMockVehicleEntries,
  getMockEntryStats,
  getMockForecast,
  getMockTips,
  getMockEmissionsTable,
  getMockEnergyDetail,
  getMockMonthlySummary,
} from "./mock-data";
import {
  calculateElectricityCO2,
  calculateWaterCO2,
  calculateWasteCO2,
  COST_FACTORS,
} from "./carbon-calculator";

// ========================================
// Dashboard Summary
// ========================================
export async function fetchDashboardSummary() {
  if (!isSupabaseConfigured) return getMockSummary();

  try {
    // Get emissions totals for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      .toISOString()
      .split("T")[0];
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      .toISOString()
      .split("T")[0];

    // Current month emissions
    const { data: currentEmissions } = await supabase
      .from("carbon_emissions")
      .select("source_type, amount_kg, cost_baht")
      .gte("date", startOfMonth);

    // Previous month emissions (for % change)
    const { data: prevEmissions } = await supabase
      .from("carbon_emissions")
      .select("source_type, amount_kg, cost_baht")
      .gte("date", startOfPrevMonth)
      .lte("date", endOfPrevMonth);

    // Current month vehicle entries
    const { data: vehicles, count: vehicleCount } = await supabase
      .from("vehicle_entries")
      .select("*", { count: "exact", head: true })
      .gte("detected_at", startOfMonth);

    // Previous month vehicle count
    const { count: prevVehicleCount } = await supabase
      .from("vehicle_entries")
      .select("*", { count: "exact", head: true })
      .gte("detected_at", startOfPrevMonth)
      .lte("detected_at", endOfPrevMonth + "T23:59:59");

    // Energy usage for current month
    const { data: energyData } = await supabase
      .from("energy_usage")
      .select("electricity_kwh, water_m3, waste_kg")
      .gte("date", startOfMonth);

    const totalCO2 = (currentEmissions || []).reduce(
      (sum, e) => sum + Number(e.amount_kg),
      0
    );
    const prevTotalCO2 = (prevEmissions || []).reduce(
      (sum, e) => sum + Number(e.amount_kg),
      0
    );
    const totalEnergy = (energyData || []).reduce(
      (sum, e) => sum + Number(e.electricity_kwh),
      0
    );
    const totalCost = (currentEmissions || []).reduce(
      (sum, e) => sum + Number(e.cost_baht),
      0
    );

    const co2Change =
      prevTotalCO2 > 0
        ? Math.round(((totalCO2 - prevTotalCO2) / prevTotalCO2) * 100)
        : 0;

    const vehicleChange =
      prevVehicleCount > 0
        ? Math.round(
            (((vehicleCount || 0) - prevVehicleCount) / prevVehicleCount) * 100
          )
        : 0;

    return {
      totalCO2: Math.round(totalCO2),
      co2Change,
      energyUse: Math.round(totalEnergy),
      energyChange: 0,
      vehicleEntries: vehicleCount || 0,
      vehicleChange,
      estimatedCost: Math.round(totalCost),
      costChange: 0,
    };
  } catch (err) {
    console.error("fetchDashboardSummary error:", err);
    return getMockSummary();
  }
}

// ========================================
// Emissions Weekly (bar chart)
// ========================================
export async function fetchEmissionsWeekly() {
  if (!isSupabaseConfigured) return getMockEmissionsWeekly();

  try {
    const days = [];
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split("T")[0]);
    }

    const { data } = await supabase
      .from("carbon_emissions")
      .select("date, amount_kg")
      .gte("date", days[0])
      .order("date");

    // Group by date
    const byDate = {};
    (data || []).forEach((row) => {
      byDate[row.date] = (byDate[row.date] || 0) + Number(row.amount_kg);
    });

    return days.map((date, i) => {
      const d = new Date(date);
      return {
        day: i === days.length - 1 ? "Today" : dayLabels[d.getDay()],
        emissions: Math.round(byDate[date] || 0),
        target: 200,
      };
    });
  } catch (err) {
    console.error("fetchEmissionsWeekly error:", err);
    return getMockEmissionsWeekly();
  }
}

// ========================================
// Emissions Monthly (bar chart)
// ========================================
export async function fetchEmissionsMonthly() {
  if (!isSupabaseConfigured) return getMockEmissionsMonthly();

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];

    const { data } = await supabase
      .from("carbon_emissions")
      .select("date, amount_kg")
      .gte("date", startOfMonth)
      .order("date");

    // Group by week
    const weeks = [{}, {}, {}, {}];
    (data || []).forEach((row) => {
      const day = new Date(row.date).getDate();
      const weekIdx = Math.min(Math.floor((day - 1) / 7), 3);
      weeks[weekIdx].total = (weeks[weekIdx].total || 0) + Number(row.amount_kg);
    });

    return weeks.map((w, i) => ({
      day: `Week ${i + 1}`,
      emissions: Math.round(w.total || 0),
      target: 1400,
    }));
  } catch (err) {
    console.error("fetchEmissionsMonthly error:", err);
    return getMockEmissionsMonthly();
  }
}

// ========================================
// Carbon Breakdown (donut chart)
// ========================================
export async function fetchBreakdown() {
  if (!isSupabaseConfigured) return getMockBreakdown();

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];

    const { data } = await supabase
      .from("carbon_emissions")
      .select("source_type, amount_kg")
      .gte("date", startOfMonth);

    const totals = {};
    let grandTotal = 0;
    (data || []).forEach((row) => {
      const amt = Number(row.amount_kg);
      totals[row.source_type] = (totals[row.source_type] || 0) + amt;
      grandTotal += amt;
    });

    const colorMap = {
      vehicle: "#2563eb",
      electricity: "#eab308",
      water: "#06b6d4",
      waste: "#ef4444",
    };
    const nameMap = {
      vehicle: "Vehicles",
      electricity: "Electricity",
      water: "Water Usage",
      waste: "Waste",
    };

    return Object.entries(totals).map(([key, val]) => ({
      name: nameMap[key] || key,
      value: grandTotal > 0 ? +((val / grandTotal) * 100).toFixed(1) : 0,
      color: colorMap[key] || "#8b5cf6",
    }));
  } catch (err) {
    console.error("fetchBreakdown error:", err);
    return getMockBreakdown();
  }
}

// ========================================
// Energy Trends (multi-line chart)
// ========================================
export async function fetchEnergyTrends() {
  if (!isSupabaseConfigured) return getMockEnergyTrends();

  try {
    const { data } = await supabase
      .from("energy_usage")
      .select("date, electricity_kwh, water_m3, waste_kg")
      .order("date", { ascending: false })
      .limit(8);

    if (!data || data.length === 0) return getMockEnergyTrends();

    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const sorted = [...data].reverse();

    return sorted.map((row, i) => {
      const d = new Date(row.date);
      return {
        day: i === sorted.length - 1 ? "Today" : dayLabels[d.getDay()],
        electricity: Math.round(Number(row.electricity_kwh)),
        water: Math.round(Number(row.water_m3)),
        waste: Math.round(Number(row.waste_kg)),
      };
    });
  } catch (err) {
    console.error("fetchEnergyTrends error:", err);
    return getMockEnergyTrends();
  }
}

// ========================================
// Vehicle Entries
// ========================================
export async function fetchVehicleEntries() {
  if (!isSupabaseConfigured) return getMockVehicleEntries();

  try {
    const { data } = await supabase
      .from("vehicle_entries")
      .select("id, vehicle_type, detected_at, camera_id, carbon_kg, direction")
      .order("detected_at", { ascending: false })
      .limit(10);

    if (!data || data.length === 0) return getMockVehicleEntries();

    return data.map((row) => ({
      id: row.id,
      type: row.vehicle_type,
      time: new Date(row.detected_at).toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      location: `Camera ${row.camera_id}`,
      co2: Number(row.carbon_kg),
      direction: row.direction,
    }));
  } catch (err) {
    console.error("fetchVehicleEntries error:", err);
    return getMockVehicleEntries();
  }
}

// ========================================
// Entry & Exit Statistics
// ========================================
export async function fetchEntryStats() {
  if (!isSupabaseConfigured) return getMockEntryStats();

  try {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const { data: entries } = await supabase
      .from("vehicle_entries")
      .select("direction, carbon_kg")
      .gte("detected_at", today);

    const stats = {
      personEntry: 0,
      personCO2: 0,
      vehicleEntry: 0,
      vehicleCO2: 0,
      personExit: 0,
      vehicleRejected: 0,
    };

    (entries || []).forEach((e) => {
      if (e.direction === "entry") {
        stats.vehicleEntry++;
        stats.vehicleCO2 += Number(e.carbon_kg);
      } else if (e.direction === "exit") {
        stats.personExit++;
      }
    });

    // Get person counts from detection_logs
    const { count: personCount } = await supabase
      .from("detection_logs")
      .select("*", { count: "exact", head: true })
      .eq("object_type", "person")
      .gte("detected_at", today);

    stats.personEntry = personCount || 0;
    stats.personCO2 = Math.round(stats.vehicleCO2);
    stats.vehicleCO2 = Math.round(stats.vehicleCO2);

    return stats;
  } catch (err) {
    console.error("fetchEntryStats error:", err);
    return getMockEntryStats();
  }
}

// ========================================
// Forecast
// ========================================
export async function fetchForecast() {
  if (!isSupabaseConfigured) return getMockForecast();

  try {
    // Get last 7 days of emissions for trend
    const { data } = await supabase
      .from("carbon_emissions")
      .select("date, amount_kg")
      .order("date", { ascending: false })
      .limit(14);

    if (!data || data.length < 3) return getMockForecast();

    // Group by date and calculate daily totals
    const byDate = {};
    data.forEach((row) => {
      byDate[row.date] = (byDate[row.date] || 0) + Number(row.amount_kg);
    });

    const dailyTotals = Object.values(byDate).slice(0, 6);
    const avg =
      dailyTotals.reduce((s, v) => s + v, 0) / dailyTotals.length;

    return [
      { day: "Today", actual: Math.round(dailyTotals[0] || avg), predicted: Math.round(avg) },
      { day: "D-1", actual: Math.round(dailyTotals[1] || avg), predicted: Math.round(avg * 0.98) },
      { day: "D-2", actual: null, predicted: Math.round(avg * 0.96) },
      { day: "D-3", actual: null, predicted: Math.round(avg * 0.94) },
      { day: "D-4", actual: null, predicted: Math.round(avg * 0.92) },
      { day: "Forecast", actual: null, predicted: Math.round(avg * 0.9) },
    ];
  } catch (err) {
    console.error("fetchForecast error:", err);
    return getMockForecast();
  }
}

// ========================================
// Tips (static — no DB table)
// ========================================
export function fetchTips() {
  return getMockTips();
}

// ========================================
// Emissions Table (Emissions Page)
// ========================================
export async function fetchEmissionsTable() {
  if (!isSupabaseConfigured) return getMockEmissionsTable();

  try {
    // Get energy usage for calculations
    const { data: energyData } = await supabase
      .from("energy_usage")
      .select("*")
      .order("date", { ascending: false })
      .limit(14);

    // Get vehicle emissions by date
    const { data: vehicleData } = await supabase
      .from("carbon_emissions")
      .select("date, amount_kg")
      .eq("source_type", "vehicle")
      .order("date", { ascending: false })
      .limit(14);

    if (!energyData || energyData.length === 0) return getMockEmissionsTable();

    const vehicleByDate = {};
    (vehicleData || []).forEach((v) => {
      vehicleByDate[v.date] = Number(v.amount_kg);
    });

    return energyData.map((row, i) => {
      const elecCO2 = +(Number(row.electricity_kwh) * 0.4999).toFixed(1);
      const waterCO2 = +(Number(row.water_m3) * 0.0997).toFixed(1);
      const wasteCO2 = +(Number(row.waste_kg) * 0.458).toFixed(1);
      const vehiclesCO2 = Math.round(vehicleByDate[row.date] || 0);
      const totalCO2 = +(elecCO2 + waterCO2 + wasteCO2 + vehiclesCO2).toFixed(1);
      const cost = Math.round(
        Number(row.electricity_kwh) * COST_FACTORS.electricity +
        Number(row.water_m3) * COST_FACTORS.water +
        Number(row.waste_kg) * COST_FACTORS.waste
      );

      return {
        id: row.id,
        date: row.date,
        electricity_kwh: Math.round(Number(row.electricity_kwh)),
        electricity_co2: elecCO2,
        water_m3: Math.round(Number(row.water_m3)),
        water_co2: waterCO2,
        waste_kg: Math.round(Number(row.waste_kg)),
        waste_co2: wasteCO2,
        vehicles_co2: vehiclesCO2,
        total_co2: totalCO2,
        cost,
      };
    });
  } catch (err) {
    console.error("fetchEmissionsTable error:", err);
    return getMockEmissionsTable();
  }
}

// ========================================
// Energy Detail (Energy Page)
// ========================================
export async function fetchEnergyDetail() {
  if (!isSupabaseConfigured) return getMockEnergyDetail();

  try {
    const { data } = await supabase
      .from("energy_usage")
      .select("*")
      .order("date", { ascending: false })
      .limit(30);

    if (!data || data.length === 0) return getMockEnergyDetail();

    return data.reverse().map((row) => ({
      id: row.id,
      date: row.date,
      electricity_kwh: Math.round(Number(row.electricity_kwh)),
      water_m3: Math.round(Number(row.water_m3)),
      waste_kg: Math.round(Number(row.waste_kg)),
    }));
  } catch (err) {
    console.error("fetchEnergyDetail error:", err);
    return getMockEnergyDetail();
  }
}

// ========================================
// Monthly Summary (Reports Page)
// ========================================
export async function fetchMonthlySummary() {
  if (!isSupabaseConfigured) return getMockMonthlySummary();

  try {
    const { data } = await supabase
      .from("carbon_emissions")
      .select("date, amount_kg, cost_baht")
      .order("date");

    if (!data || data.length === 0) return getMockMonthlySummary();

    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    // Group by month
    const byMonth = {};
    data.forEach((row) => {
      const d = new Date(row.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!byMonth[key]) {
        byMonth[key] = { month: monthNames[d.getMonth()], co2: 0, cost: 0 };
      }
      byMonth[key].co2 += Number(row.amount_kg);
      byMonth[key].cost += Number(row.cost_baht);
    });

    return Object.values(byMonth).map((m) => ({
      month: m.month,
      co2: Math.round(m.co2),
      cost: Math.round(m.cost),
    }));
  } catch (err) {
    console.error("fetchMonthlySummary error:", err);
    return getMockMonthlySummary();
  }
}

// ========================================
// Cameras
// ========================================
export async function fetchCameras() {
  if (!isSupabaseConfigured) return [];

  try {
    const { data } = await supabase
      .from("cameras")
      .select("*")
      .eq("status", "active")
      .order("id")
      .limit(3);

    return data || [];
  } catch (err) {
    console.error("fetchCameras error:", err);
    return [];
  }
}
