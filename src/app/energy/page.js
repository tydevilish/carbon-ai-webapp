"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { getMockEnergyDetail } from "@/lib/mock-data";
import {
  calculateElectricityCO2, calculateWaterCO2, calculateWasteCO2,
  COST_FACTORS,
} from "@/lib/carbon-calculator";

export default function EnergyPage() {
  const [energyData, setEnergyData] = useState([]);

  useEffect(() => {
    setEnergyData(getMockEnergyDetail());
  }, []);

  // Calculate totals
  const totals = energyData.reduce(
    (acc, row) => ({
      electricity: acc.electricity + row.electricity_kwh,
      water: acc.water + row.water_m3,
      waste: acc.waste + row.waste_kg,
    }),
    { electricity: 0, water: 0, waste: 0 }
  );

  const totalCO2 =
    calculateElectricityCO2(totals.electricity) +
    calculateWaterCO2(totals.water) +
    calculateWasteCO2(totals.waste);

  const totalCost =
    totals.electricity * COST_FACTORS.electricity +
    totals.water * COST_FACTORS.water +
    totals.waste * COST_FACTORS.waste;

  // Chart data — last 14 days
  const chartData = energyData.slice(-14).map((row) => ({
    date: row.date.split("-").slice(1).join("/"),
    electricity: row.electricity_kwh,
    water: row.water_m3,
    waste: row.waste_kg,
  }));

  // CO2 comparison chart
  const co2CompareData = energyData.slice(-14).map((row) => ({
    date: row.date.split("-").slice(1).join("/"),
    electricity_co2: +calculateElectricityCO2(row.electricity_kwh).toFixed(1),
    water_co2: +calculateWaterCO2(row.water_m3).toFixed(1),
    waste_co2: +calculateWasteCO2(row.waste_kg).toFixed(1),
  }));

  return (
    <>
      <div className="page-title-bar">
        <h2>⚡ Energy Usage Analysis</h2>
        <p>Monitor electricity, water, and waste consumption with CO₂ impact</p>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-yellow"><span>⚡</span></div>
          <div className="stat-content">
            <div className="stat-value-row">
              <span className="stat-value">{totals.electricity.toLocaleString()}</span>
              <span className="stat-unit">kWh</span>
            </div>
            <div className="stat-label">Total Electricity (30 days)</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-cyan"><span>💧</span></div>
          <div className="stat-content">
            <div className="stat-value-row">
              <span className="stat-value">{totals.water.toLocaleString()}</span>
              <span className="stat-unit">m³</span>
            </div>
            <div className="stat-label">Total Water (30 days)</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-red"><span>🗑️</span></div>
          <div className="stat-content">
            <div className="stat-value-row">
              <span className="stat-value">{totals.waste.toLocaleString()}</span>
              <span className="stat-unit">kg</span>
            </div>
            <div className="stat-label">Total Waste (30 days)</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-green"><span>☁️</span></div>
          <div className="stat-content">
            <div className="stat-value-row">
              <span className="stat-value">{totalCO2.toFixed(0)}</span>
              <span className="stat-unit">kg CO₂</span>
            </div>
            <div className="stat-label">Total Emissions</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="widgets-grid">
        {/* Energy Consumption */}
        <div className="widget-card">
          <div className="widget-header">
            <h3 className="widget-title">Energy Consumption (Last 14 Days)</h3>
          </div>
          <div className="widget-chart">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#1e293b", border: "1px solid #334155",
                    borderRadius: "12px", color: "#fff", fontSize: "13px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="electricity" fill="#eab308" radius={[4, 4, 0, 0]} name="Electricity (kWh)" barSize={16} />
                <Bar dataKey="water" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Water (m³)" barSize={16} />
                <Bar dataKey="waste" fill="#ef4444" radius={[4, 4, 0, 0]} name="Waste (kg)" barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CO₂ from Energy */}
        <div className="widget-card">
          <div className="widget-header">
            <h3 className="widget-title">CO₂ from Energy Sources</h3>
          </div>
          <div className="widget-chart">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={co2CompareData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#1e293b", border: "1px solid #334155",
                    borderRadius: "12px", color: "#fff", fontSize: "13px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Line type="monotone" dataKey="electricity_co2" stroke="#eab308" strokeWidth={2.5} dot={{ r: 3 }} name="Electricity CO₂" />
                <Line type="monotone" dataKey="water_co2" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3 }} name="Water CO₂" />
                <Line type="monotone" dataKey="waste_co2" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Waste CO₂" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="widget-card" style={{ marginTop: "16px" }}>
        <div className="widget-header">
          <h3 className="widget-title">💰 Cost Breakdown (30 Days)</h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          <div style={{ padding: "16px", background: "var(--bg-primary)", borderRadius: "12px", textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>ELECTRICITY COST</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#eab308" }}>{(totals.electricity * COST_FACTORS.electricity).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>฿ ({COST_FACTORS.electricity}/kWh)</div>
          </div>
          <div style={{ padding: "16px", background: "var(--bg-primary)", borderRadius: "12px", textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>WATER COST</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#06b6d4" }}>{(totals.water * COST_FACTORS.water).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>฿ ({COST_FACTORS.water}/m³)</div>
          </div>
          <div style={{ padding: "16px", background: "var(--bg-primary)", borderRadius: "12px", textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>WASTE DISPOSAL</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#ef4444" }}>{(totals.waste * COST_FACTORS.waste).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>฿ ({COST_FACTORS.waste}/kg)</div>
          </div>
          <div style={{ padding: "16px", background: "linear-gradient(135deg, #1e3a5f, #0f172a)", borderRadius: "12px", textAlign: "center", color: "white" }}>
            <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>TOTAL COST</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#60a5fa" }}>{totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <div style={{ fontSize: "12px", color: "#64748b" }}>฿ (30 days)</div>
          </div>
        </div>
      </div>
    </>
  );
}
