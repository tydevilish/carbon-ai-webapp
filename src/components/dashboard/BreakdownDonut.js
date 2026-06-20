"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function BreakdownDonut({ data }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="widget-card">
      <div className="widget-header">
        <h3 className="widget-title">Carbon Emission Breakdown</h3>
      </div>
      <div className="breakdown-content">
        <div className="donut-container">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "12px",
                  color: "#fff",
                  fontSize: "13px",
                }}
                formatter={(value) => [`${value}%`, ""]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-center">
            <span className="donut-center-value">CO₂</span>
          </div>
        </div>
        <div className="breakdown-legend">
          {data.map((item, i) => (
            <div key={i} className="legend-item">
              <div className="legend-dot" style={{ background: item.color }} />
              <span className="legend-value">{item.value}%</span>
              <span className="legend-label">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
