"use client";

import { useState, useEffect } from "react";
import { Cloud, Zap, Car, Coins } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import EmissionsChart from "@/components/dashboard/EmissionsChart";
import BreakdownDonut from "@/components/dashboard/BreakdownDonut";
import EnergyTrends from "@/components/dashboard/EnergyTrends";
import CameraFeed from "@/components/dashboard/CameraFeed";
import EntryStats from "@/components/dashboard/EntryStats";
import CarbonTips from "@/components/dashboard/CarbonTips";
import ForecastChart from "@/components/dashboard/ForecastChart";

import {
  fetchDashboardSummary,
  fetchEmissionsWeekly,
  fetchEmissionsMonthly,
  fetchBreakdown,
  fetchEnergyTrends,
  fetchVehicleEntries,
  fetchEntryStats,
  fetchForecast,
  fetchTips,
} from "@/lib/supabase-queries";

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [emissionsWeekly, setEmissionsWeekly] = useState([]);
  const [emissionsMonthly, setEmissionsMonthly] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [energyTrends, setEnergyTrends] = useState([]);
  const [vehicleEntries, setVehicleEntries] = useState([]);
  const [entryStats, setEntryStats] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [tips, setTips] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      const [
        summaryData,
        weeklyData,
        monthlyData,
        breakdownData,
        trendsData,
        vehiclesData,
        statsData,
        forecastData,
        tipsData,
      ] = await Promise.all([
        fetchDashboardSummary(),
        fetchEmissionsWeekly(),
        fetchEmissionsMonthly(),
        fetchBreakdown(),
        fetchEnergyTrends(),
        fetchVehicleEntries(),
        fetchEntryStats(),
        fetchForecast(),
        Promise.resolve(fetchTips()),
      ]);

      setSummary(summaryData);
      setEmissionsWeekly(weeklyData);
      setEmissionsMonthly(monthlyData);
      setBreakdown(breakdownData);
      setEnergyTrends(trendsData);
      setVehicleEntries(vehiclesData);
      setEntryStats(statsData);
      setForecast(forecastData);
      setTips(tipsData);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    }
  }

  if (!summary) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <>
      {/* Summary Stats */}
      <div className="stats-grid">
        <StatCard
          icon={<Cloud size={20} />}
          value={summary.totalCO2}
          unit="kg CO₂"
          label="Total"
          change={summary.co2Change}
          color="blue"
        />
        <StatCard
          icon={<Zap size={20} />}
          value={summary.energyUse.toLocaleString()}
          unit="kWh"
          label="Energy Use"
          change={summary.energyChange}
          color="yellow"
        />
        <StatCard
          icon={<Car size={20} />}
          value={summary.vehicleEntries.toLocaleString()}
          unit="entries"
          label="Vehicle Entries"
          change={summary.vehicleChange}
          color="green"
        />
        <StatCard
          icon={<Coins size={20} />}
          value={summary.estimatedCost.toLocaleString()}
          unit="฿"
          label="Estimated Cost"
          change={summary.costChange}
          color="cyan"
        />
      </div>

      {/* Row 1: Emissions Chart + Breakdown */}
      <div className="widgets-grid">
        <EmissionsChart
          weeklyData={emissionsWeekly}
          monthlyData={emissionsMonthly}
        />
        <BreakdownDonut data={breakdown} />
      </div>

      {/* Row 2: Energy Trends + Camera Feed */}
      <div className="widgets-grid">
        <EnergyTrends data={energyTrends} />
        <CameraFeed vehicleEntries={vehicleEntries} />
      </div>

      {/* Row 3: Entry Stats + Tips + Forecast */}
      <div className="widgets-grid-3">
        <EntryStats stats={entryStats} />
        <CarbonTips tips={tips} />
        <ForecastChart data={forecast} />
      </div>
    </>
  );
}