'use client';

import React, { useRef, useState, useEffect } from 'react';
import { PenTool, Upload, RefreshCw, Check, X, Image as ImageIcon, Sparkles, Palette } from 'lucide-react';

interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void;
  initialSignature?: string;
  title?: string;
}

export const SignaturePadModal: React.FC<SignaturePadModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSignature,
  title = 'ลงลายมือชื่อดิจิทัล (Digital Signature)'
}) => {
  const [activeTab, setActiveTab] = useState<'draw' | 'upload'>('draw');
  const [uploadedImage, setUploadedImage] = useState<string | null>(initialSignature || null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState<string>('#0038a8'); // Default: Official Royal Blue Pen Ink

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  // Canvas Drawing setup
  useEffect(() => {
    if (!isOpen || activeTab !== 'draw') return;

    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Handle high DPI
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      ctx.scale(2, 2);

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = penColor;
      ctx.lineWidth = 2.8;

      // Clear
      ctx.clearRect(0, 0, rect.width, rect.height);
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, activeTab]);

  // Update strokeStyle when penColor changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = penColor;
  }, [penColor]);

  if (!isOpen) return null;

  // Drawing event handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    setHasDrawn(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Image Upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setUploadedImage(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    if (activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) {
        alert('กรุณาเซ็นชื่อบนกระดานก่อนกดยืนยัน');
        return;
      }
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
    } else {
      if (!uploadedImage) {
        alert('กรุณาเลือกไฟล์รูปลายเซ็น');
        return;
      }
      onSave(uploadedImage);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">{title}</h3>
              <p className="text-xs text-slate-500">เซ็นชื่อหมึกน้ำเงินแบบปากกาจริง หรืออัปโหลดไฟล์รูปลายเซ็น</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-100 p-1 rounded-2xl my-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('draw')}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'draw'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>วาดเซ็นสด (หมึกน้ำเงินจริง)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'upload'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>อัปโหลดรูปลายเซ็น</span>
          </button>
        </div>

        {/* Content */}
        {activeTab === 'draw' ? (
          <div className="space-y-2">
            {/* Color Switcher */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Palette className="w-3.5 h-3.5 text-slate-500" />
                <span>สีหมึกปากกา:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPenColor('#0038a8')}
                    className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold transition-all ${
                      penColor === '#0038a8'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-300'
                        : 'bg-white text-blue-800 border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-300 inline-block"></span>
                    <span>หมึกน้ำเงิน (ปากกาจริง)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPenColor('#0f172a')}
                    className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold transition-all ${
                      penColor === '#0f172a'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-slate-400'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-slate-800 inline-block"></span>
                    <span>หมึกดำ</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={clearCanvas}
                className="px-2.5 py-0.5 text-slate-500 hover:text-rose-600 font-medium text-xs flex items-center gap-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>ล้างลายเซ็น</span>
              </button>
            </div>

            {/* Canvas */}
            <div className="relative border-2 border-dashed border-blue-200 rounded-2xl bg-slate-50/50 overflow-hidden touch-none h-44 shadow-inner">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-full cursor-crosshair bg-white"
              />
              {!hasDrawn && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-blue-300 text-xs gap-1">
                  <PenTool className="w-6 h-6 opacity-60 text-blue-500" />
                  <span className="font-semibold">ลากเมาส์ / ใช้นิ้วมือวาดลายเซ็นที่นี่ (หมึกน้ำเงิน)</span>
                </div>
              )}
            </div>
            <div className="text-right">
              <span className="text-slate-400 text-[10px]">* ลายเซ็นหมึกน้ำเงินจะถูกประทับลงในเอกสารราชการจริงโดยอัตโนมัติ</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
              {uploadedImage ? (
                <div className="space-y-3">
                  <div className="h-28 flex items-center justify-center bg-white rounded-xl border border-slate-200 p-2">
                    <img src={uploadedImage} alt="Signature Preview" className="max-h-full max-w-full object-contain" />
                  </div>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs cursor-pointer hover:bg-blue-100">
                    <Upload className="w-3.5 h-3.5" />
                    <span>เปลี่ยนรูปภาพใหม่</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-2 py-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                  <div className="font-bold text-slate-700 text-xs">คลิกเพื่อเลือกไฟล์รูปลายเซ็น (PNG / JPG)</div>
                  <div className="text-[11px] text-slate-400">แนะนำภาพลายเซ็นพื้นหลังโปร่งใสหรือพื้นหลังสีขาว</div>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-xs"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-200 flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>ใช้ลายเซ็นนี้</span>
          </button>
        </div>
      </div>
    </div>
  );
};
