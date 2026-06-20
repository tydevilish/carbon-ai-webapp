"use client";

import { useState, useEffect } from "react";
import { Cloud, BarChart3, TrendingUp, Factory, ClipboardList } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area,
} from "recharts";
import { getMockEmissionsTable, getMockEmissionsWeekly } from "@/lib/mock-data";
import { EMISSION_FACTORS } from "@/lib/carbon-calculator";

export default function EmissionsPage() {
  const [tableData, setTableData] = useState([]);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    setTableData(getMockEmissionsTable());
    setChartData(getMockEmissionsWeekly());
  }, []);

  const totalCO2 = tableData.reduce((sum, row) => sum + row.total_co2, 0);
  const avgCO2 = tableData.length > 0 ? totalCO2 / tableData.length : 0;

  // Build stacked chart data from table
  const stackedData = tableData.slice(-7).map((row) => ({
    date: row.date.split("-").slice(1).join("/"),
    Electricity: row.electricity_co2,
    Water: row.water_co2,
    Waste: row.waste_co2,
    Vehicles: row.vehicles_co2,
  }));

  return (
    <>
      <div className="page-title-bar">
        <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Cloud size={24} className="text-blue-500" />
          CO₂ Emissions Analysis
        </h2>
        <p>Detailed breakdown of carbon emissions from all sources</p>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue"><BarChart3 size={20} /></div>
          <div className="stat-content">
            <div className="stat-value-row">
              <span className="stat-value">{totalCO2.toFixed(0)}</span>
              <span className="stat-unit">kg CO₂</span>
            </div>
            <div className="stat-label">Total (14 days)</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-yellow"><TrendingUp size={20} /></div>
          <div className="stat-content">
            <div className="stat-value-row">
              <span className="stat-value">{avgCO2.toFixed(1)}</span>
              <span className="stat-unit">kg/day</span>
            </div>
            <div className="stat-label">Daily Average</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-green"><Factory size={20} /></div>
          <div className="stat-content">
            <div className="stat-value-row">
              <span className="stat-value">{EMISSION_FACTORS.electricity}</span>
              <span className="stat-unit">kgCO₂/kWh</span>
            </div>
            <div className="stat-label">Grid Emission Factor (TGO)</div>
          </div>
        </div>
      </div>

      {/* Stacked Area Chart */}
      <div className="widget-card" style={{ marginBottom: "20px" }}>
        <div className="widget-header">
          <h3 className="widget-title">Emissions by Source (Last 7 Days)</h3>
        </div>
        <div className="widget-chart">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={stackedData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "#1e293b", border: "1px solid #334155",
                  borderRadius: "12px", color: "#fff", fontSize: "13px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Area type="monotone" dataKey="Vehicles" stackId="1" stroke="#2563eb" fill="#2563eb" fillOpacity={0.6} />
              <Area type="monotone" dataKey="Electricity" stackId="1" stroke="#eab308" fill="#eab308" fillOpacity={0.6} />
              <Area type="monotone" dataKey="Water" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.6} />
              <Area type="monotone" dataKey="Waste" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data Table */}
      <div className="data-table-container">
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)" }}>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>Detailed Emissions Data</h3>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
            Calculated using TGO 2023 emission factors
          </p>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Electricity (kWh)</th>
                <th>Elec CO₂</th>
                <th>Water (m³)</th>
                <th>Water CO₂</th>
                <th>Waste (kg)</th>
                <th>Waste CO₂</th>
                <th>Vehicle CO₂</th>
                <th>Total CO₂</th>
                <th>Cost (฿)</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.id}>
                  <td style={{ fontWeight: 600 }}>{row.date}</td>
                  <td>{row.electricity_kwh}</td>
                  <td style={{ color: "#eab308", fontWeight: 600 }}>{row.electricity_co2}</td>
                  <td>{row.water_m3}</td>
                  <td style={{ color: "#06b6d4", fontWeight: 600 }}>{row.water_co2}</td>
                  <td>{row.waste_kg}</td>
                  <td style={{ color: "#ef4444", fontWeight: 600 }}>{row.waste_co2}</td>
                  <td style={{ color: "#2563eb", fontWeight: 600 }}>{row.vehicles_co2}</td>
                  <td style={{ fontWeight: 800 }}>{row.total_co2}</td>
                  <td>{row.cost.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Emission Factors Reference */}
      <div className="widget-card" style={{ marginTop: "20px" }}>
        <div className="widget-header">
          <h3 className="widget-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ClipboardList size={18} />
            Emission Factors Reference (TGO 2023)
          </h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
          <div style={{ padding: "12px", background: "var(--bg-primary)", borderRadius: "8px" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Electricity</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#eab308" }}>{EMISSION_FACTORS.electricity}</div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>kg CO₂ / kWh</div>
          </div>
          <div style={{ padding: "12px", background: "var(--bg-primary)", borderRadius: "8px" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Water</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#06b6d4" }}>{EMISSION_FACTORS.water}</div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>kg CO₂ / m³</div>
          </div>
          <div style={{ padding: "12px", background: "var(--bg-primary)", borderRadius: "8px" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Waste</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#ef4444" }}>{EMISSION_FACTORS.waste}</div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>kg CO₂ / kg</div>
          </div>
          <div style={{ padding: "12px", background: "var(--bg-primary)", borderRadius: "8px" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Car</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#2563eb" }}>{EMISSION_FACTORS.vehicles.car}</div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>kg CO₂ / km</div>
          </div>
        </div>
      </div>
    </>
  );
}
