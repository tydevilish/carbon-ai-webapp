"use client";

export default function EntryStats({ stats }) {
  return (
    <div className="widget-card">
      <div className="widget-header">
        <h3 className="widget-title">Entry &amp; Exit Statistics</h3>
      </div>
      <div className="entry-stats-grid">
        {/* Person Entry */}
        <div className="entry-stat-item">
          <div className="entry-stat-icon entry-stat-person">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div className="entry-stat-data">
            <span className="entry-stat-value">{stats.personEntry}</span>
            <span className="entry-stat-label">Entry</span>
          </div>
        </div>

        {/* Person CO₂ */}
        <div className="entry-stat-item">
          <div className="entry-stat-icon entry-stat-co2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>
            </svg>
          </div>
          <div className="entry-stat-data">
            <span className="entry-stat-value">{stats.personCO2}</span>
            <span className="entry-stat-label">CO₂</span>
          </div>
        </div>

        {/* Vehicle Stats Row */}
        <div className="entry-stat-item entry-stat-full">
          <div className="entry-stat-row">
            <div className="entry-mini">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M5 17h14v-5H5z"/><path d="M2 12l3-7h14l3 7"/></svg>
              <span className="entry-mini-value">{stats.vehicleEntry}</span>
            </div>
            <div className="entry-mini">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>
              <span className="entry-mini-value">{stats.vehicleCO2}</span>
            </div>
          </div>
        </div>

        {/* Exit / Rejected */}
        <div className="entry-stat-item entry-stat-full">
          <div className="entry-stat-row">
            <div className="entry-mini">
              <span className="entry-mini-label">Exit</span>
              <span className="entry-mini-value">{stats.personExit}</span>
            </div>
            <div className="entry-mini">
              <span className="entry-mini-label">Rejected</span>
              <span className="entry-mini-value entry-mini-red">{stats.vehicleRejected}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
