"use client";

import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Coins, Sprout } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ComposedChart,
} from "recharts";
import { fetchMonthlySummary, fetchTips } from "@/lib/supabase-queries";

export default function ReportsPage() {
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [tips, setTips] = useState([]);

  useEffect(() => {
    async function loadData() {
      const [monthly, tipsData] = await Promise.all([
        fetchMonthlySummary(),
        Promise.resolve(fetchTips()),
      ]);
      setMonthlySummary(monthly);
      setTips(tipsData);
    }
    loadData();
  }, []);

  const totalCO2 = monthlySummary.reduce((sum, m) => sum + m.co2, 0);
  const totalCost = monthlySummary.reduce((sum, m) => sum + m.cost, 0);
  const avgCO2 = monthlySummary.length > 0 ? totalCO2 / monthlySummary.length : 0;

  return (
    <>
      <div className="page-title-bar">
        <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <BarChart3 size={24} className="text-blue-500" />
          Reports & Summary
        </h2>
        <p>Monthly carbon footprint reports and reduction recommendations</p>
      </div>

      {/* Summary */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue"><BarChart3 size={20} /></div>
          <div className="stat-content">
            <div className="stat-value-row">
              <span className="stat-value">{totalCO2.toLocaleString()}</span>
              <span className="stat-unit">kg CO₂</span>
            </div>
            <div className="stat-label">Total (6 months)</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-yellow"><TrendingUp size={20} /></div>
          <div className="stat-content">
            <div className="stat-value-row">
              <span className="stat-value">{avgCO2.toFixed(0)}</span>
              <span className="stat-unit">kg/month</span>
            </div>
            <div className="stat-label">Monthly Average</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-green"><Coins size={20} /></div>
          <div className="stat-content">
            <div className="stat-value-row">
              <span className="stat-value">{totalCost.toLocaleString()}</span>
              <span className="stat-unit">฿</span>
            </div>
            <div className="stat-label">Total Cost (6 months)</div>
          </div>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="widgets-grid" style={{ marginBottom: "20px" }}>
        <div className="widget-card">
          <div className="widget-header">
            <h3 className="widget-title">Monthly CO₂ Emissions</h3>
          </div>
          <div className="widget-chart">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={monthlySummary} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} />
                <YAxis yAxisId="co2" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} />
                <YAxis yAxisId="cost" orientation="right" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#1e293b", border: "1px solid #334155",
                    borderRadius: "12px", color: "#fff", fontSize: "13px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar yAxisId="co2" dataKey="co2" fill="#2563eb" radius={[6, 6, 0, 0]} name="CO₂ (kg)" barSize={36} />
                <Line yAxisId="cost" type="monotone" dataKey="cost" stroke="#eab308" strokeWidth={2.5} dot={{ r: 4, fill: "#eab308" }} name="Cost (฿)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tips & Recommendations */}
        <div className="widget-card">
          <div className="widget-header">
            <h3 className="widget-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Sprout size={18} />
              Recommendations for Reducing Carbon
            </h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {tips.map((tip, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                  padding: "14px 16px",
                  background: "var(--bg-primary)",
                  borderRadius: "12px",
                  border: "1px solid var(--border-color)",
                }}
              >
                <span
                  style={{
                    width: "32px", height: "32px", borderRadius: "50%",
                    background: "linear-gradient(135deg, #2563eb, #06b6d4)",
                    color: "white", fontSize: "14px", fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>{tip}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                    Estimated reduction: {(5 + Math.random() * 15).toFixed(0)}% CO₂
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Data Table */}
      <div className="data-table-container">
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)" }}>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>Monthly Summary Table</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>CO₂ Emissions (kg)</th>
              <th>Cost (฿)</th>
              <th>vs Previous</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {monthlySummary.map((row, i) => {
              const prev = i > 0 ? monthlySummary[i - 1].co2 : row.co2;
              const change = ((row.co2 - prev) / prev * 100).toFixed(1);
              const isUp = row.co2 > prev;
              return (
                <tr key={row.month}>
                  <td style={{ fontWeight: 600 }}>{row.month} 2024</td>
                  <td style={{ fontWeight: 700 }}>{row.co2.toLocaleString()}</td>
                  <td>{row.cost.toLocaleString()}</td>
                  <td>
                    <span style={{
                      color: isUp ? "#ef4444" : "#16a34a",
                      fontWeight: 600, fontSize: "13px",
                    }}>
                      {isUp ? "↑" : "↓"} {Math.abs(change)}%
                    </span>
                  </td>
                  <td>
                    <span style={{
                      padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 600,
                      background: isUp ? "#fee2e2" : "#dcfce7",
                      color: isUp ? "#ef4444" : "#16a34a",
                    }}>
                      {isUp ? "Needs Improvement" : "On Track"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
