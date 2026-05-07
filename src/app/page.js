"use client";

import { useEffect, useRef, useState } from "react";
import * as ort from "onnxruntime-web";

const CARBON_DB = {
  person: 1.0,
  jacket: 12.0,
  shirt: 3.0,
  short: 2.0,
  "long-dress": 8.0,
  "long-skirt": 5.0,
  "midi-dress": 6.0,
  "midi-skirt": 4.0,
  pants: 5.5,
  "short-dress": 4.5,
  "short-skirt": 2.5,
  sweater: 9.0,
  Tshirt: 2.5,
};

const CLOTHES_CLASSES = [
  "Tshirt",
  "jacket",
  "long-dress",
  "long-skirt",
  "midi-dress",
  "midi-skirt",
  "pants",
  "shirt",
  "short",
  "short-dress",
  "short-skirt",
  "sweater",
];

export default function CarbonDashboard() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const hiddenCanvasRef = useRef(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [stableTotal, setStableTotal] = useState(0);
  const [stableItems, setStableItems] = useState([]);

  // 🌟 State สำหรับสลับกล้องหน้า/หลัง
  const [facingMode, setFacingMode] = useState("environment"); // เริ่มต้นด้วยกล้องหลัง

  const modelRef = useRef(null);
  const isDetecting = useRef(false);
  const latestBoxes = useRef([]);
  const historyBuffer = useRef([]);

  // โหลดโมเดลแค่ครั้งแรก
  useEffect(() => {
    const loadModel = async () => {
      try {
        // เพิ่ม webgl เพื่อพยายามใช้การ์ดจอมือถือ (ถ้ามี) จะทำให้เร็วกว่าเดิมมาก
        modelRef.current = await ort.InferenceSession.create(
          "/models/best.onnx",
          {
            executionProviders: ["webgl", "wasm"],
          },
        );
        setIsLoaded(true);
      } catch (error) {
        console.error("โหลดโมเดลไม่สำเร็จ:", error);
      }
    };
    loadModel();
  }, []);

  // 🌟 เปิดกล้องใหม่ทุกครั้งที่ค่า facingMode เปลี่ยน
  useEffect(() => {
    if (isLoaded) {
      startWebcam();
    }
  }, [facingMode, isLoaded]);

  const startWebcam = async () => {
    try {
      // 1. ปิดกล้องเก่าก่อน (เพื่อไม่ให้ค้างตอนสลับกล้อง)
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }

      // 2. ขอเปิดกล้องตามโหมดหน้า/หลัง
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
      console.error(error);
      alert("ไม่สามารถเข้าถึงกล้องได้ กรุณาตรวจสอบสิทธิ์การใช้งานครับ");
    }
  };

  // 🌟 ฟังก์ชันสลับกล้อง
  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  // --------------------------------------------------------
  // ลูปที่ 1: วาด "แผ่นกระจกใส" ทับวิดีโอ (คืนความลื่นไหลให้มือถือ)
  // --------------------------------------------------------
  const renderLoop = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0) {
      requestAnimationFrame(renderLoop);
      return;
    }

    // เซ็ตขนาดกระจกใสให้เท่ากับขนาดวิดีโอเป๊ะๆ
    if (canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext("2d");

    // 🌟 เคลียร์กระจกใสให้สะอาดทุกเฟรม (ไม่ได้ลอกภาพจากวิดีโอแล้ว ปล่อย HTML5 ทำงานแทน)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const boxes = latestBoxes.current;
    boxes.forEach((box) => {
      const scaleX = canvas.width / 640;
      const scaleY = canvas.height / 640;

      const x = box.x1 * scaleX;
      const y = box.y1 * scaleY;
      const w = box.w * scaleX;
      const h = box.h * scaleY;

      // วาดกล่องเขียว
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = Math.max(3, canvas.width / 200);
      ctx.strokeRect(x, y, w, h);

      // วาดป้ายชื่อ
      ctx.fillStyle = "#10b981";
      ctx.fillRect(x, y - 30, ctx.measureText(box.item).width + 30, 30);
      ctx.fillStyle = "#000000";
      ctx.font = "600 18px 'Kanit'";
      ctx.fillText(box.item, x + 10, y - 8);
    });

    requestAnimationFrame(renderLoop);
  };

  // --------------------------------------------------------
  // ลูปที่ 2: แอบเอาภาพส่งให้ AI (รันแบบชิลๆ เบื้องหลัง)
  // --------------------------------------------------------
  const runAILoop = async () => {
    if (!videoRef.current || !hiddenCanvasRef.current || !modelRef.current)
      return;

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

      let currentItemsInFrame = new Set(["person"]);
      let newBoxes = [];

      for (let index = 0; index < 8400; index++) {
        let maxConf = 0;
        let classId = -1;
        for (let c = 0; c < 12; c++) {
          const conf = output[(c + 4) * 8400 + index];
          if (conf > maxConf) {
            maxConf = conf;
            classId = c;
          }
        }

        if (maxConf > 0.65) {
          const xc = output[0 * 8400 + index];
          const yc = output[1 * 8400 + index];
          const w = output[2 * 8400 + index];
          const h = output[3 * 8400 + index];

          const itemName = CLOTHES_CLASSES[classId];
          currentItemsInFrame.add(itemName);
          newBoxes.push({
            item: itemName,
            x1: xc - w / 2,
            y1: yc - h / 2,
            w,
            h,
          });
        }
      }

      latestBoxes.current = newBoxes;

      historyBuffer.current.push(Array.from(currentItemsInFrame));
      if (historyBuffer.current.length > 15) historyBuffer.current.shift();

      const itemCounts = {};
      historyBuffer.current.flat().forEach((item) => {
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
      setTimeout(runAILoop, 100);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 to-neutral-950 flex items-center justify-center p-4">
      {/* Canvas ลับให้ AI แอบดึงภาพ (ขนาด 640x640) */}
      <canvas
        ref={hiddenCanvasRef}
        width="640"
        height="640"
        className="hidden"
      />

      {/* กรอบ Main Container */}
      <div className="w-full max-w-6xl bg-neutral-800/80 backdrop-blur-xl border border-neutral-700/50 rounded-[2rem] shadow-2xl p-4 md:p-6 flex flex-col lg:flex-row gap-6 relative overflow-hidden">
        {!isLoaded && (
          <div className="absolute inset-0 z-50 bg-neutral-900/90 flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
            <h2 className="text-2xl font-semibold text-emerald-400">
              เตรียมระบบ AI...
            </h2>
          </div>
        )}

        {/* โซนกล้อง (เปลี่ยนโครงสร้างใหม่ทั้งหมด!) */}
        <div className="flex-1 bg-black rounded-2xl overflow-hidden relative shadow-inner border border-neutral-700 min-h-[50vh] md:min-h-[60vh] flex">
          {/* 1. วิดีโอสดเล่นอยู่ข้างล่างสุด (ลื่นไหล 100%) */}
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
          />

          {/* 2. กระจกใสสำหรับวาดกรอบแปะทับ (ขนาดพอดีเป๊ะ) */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover z-10"
          />

          {/* ป้ายบอกสถานะ */}
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-neutral-600 flex items-center gap-2 z-20">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-sm font-medium text-gray-200 uppercase tracking-widest">
              Live Scan
            </span>
          </div>

          {/* 🌟 ปุ่มกดสลับกล้องหน้า-หลัง (อยู่มุมขวาบน) */}
          <button
            onClick={toggleCamera}
            className="absolute top-4 right-4 bg-neutral-900/70 hover:bg-emerald-600 backdrop-blur-md p-3 rounded-full border border-neutral-600 transition-colors z-20 shadow-lg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            >
              <path d="M21 2v6h-6"></path>
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
              <path d="M3 22v-6h6"></path>
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
            </svg>
          </button>
        </div>

        {/* โซน Dashboard (ขวา) */}
        <div className="w-full lg:w-[380px] flex flex-col gap-4">
          <div className="mb-2 px-2 text-center lg:text-left">
            <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300 tracking-wide">
              CarbonLens AI
            </h1>
            <p className="text-neutral-400 text-sm mt-1">
              Real-time footprint estimation
            </p>
          </div>

          <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/20 p-6 rounded-2xl border border-emerald-500/20 shadow-lg relative overflow-hidden">
            <h2 className="text-emerald-300/80 text-sm font-semibold uppercase tracking-wider mb-1">
              Total Impact
            </h2>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black text-emerald-400 tabular-nums">
                {stableTotal.toFixed(1)}
              </span>
              <span className="text-xl font-bold text-emerald-500/70">
                kgCO₂
              </span>
            </div>
          </div>

          <div className="bg-neutral-800/50 p-6 rounded-2xl border border-neutral-700/50 flex-1 overflow-y-auto max-h-[300px] md:max-h-[400px] scrollbar-thin scrollbar-thumb-neutral-600">
            <h2 className="text-neutral-400 text-sm font-semibold uppercase tracking-wider mb-4">
              Detected Items
            </h2>

            {stableItems.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 italic">
                กำลังวิเคราะห์เสื้อผ้า...
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {stableItems.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex justify-between items-center bg-neutral-900/60 p-4 rounded-xl border border-neutral-700 hover:border-emerald-500/30 transition-colors"
                  >
                    <span className="capitalize font-medium text-neutral-200 text-lg">
                      {item}
                    </span>
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
