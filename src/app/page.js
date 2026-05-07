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
  const hiddenCanvasRef = useRef(null); 
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [stableTotal, setStableTotal] = useState(0);
  const [stableItems, setStableItems] = useState([]);

  const modelRef = useRef(null);
  const isDetecting = useRef(false); 
  const latestBoxes = useRef([]); 
  const historyBuffer = useRef([]); 

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
      // 🌟 เลิกบังคับขนาด 1280x720 ปล่อยให้มือถือเลือกขนาดที่ดีที่สุดของตัวเอง
      // และตั้งค่า ideal: "environment" เพื่อพยายามใช้กล้องหลังก่อน
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
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
      alert("กรุณาอนุญาตให้ใช้งานกล้องเว็บแคมครับ!");
    }
  };

  // --------------------------------------------------------
  // ลูปที่ 1: วาดภาพกล้องให้ลื่นที่สุด 60FPS (แก้ภาพยืดตรงนี้)
  // --------------------------------------------------------
  const renderLoop = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;

    // 🌟 ดึงขนาดดั้งเดิมของกล้องมือถือมาตั้งเป็นขนาด Canvas (แก้ภาพยืด 100%)
    if (video.videoWidth && canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext("2d");
    if (canvas.width === 0) {
       requestAnimationFrame(renderLoop);
       return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const boxes = latestBoxes.current;
    boxes.forEach(box => {
      // ปรับขนาดกรอบให้เข้ากับสัดส่วนกล้องจริง ไม่ใช่สัดส่วนสมมติ
      const scaleX = canvas.width / 640;
      const scaleY = canvas.height / 640;
      
      const x = box.x1 * scaleX;
      const y = box.y1 * scaleY;
      const w = box.w * scaleX;
      const h = box.h * scaleY;

      ctx.strokeStyle = "#10b981"; 
      ctx.lineWidth = Math.max(2, canvas.width / 200); // ปรับเส้นหนาตามจอมือถือ
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = "#10b981";
      ctx.fillRect(x, y - 30, ctx.measureText(box.item).width + 30, 30);
      ctx.fillStyle = "#000000";
      ctx.font = "600 18px 'Kanit'";
      ctx.fillText(box.item, x + 10, y - 8);
    });

    requestAnimationFrame(renderLoop);
  };

  // --------------------------------------------------------
  // ลูปที่ 2: AI คิดเลข (ใส่เบรกแก้กระตุก)
  // --------------------------------------------------------
  const runAILoop = async () => {
    if (!videoRef.current || !hiddenCanvasRef.current || !modelRef.current) return;
    
    if (isDetecting.current || videoRef.current.videoWidth === 0) {
        setTimeout(runAILoop, 10);
        return;
    }
    
    isDetecting.current = true;

    try {
      const video = videoRef.current;
      const hCanvas = hiddenCanvasRef.current;
      const hCtx = hCanvas.getContext("2d", { willReadFrequently: true });

      // ดึงภาพมาย่อให้ AI ดู
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

      let currentItemsInFrame = new Set(["person"]); 
      let newBoxes = [];

      for (let index = 0; index < 8400; index++) {
        let maxConf = 0;
        let classId = -1;
        for (let c = 0; c < 12; c++) {
          const conf = output[(c + 4) * 8400 + index];
          if (conf > maxConf) { maxConf = conf; classId = c; }
        }

        if (maxConf > 0.65) { 
          const xc = output[0 * 8400 + index];
          const yc = output[1 * 8400 + index];
          const w = output[2 * 8400 + index];
          const h = output[3 * 8400 + index];

          const itemName = CLOTHES_CLASSES[classId];
          currentItemsInFrame.add(itemName);
          newBoxes.push({ item: itemName, x1: xc - w / 2, y1: yc - h / 2, w, h });
        }
      }

      latestBoxes.current = newBoxes;

      historyBuffer.current.push(Array.from(currentItemsInFrame));
      if (historyBuffer.current.length > 15) {
        historyBuffer.current.shift();
      }

      const itemCounts = {};
      historyBuffer.current.flat().forEach(item => {
        itemCounts[item] = (itemCounts[item] || 0) + 1;
      });

      let stableItemsList = [];
      let calculatedCarbon = 0;
      
      for (const [item, count] of Object.entries(itemCounts)) {
        if (count >= 5) {
          stableItemsList.push(item);
          calculatedCarbon += CARBON_DB[item] || 0;
        }
      }

      setStableItems(stableItemsList);
      setStableTotal(calculatedCarbon);

    } catch (e) {
      console.error(e);
    } finally {
      isDetecting.current = false;
      // 🌟 ใส่เบรกแก้กระตุก! ให้เบราว์เซอร์พักหายใจ 100 มิลลิวินาที (ทำงาน ~10 FPS)
      setTimeout(runAILoop, 100); 
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 to-neutral-950 flex items-center justify-center p-4">
      
      <canvas ref={hiddenCanvasRef} width="640" height="640" className="hidden" />
      <video ref={videoRef} className="hidden" playsInline muted />

      {/* กรอบ Main Container */}
      <div className="w-full max-w-6xl bg-neutral-800/80 backdrop-blur-xl border border-neutral-700/50 rounded-[2rem] shadow-2xl p-4 md:p-6 flex flex-col lg:flex-row gap-6 relative overflow-hidden">
        
        {!isLoaded && (
          <div className="absolute inset-0 z-50 bg-neutral-900/90 flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
            <h2 className="text-2xl font-semibold text-emerald-400">เตรียมระบบ AI...</h2>
          </div>
        )}

        {/* 🌟 โซนกล้อง (เปลี่ยน CSS เป็น object-cover เพื่อให้สวยงามไม่ว่าจะจอคอมหรือมือถือ) */}
        <div className="flex-1 bg-black rounded-2xl overflow-hidden relative shadow-inner border border-neutral-700 min-h-[50vh] md:min-h-[60vh]">
          <canvas 
            ref={canvasRef} 
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-neutral-600 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-sm font-medium text-gray-200 uppercase tracking-widest">Live Scan</span>
          </div>
        </div>

        {/* โซน Dashboard (ขวา) */}
        <div className="w-full lg:w-[380px] flex flex-col gap-4">
          <div className="mb-2 px-2 text-center lg:text-left">
            <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300 tracking-wide">
              CarbonLens AI
            </h1>
            <p className="text-neutral-400 text-sm mt-1">Real-time footprint estimation</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/20 p-6 rounded-2xl border border-emerald-500/20 shadow-lg relative overflow-hidden">
            <h2 className="text-emerald-300/80 text-sm font-semibold uppercase tracking-wider mb-1">Total Impact</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black text-emerald-400 tabular-nums">
                {stableTotal.toFixed(1)}
              </span>
              <span className="text-xl font-bold text-emerald-500/70">kgCO₂</span>
            </div>
          </div>

          <div className="bg-neutral-800/50 p-6 rounded-2xl border border-neutral-700/50 flex-1 overflow-y-auto max-h-[300px] md:max-h-[400px] scrollbar-thin scrollbar-thumb-neutral-600">
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