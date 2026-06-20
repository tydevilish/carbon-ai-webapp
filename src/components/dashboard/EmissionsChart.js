"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart,
} from "recharts";

export default function EmissionsChart({ weeklyData, monthlyData }) {
  const [view, setView] = useState("weekly");
  const data = view === "weekly" ? weeklyData : monthlyData;

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div>
          <h3 className="widget-title">CO₂ Emissions Overview</h3>
          <p className="widget-subtitle">Last 8 days ▾</p>
        </div>
        <div className="widget-toggle">
          <button
            className={`toggle-btn ${view === "weekly" ? "toggle-active" : ""}`}
            onClick={() => setView("weekly")}
          >
            Weekly
          </button>
          <button
            className={`toggle-btn ${view === "monthly" ? "toggle-active" : ""}`}
            onClick={() => setView("monthly")}
          >
            Monthly
          </button>
        </div>
      </div>
      <div className="widget-chart">
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "12px",
                color: "#fff",
                fontSize: "13px",
              }}
            />
            <Bar dataKey="emissions" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={28} name="Emissions (kg)" />
            <Line
              type="monotone"
              dataKey="target"
              stroke="#eab308"
              strokeWidth={2}
              dot={{ r: 4, fill: "#eab308" }}
              name="Target"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
