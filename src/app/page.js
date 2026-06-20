"use client";

import { useEffect, useRef, useState } from "react";
import * as ort from "onnxruntime-web";

// 🌟 1. ฐานข้อมูลคาร์บอน (อัปเดตเพิ่มยานพาหนะ)
const CARBON_DB = {
  // คนและเสื้อผ้า
  person: 1.0, jacket: 12.0, shirt: 3.0, short: 2.0, pants: 5.5, sweater: 9.0, Tshirt: 2.5,
  "long-dress": 8.0, "long-skirt": 5.0, "midi-dress": 6.0, "midi-skirt": 4.0, "short-dress": 4.5, "short-skirt": 2.5,

  // ยานพาหนะ (อัปเดตเพิ่ม van, threewheel และ motorbike)
  car: 5.5, motorbike: 2.0, threewheel: 3.0, van: 8.0, bus: 15.0, truck: 20.0
};

// 🌟 2. รายชื่อคลาส (⚠️ ต้องเรียงลำดับให้ตรงกับไฟล์ data.yaml ของคุณเป๊ะๆ)
// ตัวอย่างด้านล่างนี้คือ 20 คลาสที่คุณเทรนมา สมมติว่าเรียงแบบนี้:
const CLASS_NAMES = [
  "Tshirt", "bus", "car", "jacket", "long-dress",
  "long-skirt", "midi-dress", "midi-skirt", "motorbike", "pants",
  "person", "shirt", "short", "short-dress", "short-skirt",
  "sweater", "threewheel", "truck", "van", "person"
];

// หมวดหมู่เพื่อแบ่งสีวาดกรอบ
const VEHICLE_CLASSES = ["car", "truck", "bus", "van", "motorbike", "threewheel"];
const CLOTHES_CLASSES = ["Tshirt", "jacket", "long-dress", "long-skirt", "midi-dress", "midi-skirt", "pants", "shirt", "short", "short-dress", "short-skirt", "sweater"];

// ==========================================
// ฟังก์ชันคณิตศาสตร์
// ==========================================
const calculateIoU = (b1, b2) => {
  const x_left = Math.max(b1.x1, b2.x1); const y_top = Math.max(b1.y1, b2.y1);
  const x_right = Math.min(b1.x2, b2.x2); const y_bottom = Math.min(b1.y2, b2.y2);
  if (x_right < x_left || y_bottom < y_top) return 0.0;
  const intersection = (x_right - x_left) * (y_bottom - y_top);
  const area1 = (b1.w) * (b1.h); const area2 = (b2.w) * (b2.h);
  return intersection / (area1 + area2 - intersection);
};

const applyNMS = (boxes, iouThreshold = 0.4) => {
  boxes.sort((a, b) => b.conf - a.conf);
  const selected = [];
  for (const box of boxes) {
    let keep = true;
    for (const s of selected) {
      if (box.item === s.item && calculateIoU(box, s) > iouThreshold) { keep = false; break; }
    }
    if (keep) selected.push(box);
  }
  return selected;
};

const getDistance = (p1, p2) => Math.sqrt(Math.pow(p1.xc - p2.xc, 2) + Math.pow(p1.yc - p2.yc, 2));

// ==========================================
// Component หลัก
// ==========================================
export default function CarbonDashboard() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const hiddenCanvasRef = useRef(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [accumulatedTotal, setAccumulatedTotal] = useState(0);
  const [currentTrackedItems, setCurrentTrackedItems] = useState([]);
  const [facingMode, setFacingMode] = useState("environment");

  // 🌟 เหลือโมเดลเดียวครอบจักรวาล!
  const modelRef = useRef(null);
  const isDetecting = useRef(false);
  const latestUIData = useRef({ targets: [], clothes: [] });

  const nextTrackId = useRef(1);
  const activeTracks = useRef([]);
  const countedHistory = useRef(new Set());

  useEffect(() => {
    const loadModels = async () => {
      try {
        // โหลดแค่ best.onnx ตัวเดียว จบทุกปัญหา!
        modelRef.current = await ort.InferenceSession.create("/models/best.onnx", {
          executionProviders: ["webgl", "wasm"],
        });
        setIsLoaded(true);
      } catch (error) {
        console.error("โหลดโมเดลไม่สำเร็จ:", error);
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (isLoaded) startWebcam();
  }, [facingMode, isLoaded]);

  const startWebcam = async () => {
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facingMode } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          renderLoop();
          runAILoop();
        };
      }
    } catch (error) {
      alert("ไม่สามารถเข้าถึงกล้องได้ครับ");
    }
  };

  const toggleCamera = () => setFacingMode(prev => (prev === "user" ? "environment" : "user"));

  const resetCounter = () => {
    setAccumulatedTotal(0);
    countedHistory.current.clear();
    activeTracks.current = [];
  };

  // --------------------------------------------------------
  // ลูปที่ 1: วาดภาพและแสดง ID ของแต่ละคน/รถ
  // --------------------------------------------------------
  const renderLoop = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current; const canvas = canvasRef.current;

    if (video.videoWidth === 0) { requestAnimationFrame(renderLoop); return; }
    if (canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / 640; const scaleY = canvas.height / 640;
    const lineWidth = Math.max(3, canvas.width / 200);

    const { targets, clothes } = latestUIData.current;

    // 1. วาดเสื้อผ้า (สีเขียว)
    clothes.forEach(box => {
      const x = box.x1 * scaleX, y = box.y1 * scaleY, w = box.w * scaleX, h = box.h * scaleY;
      ctx.strokeStyle = "#10b981"; ctx.lineWidth = lineWidth; ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = "#10b981"; ctx.fillRect(x, y - 25, ctx.measureText(box.item).width + 20, 25);
      ctx.fillStyle = "#000000"; ctx.font = "600 14px 'Kanit'"; ctx.fillText(box.item, x + 10, y - 7);
    });

    // 2. วาด คน/รถ (สีเหลืองสำหรับคน, สีฟ้าสำหรับรถ)
    targets.forEach(target => {
      const x = target.x1 * scaleX, y = target.y1 * scaleY, w = target.w * scaleX, h = target.h * scaleY;
      const isVehicle = VEHICLE_CLASSES.includes(target.item);
      const color = isVehicle ? "#3b82f6" : "#eab308"; // ฟ้า vs เหลืองทอง

      ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.strokeRect(x, y, w, h);

      const itemsList = target.items.length > 0 ? ` [${target.items.join(",")}]` : "";
      const text = `${isVehicle ? '🚗' : '👤'} ID#${target.id} ${target.item} (+${target.carbon.toFixed(1)})${itemsList}`;

      ctx.fillStyle = color; ctx.fillRect(x, y - 30, ctx.measureText(text).width + 20, 30);
      ctx.fillStyle = "#ffffff"; ctx.font = "bold 16px 'Kanit'"; ctx.fillText(text, x + 10, y - 8);
    });

    requestAnimationFrame(renderLoop);
  };

  // --------------------------------------------------------
  // ลูปที่ 2: AI ตัวเดียว กวาดทุกอย่างรวดเดียวจบ!
  // --------------------------------------------------------
  const runAILoop = async () => {
    if (!videoRef.current || !hiddenCanvasRef.current || !modelRef.current) return;
    if (isDetecting.current || videoRef.current.videoWidth === 0) { setTimeout(runAILoop, 50); return; }

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

      // รันสมองก้อนเดียวจบ ไม่ต้องกลัวเบราว์เซอร์ค้างแล้ว!
      const results = await modelRef.current.run({ images: tensor });
      const output = results[modelRef.current.outputNames[0]].data;

      let allRawBoxes = [];
      const NUM_CLASSES = CLASS_NAMES.length; // ควรเป็น 20

      // อ่านผลลัพธ์ทั้ง 8400 กล่อง
      for (let index = 0; index < 8400; index++) {
        let maxConf = 0; let classId = -1;
        for (let c = 0; c < NUM_CLASSES; c++) {
          const conf = output[(c + 4) * 8400 + index];
          if (conf > maxConf) { maxConf = conf; classId = c; }
        }

        if (maxConf > 0.60) {
          const xc = output[0 * 8400 + index], yc = output[1 * 8400 + index], w = output[2 * 8400 + index], h = output[3 * 8400 + index];
          const itemName = CLASS_NAMES[classId];
          allRawBoxes.push({
            item: itemName, conf: maxConf, xc, yc, w, h, x1: xc - w / 2, y1: yc - h / 2, x2: xc + w / 2, y2: yc + h / 2,
            items: [], carbon: CARBON_DB[itemName] || 0
          });
        }
      }

      // แยกกล่องออกเป็น 3 กอง: คน, รถ, เสื้อผ้า
      let rawTargets = allRawBoxes.filter(b => b.item === "person" || VEHICLE_CLASSES.includes(b.item));
      let rawClothes = allRawBoxes.filter(b => CLOTHES_CLASSES.includes(b.item));

      // กรองกล่องซ้อนด้วย NMS
      let currentTargets = applyNMS(rawTargets, 0.4);
      let currentClothes = applyNMS(rawClothes, 0.4);

      // --- ระบบ Tracking (จับคู่ คน/รถ กับของเดิมในเฟรมที่แล้ว) ---
      const MAX_DISTANCE = 150;
      let updatedTracks = [];

      currentTargets.forEach(target => {
        let matchedTrack = null; let minDist = Infinity;
        // เทียบเฉพาะของประเภทเดียวกัน (คนเทียบคน, รถเทียบรถ)
        activeTracks.current.forEach(track => {
          if (track.item === target.item || (VEHICLE_CLASSES.includes(track.item) && VEHICLE_CLASSES.includes(target.item))) {
            const dist = getDistance(target, track);
            if (dist < minDist && dist < MAX_DISTANCE) { minDist = dist; matchedTrack = track; }
          }
        });

        if (matchedTrack) {
          target.id = matchedTrack.id;
          activeTracks.current = activeTracks.current.filter(t => t.id !== matchedTrack.id);
        } else {
          target.id = nextTrackId.current++;
        }
        updatedTracks.push(target);
      });
      activeTracks.current = updatedTracks;

      // --- เอาเสื้อผ้า ยัดใส่มือคน (หรือใส่รถถ้านั่งอยู่) ---
      currentClothes.forEach(cloth => {
        let bestTarget = null; let minDist = Infinity;
        updatedTracks.forEach(target => {
          if (cloth.xc >= target.x1 && cloth.xc <= target.x2 && cloth.yc >= target.y1 && cloth.yc <= target.y2) {
            const dist = getDistance(cloth, target);
            if (dist < minDist) { minDist = dist; bestTarget = target; }
          }
        });
        if (bestTarget && !bestTarget.items.includes(cloth.item)) {
          bestTarget.items.push(cloth.item);
          bestTarget.carbon += (CARBON_DB[cloth.item] || 0);
        }
      });

      // --- ล็อกยอดสะสม ---
      let newCarbonToAdd = 0;
      updatedTracks.forEach(target => {
        // เช็คตัวหลัก (คน หรือ รถ)
        const targetUniqueKey = `ID_${target.id}_base`;
        if (!countedHistory.current.has(targetUniqueKey)) {
          countedHistory.current.add(targetUniqueKey);
          newCarbonToAdd += (CARBON_DB[target.item] || 0);
        }
        // เช็คเสื้อผ้าที่ติดตัวเขามา
        target.items.forEach(itemName => {
          const itemUniqueKey = `ID_${target.id}_${itemName}`;
          if (!countedHistory.current.has(itemUniqueKey)) {
            countedHistory.current.add(itemUniqueKey);
            newCarbonToAdd += (CARBON_DB[itemName] || 0);
          }
        });
      });

      if (newCarbonToAdd > 0) setAccumulatedTotal(prev => prev + newCarbonToAdd);

      latestUIData.current = { targets: updatedTracks, clothes: currentClothes };
      setCurrentTrackedItems([...updatedTracks]);

    } catch (e) { console.error(e); }
    finally { isDetecting.current = false; requestAnimationFrame(runAILoop); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 to-neutral-950 flex items-center justify-center p-4">
      <canvas ref={hiddenCanvasRef} width="640" height="640" className="hidden" />

      <div className="w-full max-w-6xl bg-neutral-800/80 backdrop-blur-xl border border-neutral-700/50 rounded-[2rem] shadow-2xl p-4 md:p-6 flex flex-col lg:flex-row gap-6 relative overflow-hidden">

        {!isLoaded && (
          <div className="absolute inset-0 z-50 bg-neutral-900/90 flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <h2 className="text-2xl font-semibold text-blue-400">Loading Omnipotent AI...</h2>
          </div>
        )}

        <div className="flex-1 bg-black rounded-2xl overflow-hidden relative shadow-inner border border-neutral-700 min-h-[50vh] md:min-h-[60vh] flex">
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover z-10" />

          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-neutral-600 flex items-center gap-2 z-20">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-sm font-medium text-gray-200 uppercase tracking-widest">Live Scan</span>
          </div>

          <button onClick={toggleCamera} className="absolute top-4 right-4 bg-neutral-900/70 hover:bg-blue-600 backdrop-blur-md p-3 rounded-full border border-neutral-600 transition-colors z-20 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
          </button>
        </div>

        <div className="w-full lg:w-[380px] flex flex-col gap-4">
          <div className="flex justify-between items-start px-2">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-300 tracking-wide">
                CarbonLens AI
              </h1>
              <p className="text-neutral-400 text-sm mt-1">Multi-Class Smart Tracking</p>
            </div>
            <button onClick={resetCounter} className="bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-md">
              <i className="fa-solid fa-rotate-left mr-1"></i> รีเซ็ต
            </button>
          </div>

          <div className="bg-gradient-to-br from-blue-900/40 to-teal-900/20 p-6 rounded-2xl border border-blue-500/20 shadow-lg relative overflow-hidden">
            <h2 className="text-blue-300/80 text-sm font-semibold uppercase tracking-wider mb-1">Accumulated Impact</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black text-blue-400 tabular-nums">{accumulatedTotal.toFixed(1)}</span>
              <span className="text-xl font-bold text-blue-500/70">kgCO₂</span>
            </div>
          </div>

          <div className="bg-neutral-800/50 p-6 rounded-2xl border border-neutral-700/50 flex-1 overflow-y-auto max-h-[300px] md:max-h-[400px] scrollbar-thin scrollbar-thumb-neutral-600">
            <h2 className="text-neutral-400 text-sm font-semibold uppercase tracking-wider mb-4">Detected Entities</h2>

            {currentTrackedItems.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 italic">ไม่พบการเคลื่อนไหว...</div>
            ) : (
              <ul className="flex flex-col gap-3">
                {currentTrackedItems.map((usr) => {
                  const isVehicle = VEHICLE_CLASSES.includes(usr.item);
                  return (
                    <li key={usr.id} className={`flex flex-col bg-neutral-900/60 p-4 rounded-xl border ${isVehicle ? 'border-blue-900/50' : 'border-neutral-700'}`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`font-bold text-lg ${isVehicle ? 'text-blue-400' : 'text-yellow-500'}`}>
                          {isVehicle ? '🚗' : '👤'} ID #{usr.id} <span className="text-sm text-neutral-400 capitalize">({usr.item})</span>
                        </span>
                        <span className="text-blue-400 font-bold bg-blue-400/10 px-2.5 py-1 rounded-lg text-xs">
                          +{usr.carbon.toFixed(1)} kg
                        </span>
                      </div>
                      {usr.items.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {usr.items.map((item, i) => (
                            <span key={i} className="bg-neutral-800 text-neutral-300 text-xs px-2 py-0.5 rounded border border-neutral-700 capitalize">{item}</span>
                          ))}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}