"use client";

import { useEffect, useRef, useState } from "react";
import * as ort from "onnxruntime-web";

const CARBON_DB = {
  person: 1.0, jacket: 12.0, shirt: 3.0, short: 2.0,
  "long-dress": 8.0, "long-skirt": 5.0, "midi-dress": 6.0,
  "midi-skirt": 4.0, pants: 5.5, "short-dress": 4.5,
  "short-skirt": 2.5, sweater: 9.0, Tshirt: 2.5,
};

const CLOTHES_CLASSES = [
  "Tshirt", "jacket", "long-dress", "long-skirt", "midi-dress",
  "midi-skirt", "pants", "shirt", "short", "short-dress",
  "short-skirt", "sweater",
];

// ==========================================
// ฟังก์ชันคณิตศาสตร์ 1: NMS กรองกล่องซ้ำ
// ==========================================
const calculateIoU = (b1, b2) => {
  const x_left = Math.max(b1.x1, b2.x1);
  const y_top = Math.max(b1.y1, b2.y1);
  const x_right = Math.min(b1.x2, b2.x2);
  const y_bottom = Math.min(b1.y2, b2.y2);
  if (x_right < x_left || y_bottom < y_top) return 0.0;
  const intersection = (x_right - x_left) * (y_bottom - y_top);
  const area1 = (b1.x2 - b1.x1) * (b1.y2 - b1.y1);
  const area2 = (b2.x2 - b2.x1) * (b2.y2 - b2.y1);
  return intersection / (area1 + area2 - intersection);
};

const applyNMS = (boxes, iouThreshold = 0.4) => {
  boxes.sort((a, b) => b.conf - a.conf);
  const selected = [];
  for (const box of boxes) {
    let keep = true;
    for (const s of selected) {
      if (calculateIoU(box, s) > iouThreshold) { keep = false; break; }
    }
    if (keep) selected.push(box);
  }
  return selected;
};

// ==========================================
// 🌟 ฟังก์ชันคณิตศาสตร์ 2: Centroid Tracking (ระบบจำคน)
// ==========================================
// คำนวณระยะห่างระหว่างจุด 2 จุด (Euclidean Distance)
const getDistance = (p1, p2) => {
  return Math.sqrt(Math.pow(p1.xc - p2.xc, 2) + Math.pow(p1.yc - p2.yc, 2));
};

export default function CarbonDashboard() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const hiddenCanvasRef = useRef(null);
  
  const [isLoaded, setIsLoaded] = useState(false);
  
  // 🌟 ยอด Total ที่จะไม่ไหลมั่ว จะสะสมเพิ่มเฉพาะคนที่ยังไม่เคยนับ
  const [accumulatedTotal, setAccumulatedTotal] = useState(0); 
  const [currentTrackedUsers, setCurrentTrackedUsers] = useState([]);
  const [facingMode, setFacingMode] = useState("environment");

  const clothesModelRef = useRef(null);
  const poseModelRef = useRef(null);
  
  const isDetecting = useRef(false);
  const latestUIData = useRef({ persons: [], clothes: [] });
  
  // 🌟 ตัวแปรเก็บความจำของ Tracker
  const nextPersonId = useRef(1); // ตัวเลขรัน ID ถัดไป
  const activeTracks = useRef([]); // เก็บรายชื่อคนที่อยู่ในกล้อง ณ ปัจจุบัน { id, xc, yc, items: [], carbon }
  const countedHistory = useRef(new Set()); // สมุดบันทึก: จำว่า "ID_Item" ไหนถูกบวกเข้า Total ไปแล้วบ้าง

  useEffect(() => {
    const loadModels = async () => {
      try {
        clothesModelRef.current = await ort.InferenceSession.create("/models/best.onnx", {
          executionProviders: ["webgl", "wasm"], 
        });
        poseModelRef.current = await ort.InferenceSession.create("/models/yolo11n-pose.onnx", {
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

  // 🌟 ปุ่มรีเซ็ตยอดสะสม (เผื่อนับใหม่รอบถัดไป)
  const resetCounter = () => {
    setAccumulatedTotal(0);
    countedHistory.current.clear();
    activeTracks.current = [];
  };

  // --------------------------------------------------------
  // ลูปที่ 1: วาดภาพและแสดง ID ของแต่ละคน
  // --------------------------------------------------------
  const renderLoop = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0) { requestAnimationFrame(renderLoop); return; }
    if (canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / 640; const scaleY = canvas.height / 640;
    const lineWidth = Math.max(3, canvas.width / 200);

    const { persons, clothes } = latestUIData.current;

    // 1. วาดกรอบเสื้อผ้า
    clothes.forEach(box => {
      const x = box.x1 * scaleX, y = box.y1 * scaleY, w = box.w * scaleX, h = box.h * scaleY;
      ctx.strokeStyle = "#10b981"; ctx.lineWidth = lineWidth; ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = "#10b981"; ctx.fillRect(x, y - 25, ctx.measureText(box.item).width + 20, 25);
      ctx.fillStyle = "#000000"; ctx.font = "600 16px 'Kanit'"; ctx.fillText(box.item, x + 10, y - 7);
    });

    // 2. 🌟 วาดกรอบคน พร้อมโชว์ "ID ประจำตัว" บนหัว
    persons.forEach(person => {
      const x = person.x1 * scaleX, y = person.y1 * scaleY, w = person.w * scaleX, h = person.h * scaleY;
      ctx.strokeStyle = "#eab308"; ctx.lineWidth = lineWidth; ctx.strokeRect(x, y, w, h);

      const itemsList = person.items.length > 0 ? ` [${person.items.join(", ")}]` : "";
      // แสดงข้อความเช่น "Person #1 (13.0 kg)"
      const text = `👤 Person #${person.id} (${person.carbon.toFixed(1)} kg)${itemsList}`;
      
      ctx.fillStyle = "#eab308"; ctx.fillRect(x, y - 35, ctx.measureText(text).width + 30, 35);
      ctx.fillStyle = "#000000"; ctx.font = "bold 18px 'Kanit'"; ctx.fillText(text, x + 10, y - 10);
    });

    requestAnimationFrame(renderLoop);
  };

  // --------------------------------------------------------
  // ลูปที่ 2: AI + Tracking + บันทึกยอดสะสม
  // --------------------------------------------------------
  const runAILoop = async () => {
    if (!videoRef.current || !hiddenCanvasRef.current || !clothesModelRef.current || !poseModelRef.current) return;
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
      
      const [resultsClothes, resultsPose] = await Promise.all([
        clothesModelRef.current.run({ images: tensor }),
        poseModelRef.current.run({ images: tensor })
      ]);
      const outClothes = resultsClothes[clothesModelRef.current.outputNames[0]].data;
      const outPose = resultsPose[poseModelRef.current.outputNames[0]].data;

      // --- 1. ดึงกรอบคนปัจจุบัน ---
      let currentPersons = [];
      for (let index = 0; index < 8400; index++) {
        const conf = outPose[4 * 8400 + index];
        if (conf > 0.60) {
          const xc = outPose[0 * 8400 + index], yc = outPose[1 * 8400 + index], w = outPose[2 * 8400 + index], h = outPose[3 * 8400 + index];
          currentPersons.push({ conf, xc, yc, w, h, x1: xc - w/2, y1: yc - h/2, x2: xc + w/2, y2: yc + h/2, items: [], carbon: CARBON_DB["person"] });
        }
      }
      currentPersons = applyNMS(currentPersons, 0.4);

      // --- 2. 🌟 ระบบจับคู่ ID (Centroid Tracking) 🌟 ---
      const MAX_DISTANCE = 100; // ถ้าระยะขยับเกิน 100 พิกเซล ถือว่าเป็นคนใหม่ทันที
      let updatedTracks = [];

      currentPersons.forEach(person => {
        let matchedTrack = null;
        let minDist = Infinity;

        // เทียบจุดกึ่งกลางของคนนี้ กับประวัติคนในเฟรมที่แล้ว
        activeTracks.current.forEach(track => {
          const dist = getDistance(person, track);
          if (dist < minDist && dist < MAX_DISTANCE) {
            minDist = dist; matchedTrack = track;
          }
        });

        if (matchedTrack) {
          // คนเดิม! สืบทอด ID เดิมต่อ
          person.id = matchedTrack.id;
          // ลบแทร็กที่จับคู่แล้วออก จะได้ไม่โดนคนอื่นแย่ง
          activeTracks.current = activeTracks.current.filter(t => t.id !== matchedTrack.id);
        } else {
          // คนใหม่! ออก ID ใหม่ให้เลย
          person.id = nextPersonId.current++;
        }
        updatedTracks.push(person);
      });
      
      // อัปเดตรายชื่อคนในกล้องปัจจุบัน
      activeTracks.current = updatedTracks;

      // --- 3. ดึงกรอบเสื้อผ้า และยัดใส่มือเจ้าของ ---
      let currentClothes = [];
      for (let index = 0; index < 8400; index++) {
        let maxConf = 0; let classId = -1;
        for (let c = 0; c < 12; c++) {
          const conf = outClothes[(c + 4) * 8400 + index];
          if (conf > maxConf) { maxConf = conf; classId = c; }
        }
        if (maxConf > 0.60) {
          const xc = outClothes[0 * 8400 + index], yc = outClothes[1 * 8400 + index], w = outClothes[2 * 8400 + index], h = outClothes[3 * 8400 + index];
          currentClothes.push({ item: CLOTHES_CLASSES[classId], conf: maxConf, xc, yc, w, h, x1: xc - w/2, y1: yc - h/2, x2: xc + w/2, y2: yc + h/2 });
        }
      }
      currentClothes = applyNMS(currentClothes, 0.4);

      currentClothes.forEach(cloth => {
        let bestPerson = null; let minDist = Infinity;
        updatedTracks.forEach(person => {
          if (cloth.xc >= person.x1 && cloth.xc <= person.x2 && cloth.yc >= person.y1 && cloth.yc <= person.y2) {
            const dist = getDistance(cloth, person);
            if (dist < minDist) { minDist = dist; bestPerson = person; }
          }
        });
        if (bestPerson && !bestPerson.items.includes(cloth.item)) {
          bestPerson.items.push(cloth.item);
          bestPerson.carbon += CARBON_DB[cloth.item];
        }
      });

      // --- 4. 🌟 ล็อกยอดสะสม (Accumulation Logic) 🌟 ---
      let newCarbonToAdd = 0;

      updatedTracks.forEach(person => {
        // 4.1 เช็คตัวคนก่อน ถ้านาย ID นี้ยังไม่เคยบวกค่าตัวคน (+1.0) ให้นับเลย
        const personUniqueKey = `ID_${person.id}_base`;
        if (!countedHistory.current.has(personUniqueKey)) {
          countedHistory.current.add(personUniqueKey);
          newCarbonToAdd += CARBON_DB["person"];
        }

        // 4.2 เช็คเสื้อผ้าแต่ละชิ้นบนตัวเขา
        person.items.forEach(itemName => {
          const itemUniqueKey = `ID_${person.id}_${itemName}`;
          if (!countedHistory.current.has(itemUniqueKey)) {
            countedHistory.current.add(itemUniqueKey);
            newCarbonToAdd += CARBON_DB[itemName] || 0;
          }
        });
      });

      // บวกยอดใหม่เข้ายอดสะสมหลักอย่างปลอดภัย
      if (newCarbonToAdd > 0) {
        setAccumulatedTotal(prev => prev + newCarbonToAdd);
      }

      // ส่งข้อมูลไปวาด UI
      latestUIData.current = { persons: updatedTracks, clothes: currentClothes };
      setCurrentTrackedUsers([...updatedTracks]);

    } catch (e) { console.error(e); } 
    finally { isDetecting.current = false; setTimeout(runAILoop, 150); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 to-neutral-950 flex items-center justify-center p-4">
      <canvas ref={hiddenCanvasRef} width="640" height="640" className="hidden" />

      <div className="w-full max-w-6xl bg-neutral-800/80 backdrop-blur-xl border border-neutral-700/50 rounded-[2rem] shadow-2xl p-4 md:p-6 flex flex-col lg:flex-row gap-6 relative overflow-hidden">
        
        {!isLoaded && (
          <div className="absolute inset-0 z-50 bg-neutral-900/90 flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
            <h2 className="text-2xl font-semibold text-emerald-400">เตรียมระบบ Centroid Tracker...</h2>
          </div>
        )}

        {/* โซนกล้อง */}
        <div className="flex-1 bg-black rounded-2xl overflow-hidden relative shadow-inner border border-neutral-700 min-h-[50vh] md:min-h-[60vh] flex">
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover z-10" />

          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-neutral-600 flex items-center gap-2 z-20">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-sm font-medium text-gray-200 uppercase tracking-widest">Live Scan</span>
          </div>

          <button onClick={toggleCamera} className="absolute top-4 right-4 bg-neutral-900/70 hover:bg-emerald-600 backdrop-blur-md p-3 rounded-full border border-neutral-600 transition-colors z-20 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
          </button>
        </div>

        {/* โซน Dashboard */}
        <div className="w-full lg:w-[380px] flex flex-col gap-4">
          <div className="flex justify-between items-start px-2">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300 tracking-wide">
                CarbonLens AI
              </h1>
              <p className="text-neutral-400 text-sm mt-1">Smart Tracking & Accumulation</p>
            </div>
            {/* 🌟 ปุ่ม Reset สีแดงหรูๆ เผื่อต้องการเริ่มนับยอด Total ใหม่ */}
            <button 
              onClick={resetCounter} 
              className="bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-md"
            >
              <i className="fa-solid fa-rotate-left mr-1"></i> รีเซ็ตยอด
            </button>
          </div>

          {/* การ์ด ยอดสะสมรวม (Accumulated Total) */}
          <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/20 p-6 rounded-2xl border border-emerald-500/20 shadow-lg relative overflow-hidden">
            <h2 className="text-emerald-300/80 text-sm font-semibold uppercase tracking-wider mb-1">Accumulated Impact</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black text-emerald-400 tabular-nums">
                {accumulatedTotal.toFixed(1)}
              </span>
              <span className="text-xl font-bold text-emerald-500/70">kgCO₂</span>
            </div>
            <p className="text-xs text-neutral-400 mt-2 italic">*ล็อกยอดอัตโนมัติ ไม่บวกซ้ำคนเดิม</p>
          </div>

          {/* ลิสต์แสดงสถานะ "คนในกล้อง ณ ปัจจุบัน" */}
          <div className="bg-neutral-800/50 p-6 rounded-2xl border border-neutral-700/50 flex-1 overflow-y-auto max-h-[300px] md:max-h-[400px] scrollbar-thin scrollbar-thumb-neutral-600">
            <h2 className="text-neutral-400 text-sm font-semibold uppercase tracking-wider mb-4">Active Users In Frame</h2>
            
            {currentTrackedUsers.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 italic">
                ไม่มีคนยืนอยู่หน้ากล้อง...
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {currentTrackedUsers.map((usr) => (
                  <li key={usr.id} className="flex flex-col bg-neutral-900/60 p-4 rounded-xl border border-neutral-700">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-yellow-500 text-lg">Person #{usr.id}</span>
                      <span className="text-emerald-400 font-bold bg-emerald-400/10 px-2.5 py-1 rounded-lg text-xs">
                        +{usr.carbon.toFixed(1)} kg
                      </span>
                    </div>
                    {usr.items.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {usr.items.map((item, i) => (
                          <span key={i} className="bg-neutral-800 text-neutral-300 text-xs px-2 py-0.5 rounded border border-neutral-700 capitalize">
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-500 italic">ไม่มีเสื้อผ้าในระบบ</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}