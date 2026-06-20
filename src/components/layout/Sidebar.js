"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";
import { LayoutDashboard, Cloud, Zap, Car, BarChart3, Leaf } from "lucide-react";

const icons = {
  dashboard: <LayoutDashboard size={20} />,
  emissions: <Cloud size={20} />,
  energy: <Zap size={20} />,
  vehicles: <Car size={20} />,
  reports: <BarChart3 size={20} />,
};

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon" style={{ display: "inline-flex", alignItems: "center", color: "#10b981" }}>
          <Leaf size={24} />
        </div>
        <div className="sidebar-logo-text">
          <span className="sidebar-title">CarbonLens</span>
          <span className="sidebar-subtitle">AI Monitoring</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive ? "sidebar-link-active" : ""}`}
            >
              <span className="sidebar-icon">{icons[item.icon]}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom">
        <div className="sidebar-version">v2.0 — Carbon Footprint</div>
      </div>
    </aside>
  );
}
