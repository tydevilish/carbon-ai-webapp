"use client";

export default function StatCard({ icon, value, unit, label, change, color = "blue" }) {
  const isPositive = change > 0;
  return (
    <div className="stat-card">
      <div className={`stat-icon stat-icon-${color}`}>
        {icon}
      </div>
      <div className="stat-content">
        <div className="stat-value-row">
          <span className="stat-value">{typeof value === 'number' ? value.toLocaleString() : value}</span>
          <span className="stat-unit">{unit}</span>
        </div>
        <div className="stat-label">{label}</div>
      </div>
      {change !== undefined && (
        <div className={`stat-change ${isPositive ? "stat-change-up" : "stat-change-down"}`}>
          {isPositive ? "↑" : "↓"} {Math.abs(change)}%
        </div>
      )}
    </div>
  );
}
