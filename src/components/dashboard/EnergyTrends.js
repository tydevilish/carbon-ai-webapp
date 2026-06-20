"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export default function EnergyTrends({ data }) {
  return (
    <div className="widget-card">
      <div className="widget-header">
        <h3 className="widget-title">Energy Consumption Trends</h3>
        <span className="widget-period">Last 7 Days ▾</span>
      </div>
      <div className="widget-chart">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="electricity"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#2563eb" }}
              name="Electricity"
            />
            <Line
              type="monotone"
              dataKey="water"
              stroke="#16a34a"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#16a34a" }}
              name="Water Usage"
            />
            <Line
              type="monotone"
              dataKey="waste"
              stroke="#eab308"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: "#eab308" }}
              name="Waste"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
