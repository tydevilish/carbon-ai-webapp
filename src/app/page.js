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

export default function CarbonDashboard() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const hiddenCanvasRef = useRef(null); // แอบสร้างผืนผ้าใบซ่อนไว้ให้ AI ดึงภาพไปคิด
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [stableTotal, setStableTotal] = useState(0);
  const [stableItems, setStableItems] = useState([]);

  const modelRef = useRef(null);
  const isDetecting = useRef(false); // เช็คว่า AI กำลังคิดอยู่ไหม
  const latestBoxes = useRef([]); // เก็บกรอบล่าสุดที่ AI คิดเสร็จ
  const historyBuffer = useRef([]); // กล่องความจำสำหรับระบบโหวต (กันกระพริบ)

  useEffect(() => {
    const loadModel = async () => {
      try {
        modelRef.current = await ort.InferenceSession.create("/models/best.onnx", {
          executionProviders: ["wasm"],
        });
        setIsLoaded(true);
        startWebcam();
      } catch (error) {
        console.error("โหลดโมเดลไม่สำเร็จ:", error);
      }
    };
    loadModel();
  }, []);

  const startWebcam = async () => {
    try {
      // ขอเปิดกล้องความละเอียดสูง
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          renderLoop(); // เริ่มลูปวาดภาพให้คนดู (60 FPS)
          runAILoop();  // เริ่มลูปคิดเลขของ AI (แอบทำเบื้องหลัง)
        };
      }
    } catch (error) {
      alert("กรุณาอนุญาตให้ใช้งานกล้องเว็บแคมครับ!");
    }
  };

  // --------------------------------------------------------
  // ลูปที่ 1: หน้าที่วาดภาพและกรอบให้สมูทที่สุด (ไม่รอ AI)
  // --------------------------------------------------------
  const renderLoop = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // วาดภาพวิดีโอปัจจุบัน
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // วาดกรอบจากข้อมูล "ล่าสุด" ที่ AI ส่งมาทิ้งไว้
    const boxes = latestBoxes.current;
    boxes.forEach(box => {
      // คำนวณ Scale เพราะ AI คิดบนภาพ 640x640 แต่จอเราใหญ่กว่านั้น
      const scaleX = canvas.width / 640;
      const scaleY = canvas.height / 640;
      
      const x = box.x1 * scaleX;
      const y = box.y1 * scaleY;
      const w = box.w * scaleX;
      const h = box.h * scaleY;

      ctx.strokeStyle = "#10b981"; // Emerald-500
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, w, h);

      // ป้ายชื่อ
      ctx.fillStyle = "#10b981";
      ctx.fillRect(x, y - 30, ctx.measureText(box.item).width + 30, 30);
      ctx.fillStyle = "#000000";
      ctx.font = "600 18px 'Kanit'";
      ctx.fillText(box.item, x + 10, y - 8);
    });

    requestAnimationFrame(renderLoop);
  };

  // --------------------------------------------------------
  // ลูปที่ 2: หน้าที่ AI ประมวลผลและระบบโหวต (แยกสมอง)
  // --------------------------------------------------------
  const runAILoop = async () => {
    if (!videoRef.current || !hiddenCanvasRef.current || !modelRef.current) return;
    
    // ถ้า AI ยังคิดเฟรมเก่าไม่เสร็จ ให้ข้ามไปเลย กล้องจะได้ไม่ค้าง
    if (isDetecting.current) {
        setTimeout(runAILoop, 10);
        return;
    }
    
    isDetecting.current = true;

    try {
      const video = videoRef.current;
      const hCanvas = hiddenCanvasRef.current;
      const hCtx = hCanvas.getContext("2d", { willReadFrequently: true });

      // ดึงภาพมาย่อเหลือ 640x640 ให้ AI ดู
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

      let currentItemsInFrame = new Set(["person"]); // มีคนเสมอ
      let newBoxes = [];

      for (let index = 0; index < 8400; index++) {
        let maxConf = 0;
        let classId = -1;
        for (let c = 0; c < 12; c++) {
          const conf = output[(c + 4) * 8400 + index];
          if (conf > maxConf) { maxConf = conf; classId = c; }
        }

        if (maxConf > 0.65) { // ปรับความเข้มงวดขึ้นนิดนึง
          const xc = output[0 * 8400 + index];
          const yc = output[1 * 8400 + index];
          const w = output[2 * 8400 + index];
          const h = output[3 * 8400 + index];

          const itemName = CLOTHES_CLASSES[classId];
          currentItemsInFrame.add(itemName);
          newBoxes.push({ item: itemName, x1: xc - w / 2, y1: yc - h / 2, w, h });
        }
      }

      // ส่งกรอบไปให้ลูปวาดภาพ
      latestBoxes.current = newBoxes;

      // 🌟 ระบบโหวต (Voting System) นิ่งกริ๊บ 🌟
      // จำข้อมูลย้อนหลัง 15 เฟรม
      historyBuffer.current.push(Array.from(currentItemsInFrame));
      if (historyBuffer.current.length > 15) {
        historyBuffer.current.shift();
      }

      // นับคะแนนโหวต
      const itemCounts = {};
      historyBuffer.current.flat().forEach(item => {
        itemCounts[item] = (itemCounts[item] || 0) + 1;
      });

      // ถ้าของชิ้นไหนโผล่มาเกิน 5 โหวต (ประมาณ 1/3 ของความจำ) ถึงจะเชื่อว่าเป็นของจริง
      let stableItemsList = [];
      let calculatedCarbon = 0;
      
      for (const [item, count] of Object.entries(itemCounts)) {
        if (count >= 5) {
          stableItemsList.push(item);
          calculatedCarbon += CARBON_DB[item] || 0;
        }
      }

      // อัปเดต UI ด้วยค่าที่นิ่งแล้ว
      setStableItems(stableItemsList);
      setStableTotal(calculatedCarbon);

    } catch (e) {
      console.error(e);
    } finally {
      isDetecting.current = false;
      // ให้ AI รันต่อทันทีที่พักหายใจเสร็จ
      setTimeout(runAILoop, 0); 
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 to-neutral-950 flex items-center justify-center p-4">
      
      {/* ผืนผ้าใบซ่อนสำหรับ AI (จำเป็นต้องมีเพื่อไม่ให้กวนจอหลัก) */}
      <canvas ref={hiddenCanvasRef} width="640" height="640" className="hidden" />
      <video ref={videoRef} className="hidden" playsInline muted />

      {/* กรอบ Main Container ใหญ่ๆ อันเดียว */}
      <div className="w-full max-w-6xl bg-neutral-800/80 backdrop-blur-xl border border-neutral-700/50 rounded-[2rem] shadow-2xl p-6 flex flex-col lg:flex-row gap-6 relative overflow-hidden">
        
        {/* Loading Overlay */}
        {!isLoaded && (
          <div className="absolute inset-0 z-50 bg-neutral-900/90 flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
            <h2 className="text-2xl font-semibold text-emerald-400">เตรียมระบบ AI...</h2>
          </div>
        )}

        {/* โซนกล้องใหญ่ (ซ้าย) */}
        <div className="flex-1 bg-black rounded-2xl overflow-hidden relative shadow-inner border border-neutral-700">
          <canvas 
            ref={canvasRef} 
            width="1280" 
            height="720" 
            className="w-full h-full object-cover"
          />
          {/* ป้ายบอกสถานะมุมซ้ายบนของกล้อง */}
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-neutral-600 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-sm font-medium text-gray-200 uppercase tracking-widest">Live Scan</span>
          </div>
        </div>

        {/* โซน Dashboard (ขวา) แบบเรียบหรู */}
        <div className="w-full lg:w-[380px] flex flex-col gap-4">
          
          <div className="mb-4 px-2">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">
              CarbonLens AI
            </h1>
            <p className="text-neutral-400 text-sm mt-1">Real-time footprint estimation</p>
          </div>

          {/* การ์ด Total */}
          <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/20 p-6 rounded-2xl border border-emerald-500/20 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-500">
              {/* ไอคอนใบไม้ตกแต่ง */}
              <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor"><path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 7.03,11.54 7.64,12.5C8.7,14.24 10.83,14.9 12.06,15.07L13.56,11.53C12.39,11.23 11.26,10.63 10.35,9.75L11.75,8.33C12.44,9.05 13.31,9.54 14.27,9.78L15.34,7.29C14.54,7.06 13.8,6.64 13.19,6.05L14.61,4.64C15.93,5.92 17.78,6.59 19.66,6.44L20.5,8.41C19.3,8.58 18.11,8.44 17,8Z" /></svg>
            </div>
            <h2 className="text-emerald-300/80 text-sm font-semibold uppercase tracking-wider mb-1">Total Impact</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black text-emerald-400 tabular-nums">
                {stableTotal.toFixed(1)}
              </span>
              <span className="text-xl font-bold text-emerald-500/70">kgCO₂</span>
            </div>
          </div>

          {/* การ์ด Items */}
          <div className="bg-neutral-800/50 p-6 rounded-2xl border border-neutral-700/50 flex-1 overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-neutral-600">
            <h2 className="text-neutral-400 text-sm font-semibold uppercase tracking-wider mb-4">Detected Items</h2>
            
            {stableItems.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 italic">
                กำลังวิเคราะห์เสื้อผ้า...
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {stableItems.map((item, idx) => (
                  <li key={idx} className="flex justify-between items-center bg-neutral-900/60 p-4 rounded-xl border border-neutral-700 hover:border-emerald-500/30 transition-colors">
                    <span className="capitalize font-medium text-neutral-200 text-lg">{item}</span>
                    <span className="text-emerald-400 font-bold bg-emerald-400/10 px-3 py-1.5 rounded-lg text-sm">
                      +{CARBON_DB[item] || 0}
                    </span>
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