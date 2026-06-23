"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { CameraOff } from "lucide-react";

export default function CameraFeed({ vehicleEntries = [] }) {
  const videoRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  useEffect(() => {
    let stream = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: 640, height: 360 },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setCameraReady(true);
          };
        }
      } catch (err) {
        console.warn("Camera not accessible for dashboard preview:", err);
        setCameraError(true);
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const recentEntries = vehicleEntries.slice(0, 3);
  const vehicleCount = vehicleEntries.length || 0;

  return (
    <div className="widget-card">
      <div className="widget-header">
        <h3 className="widget-title">Live Camera Feed</h3>
        <Link href="/vehicles" className="widget-link">View All →</Link>
      </div>
      <div className="camera-feed-content">
        {/* Camera Preview */}
        <div className="camera-preview">
          {cameraError ? (
            <div className="camera-placeholder">
              <CameraOff size={36} style={{ opacity: 0.5, color: "#64748b" }} />
              <p>ไม่พบกล้อง</p>
              <p style={{ fontSize: "10px", color: "#475569" }}>คลิก &quot;View All&quot; เพื่อเชื่อมต่อ</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "var(--radius-md)",
                  display: cameraReady ? "block" : "none",
                }}
              />
              {!cameraReady && (
                <div className="camera-placeholder">
                  <div className="loading-spinner" style={{ width: 32, height: 32, marginBottom: 8 }} />
                  <p>กำลังเชื่อมต่อกล้อง...</p>
                </div>
              )}
            </>
          )}

          {/* Live badge */}
          {cameraReady && (
            <div className="camera-preview-badge">
              <div className="live-dot" />
              <span>LIVE</span>
            </div>
          )}

          {/* Overlay stats */}
          <div className="camera-overlay-stats">
            <span className="camera-stat camera-stat-vehicle">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17h14v-5H5z"/><path d="M2 12l3-7h14l3 7"/></svg>
              {vehicleCount} Vehicles
            </span>
          </div>
        </div>

        {/* Recent Detections — no license plates */}
        <div className="camera-log">
          {recentEntries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px", color: "#94a3b8", fontStyle: "italic", fontSize: "13px" }}>
              ยังไม่มีข้อมูลรถเข้า
            </div>
          ) : (
            recentEntries.map((entry) => (
              <div key={entry.id} className="camera-log-item">
                <div className="camera-log-main">
                  <span className="camera-log-plate" style={{ textTransform: "capitalize" }}>
                    {entry.type}
                  </span>
                  <span className="camera-log-time">{entry.time}</span>
                </div>
                <div className="camera-log-detail">
                  <span className="camera-log-location">{entry.location} • +{entry.co2} kg CO₂</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
