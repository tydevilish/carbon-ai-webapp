"use client";

import { Cloud, Bell, Settings } from "lucide-react";

export default function Header({ title = "Dashboard" }) {
  return (
    <header className="page-header">
      <div className="header-left">
        <h1 className="header-title">
          <span className="header-icon" style={{ display: "inline-flex", alignItems: "center" }}>
            <Cloud size={20} />
          </span>
          Carbon Footprint Monitoring Dashboard
        </h1>
      </div>
      <div className="header-right">
        <button className="header-btn" title="Notifications">
          <Bell size={20} />
          <span className="header-badge">3</span>
        </button>
        <button className="header-btn" title="Settings">
          <Settings size={20} />
        </button>
        <div className="header-avatar">
          <span>A</span>
        </div>
      </div>
    </header>
  );
}
