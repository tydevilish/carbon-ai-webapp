"use client";

import { useEffect, useRef, useState } from "react";
import { Car, User, CameraOff } from "lucide-react";
import * as ort from "onnxruntime-web";
import {
  CARBON_DB, CLASS_NAMES, VEHICLE_CLASSES, CLOTHES_CLASSES,
} from "@/lib/constants";
import { getMockVehicleEntries } from "@/lib/mock-data";

// ==========================================
// Math utilities for detection
// ==========================================
const calculateIoU = (b1, b2) => {
  const x_left = Math.max(b1.x1, b2.x1);
  const y_top = Math.max(b1.y1, b2.y1);
  const x_right = Math.min(b1.x2, b2.x2);
  const y_bottom = Math.min(b1.y2, b2.y2);
  if (x_right < x_left || y_bottom < y_top) return 0.0;
  const intersection = (x_right - x_left) * (y_bottom - y_top);
  const area1 = b1.w * b1.h;
  const area2 = b2.w * b2.h;
  return intersection / (area1 + area2 - intersection);
};

const applyNMS = (boxes, iouThreshold = 0.4) => {
  boxes.sort((a, b) => b.conf - a.conf);
  const selected = [];
  for (const box of boxes) {
    let keep = true;
    for (const s of selected) {
      if (box.item === s.item && calculateIoU(box, s) > iouThreshold) {
        keep = false;
        break;
      }
    }
    if (keep) selected.push(box);
  }
  return selected;
};

const getDistance = (p1, p2) =>
  Math.sqrt(Math.pow(p1.xc - p2.xc, 2) + Math.pow(p1.yc - p2.yc, 2));

export default function VehiclesPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const hiddenCanvasRef = useRef(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [accumulatedTotal, setAccumulatedTotal] = useState(0);
  const [currentTrackedItems, setCurrentTrackedItems] = useState([]);
  const [facingMode, setFacingMode] = useState("environment");
  const [vehicleLog, setVehicleLog] = useState([]);
  const [cameraError, setCameraError] = useState(false);

  const modelRef = useRef(null);
  const isDetecting = useRef(false);
  const latestUIData = useRef({ targets: [], clothes: [] });
  const nextTrackId = useRef(1);
  const activeTracks = useRef([]);
  const countedHistory = useRef(new Set());

  useEffect(() => {
    // Load mock vehicle log
    setVehicleLog(getMockVehicleEntries());

    const loadModels = async () => {
      try {
        modelRef.current = await ort.InferenceSession.create("/models/best.onnx", {
          executionProviders: ["webgl", "wasm"],
        });
        setIsLoaded(true);
      } catch (error) {
        console.error("Failed to load model:", error);
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (isLoaded) startWebcam();
  }, [facingMode, isLoaded]);

  const startWebcam = async () => {
    try {
      setCameraError(false);
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          renderLoop();
          runAILoop();
        };
      }
    } catch (error) {
      console.warn("Camera not accessible", error);
      setCameraError(true);
    }
  };

  const toggleCamera = () =>
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));

  const resetCounter = () => {
    setAccumulatedTotal(0);
    countedHistory.current.clear();
    activeTracks.current = [];
  };

  // ==========================================
  // Render loop — draw detection boxes
  // ==========================================
  const renderLoop = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0) {
      requestAnimationFrame(renderLoop);
      return;
    }
    if (canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / 640;
    const scaleY = canvas.height / 640;
    const lineWidth = Math.max(3, canvas.width / 200);

    const { targets, clothes } = latestUIData.current;

    // Draw clothing (green)
    clothes.forEach((box) => {
      const x = box.x1 * scaleX, y = box.y1 * scaleY, w = box.w * scaleX, h = box.h * scaleY;
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = "#10b981";
      ctx.fillRect(x, y - 25, ctx.measureText(box.item).width + 20, 25);
      ctx.fillStyle = "#000000";
      ctx.font = "600 14px 'Kanit'";
      ctx.fillText(box.item, x + 10, y - 7);
    });

    // Draw persons/vehicles
    targets.forEach((target) => {
      const x = target.x1 * scaleX, y = target.y1 * scaleY, w = target.w * scaleX, h = target.h * scaleY;
      const isVehicle = VEHICLE_CLASSES.includes(target.item);
      const color = isVehicle ? "#3b82f6" : "#eab308";

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(x, y, w, h);

      const itemsList = target.items.length > 0 ? ` [${target.items.join(",")}]` : "";
      const text = `${target.item.toUpperCase()} ID#${target.id} (+${target.carbon.toFixed(1)})${itemsList}`;

      ctx.fillStyle = color;
      ctx.fillRect(x, y - 30, ctx.measureText(text).width + 20, 30);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px 'Kanit'";
      ctx.fillText(text, x + 10, y - 8);
    });

    requestAnimationFrame(renderLoop);
  };

  // ==========================================
  // AI detection loop
  // ==========================================
  const runAILoop = async () => {
    if (!videoRef.current || !hiddenCanvasRef.current || !modelRef.current) return;
    if (isDetecting.current || videoRef.current.videoWidth === 0) {
      setTimeout(runAILoop, 50);
      return;
    }

    isDetecting.current = true;

    try {
      const video = videoRef.current;
      const hCanvas = hiddenCanvasRef.current;
      const hCtx = hCanvas.getContext("2d", { willReadFrequently: true });

      hCtx.drawImage(video, 0, 0, 640, 640);
      const imageData = hCtx.getImageData(0, 0, 640, 640).data;
      const inputTensor = new Float32Array(1 * 3 * 640 * 640);
      for (let i = 0; i < 640 * 640; i++) {
        inputTensor[i] = imageData[i * 4] / 255.0;
        inputTensor[640 * 640 + i] = imageData[i * 4 + 1] / 255.0;
        inputTensor[2 * 640 * 640 + i] = imageData[i * 4 + 2] / 255.0;
      }
      const tensor = new ort.Tensor("float32", inputTensor, [1, 3, 640, 640]);

      const results = await modelRef.current.run({ images: tensor });
      const output = results[modelRef.current.outputNames[0]].data;

      let allRawBoxes = [];
      const NUM_CLASSES = CLASS_NAMES.length;

      for (let index = 0; index < 8400; index++) {
        let maxConf = 0;
        let classId = -1;
        for (let c = 0; c < NUM_CLASSES; c++) {
          const conf = output[(c + 4) * 8400 + index];
          if (conf > maxConf) {
            maxConf = conf;
            classId = c;
          }
        }

        if (maxConf > 0.6) {
          const xc = output[0 * 8400 + index],
            yc = output[1 * 8400 + index],
            w = output[2 * 8400 + index],
            h = output[3 * 8400 + index];
          const itemName = CLASS_NAMES[classId];
          allRawBoxes.push({
            item: itemName, conf: maxConf, xc, yc, w, h,
            x1: xc - w / 2, y1: yc - h / 2, x2: xc + w / 2, y2: yc + h / 2,
            items: [], carbon: CARBON_DB[itemName] || 0,
          });
        }
      }

      let rawTargets = allRawBoxes.filter(
        (b) => b.item === "person" || VEHICLE_CLASSES.includes(b.item)
      );
      let rawClothes = allRawBoxes.filter((b) => CLOTHES_CLASSES.includes(b.item));

      let currentTargets = applyNMS(rawTargets, 0.4);
      let currentClothes = applyNMS(rawClothes, 0.4);

      // Tracking
      const MAX_DISTANCE = 150;
      let updatedTracks = [];

      currentTargets.forEach((target) => {
        let matchedTrack = null;
        let minDist = Infinity;
        activeTracks.current.forEach((track) => {
          if (
            track.item === target.item ||
            (VEHICLE_CLASSES.includes(track.item) && VEHICLE_CLASSES.includes(target.item))
          ) {
            const dist = getDistance(target, track);
            if (dist < minDist && dist < MAX_DISTANCE) {
              minDist = dist;
              matchedTrack = track;
            }
          }
        });

        if (matchedTrack) {
          target.id = matchedTrack.id;
          activeTracks.current = activeTracks.current.filter(
            (t) => t.id !== matchedTrack.id
          );
        } else {
          target.id = nextTrackId.current++;
        }
        updatedTracks.push(target);
      });
      activeTracks.current = updatedTracks;

      // Associate clothing with persons/vehicles
      currentClothes.forEach((cloth) => {
        let bestTarget = null;
        let minDist = Infinity;
        updatedTracks.forEach((target) => {
          if (
            cloth.xc >= target.x1 && cloth.xc <= target.x2 &&
            cloth.yc >= target.y1 && cloth.yc <= target.y2
          ) {
            const dist = getDistance(cloth, target);
            if (dist < minDist) {
              minDist = dist;
              bestTarget = target;
            }
          }
        });
        if (bestTarget && !bestTarget.items.includes(cloth.item)) {
          bestTarget.items.push(cloth.item);
          bestTarget.carbon += CARBON_DB[cloth.item] || 0;
        }
      });

      // Accumulate carbon
      let newCarbonToAdd = 0;
      updatedTracks.forEach((target) => {
        const targetUniqueKey = `ID_${target.id}_base`;
        if (!countedHistory.current.has(targetUniqueKey)) {
          countedHistory.current.add(targetUniqueKey);
          newCarbonToAdd += CARBON_DB[target.item] || 0;
        }
        target.items.forEach((itemName) => {
          const itemUniqueKey = `ID_${target.id}_${itemName}`;
          if (!countedHistory.current.has(itemUniqueKey)) {
            countedHistory.current.add(itemUniqueKey);
            newCarbonToAdd += CARBON_DB[itemName] || 0;
          }
        });
      });

      if (newCarbonToAdd > 0) setAccumulatedTotal((prev) => prev + newCarbonToAdd);

      latestUIData.current = { targets: updatedTracks, clothes: currentClothes };
      setCurrentTrackedItems([...updatedTracks]);
    } catch (e) {
      console.error(e);
    } finally {
      isDetecting.current = false;
      requestAnimationFrame(runAILoop);
    }
  };

  return (
    <>
      <div className="page-title-bar">
        <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Car size={24} className="text-blue-500" />
          Vehicles & Camera Detection
        </h2>
        <p>Live AI-powered detection system with real-time carbon tracking</p>
      </div>

      <canvas ref={hiddenCanvasRef} width="640" height="640" style={{ display: "none" }} />

      <div className="camera-page-layout">
        {/* Camera View */}
        <div className="camera-view">
          {!isLoaded && !cameraError && (
            <div className="loading-overlay" style={{ position: "absolute", borderRadius: "16px" }}>
              <div className="loading-spinner" />
              <p className="loading-text">Loading AI Model...</p>
            </div>
          )}
          {cameraError && (
            <div className="loading-overlay" style={{
              position: "absolute",
              borderRadius: "16px",
              background: "rgba(15, 23, 42, 0.95)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              padding: "24px",
              textAlign: "center",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 5
            }}>
              <CameraOff size={40} className="text-red-500" style={{ color: "#ef4444" }} />
              <p className="loading-text" style={{ margin: 0, fontWeight: "600", fontSize: "16px", color: "#f1f5f9" }}>ไม่พบกล้องในขณะนี้</p>
              <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>โปรดตรวจสอบการเชื่อมต่อกล้องหรืออนุญาตสิทธิ์การเข้าถึงกล้อง</p>
            </div>
          )}
          <video ref={videoRef} playsInline muted />
          <canvas ref={canvasRef} />

          <div className="camera-live-badge">
            <div className="live-dot" />
            <span>Live Scan</span>
          </div>

          <div className="camera-controls">
            <button onClick={toggleCamera} className="camera-ctrl-btn" title="Switch Camera">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
            </button>
            <button onClick={resetCounter} className="camera-ctrl-btn" title="Reset Counter" style={{ background: "rgba(239, 68, 68, 0.7)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            </button>
          </div>
        </div>

        {/* Sidebar Panel */}
        <div className="camera-sidebar">
          {/* Carbon Accumulator */}
          <div className="widget-card" style={{ background: "linear-gradient(135deg, #1e3a5f, #0f172a)", color: "white" }}>
            <h3 style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Accumulated Impact</h3>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span style={{ fontSize: "48px", fontWeight: 800, color: "#60a5fa", fontFamily: "'Inter', monospace" }}>{accumulatedTotal.toFixed(1)}</span>
              <span style={{ fontSize: "16px", fontWeight: 600, color: "#3b82f6" }}>kgCO₂</span>
            </div>
          </div>

          {/* Detected Entities */}
          <div className="widget-card">
            <div className="widget-header">
              <h3 className="widget-title">Detected Entities</h3>
              <span style={{ fontSize: "12px", color: "#64748b" }}>{currentTrackedItems.length} active</span>
            </div>
            <div className="detection-list">
              {currentTrackedItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px", color: "#94a3b8", fontStyle: "italic", fontSize: "13px" }}>
                  No movement detected...
                </div>
              ) : (
                currentTrackedItems.map((usr) => {
                  const isVehicle = VEHICLE_CLASSES.includes(usr.item);
                  return (
                    <div key={usr.id} className="detection-item">
                      <div className="detection-main">
                        <span className={`detection-id ${isVehicle ? "detection-vehicle" : "detection-person"}`} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {isVehicle ? <Car size={14} /> : <User size={14} />}
                          ID #{usr.id}
                          <span style={{ fontSize: "11px", color: "#94a3b8", textTransform: "capitalize" }}>({usr.item})</span>
                        </span>
                        <span className="detection-carbon">+{usr.carbon.toFixed(1)} kg</span>
                      </div>
                      {usr.items.length > 0 && (
                        <div className="detection-tags">
                          {usr.items.map((item, i) => (
                            <span key={i} className="detection-tag">{item}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Vehicle Log from DB */}
          <div className="widget-card">
            <div className="widget-header">
              <h3 className="widget-title">Recent Vehicle Log</h3>
            </div>
            <div className="detection-list" style={{ maxHeight: "250px" }}>
              {vehicleLog.map((entry) => (
                <div key={entry.id} className="detection-item">
                  <div className="detection-main">
                    <span className="detection-id detection-vehicle">{entry.plate}</span>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>{entry.time}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                    <span style={{ fontSize: "11px", color: "#64748b", textTransform: "capitalize" }}>{entry.type} • {entry.location}</span>
                    <span className="detection-carbon">+{entry.co2} kg CO₂</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
