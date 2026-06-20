"use client";

import Link from "next/link";

export default function CameraFeed({ vehicleEntries = [] }) {
  const recentEntries = vehicleEntries.slice(0, 3);
  const personCount = 32;
  const vehicleCount = vehicleEntries.length || 25;

  return (
    <div className="widget-card">
      <div className="widget-header">
        <h3 className="widget-title">Live Camera Feed</h3>
        <Link href="/vehicles" className="widget-link">View All →</Link>
      </div>
      <div className="camera-feed-content">
        {/* Camera Preview */}
        <div className="camera-preview">
          <div className="camera-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <p>Click &quot;View All&quot; for live feed</p>
          </div>
          <div className="camera-overlay-stats">
            <span className="camera-stat camera-stat-person">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              {personCount} Persons
            </span>
            <span className="camera-stat camera-stat-vehicle">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17h14v-5H5z"/><path d="M2 12l3-7h14l3 7"/></svg>
              {vehicleCount} Vehicles
            </span>
          </div>
        </div>

        {/* Recent Detections */}
        <div className="camera-log">
          {recentEntries.map((entry) => (
            <div key={entry.id} className="camera-log-item">
              <div className="camera-log-main">
                <span className="camera-log-plate">{entry.plate}</span>
                <span className="camera-log-time">{entry.time}</span>
              </div>
              <div className="camera-log-detail">
                <span className="camera-log-location">{entry.location}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
