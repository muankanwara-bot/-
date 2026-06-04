import React, { useRef, useState, useEffect } from 'react';
import { ShieldCheck, RotateCcw, Upload, FileSignature } from 'lucide-react';

interface SignaturePadProps {
  onSave: (signatureBase64: string) => void;
  initialSignature?: string;
}

export default function SignaturePad({ onSave, initialSignature }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(initialSignature || null);
  const [mode, setMode] = useState<'draw' | 'upload'>('draw');

  // Track the signature in mode updates
  useEffect(() => {
    if (initialSignature) {
      setUploadPreview(initialSignature);
      if (initialSignature.startsWith('data:image')) {
        setHasSignature(true);
      }
    }
  }, [initialSignature]);

  // Init canvas drawing setup
  const getCoordinates = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Support responsive canvas coordinates scaled correctly
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    // Scale coordinates correctly according to canvas internal resolution width/height
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    return { x, y };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e.nativeEvent);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e3a8a'; // Deep blue
    
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e.nativeEvent);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);

    // Save as base64 on the fly
    const base64 = canvas.toDataURL('image/png');
    onSave(base64);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
      onSave('');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setUploadPreview(base64);
        setHasSignature(true);
        onSave(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <FileSignature className="w-4 h-4 text-emerald-600" />
          ลายมือชื่อผู้ควบคุม (จำเป็น)
        </label>
        
        <div className="flex gap-1 bg-slate-200/60 p-1 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => { setMode('draw'); }}
            className={`px-3 py-1 rounded-md transition-all font-medium ${
              mode === 'draw' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            วาดลายเซ็น
          </button>
          <button
            type="button"
            onClick={() => { setMode('upload'); }}
            className={`px-3 py-1 rounded-md transition-all font-medium ${
              mode === 'upload' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            อัปโหลดไฟล์รูป
          </button>
        </div>
      </div>

      {mode === 'draw' ? (
        <div>
          <div className="relative bg-white border border-slate-200 rounded-lg overflow-hidden h-36 flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={500}
              height={180}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-full cursor-crosshair touch-none"
            />
            {!hasSignature && (
              <span className="absolute text-slate-400 text-xs pointer-events-none select-none">
                ลากนิ้วหรือเมาส์เพื่อเซ็นชื่อลงในกรอบนี้
              </span>
            )}
          </div>
          
          <div className="flex justify-between items-center mt-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              ลายเซ็นอิเล็กทรอนิกส์ที่ปลอดภัย
            </div>
            
            <button
              type="button"
              onClick={clearCanvas}
              className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 font-medium py-1 px-2.5 rounded hover:bg-rose-50 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              ล้างลายเซ็น
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-slate-50 transition-colors">
              {uploadPreview ? (
                <div className="relative w-full h-full p-2 flex items-center justify-center">
                  <img
                    src={uploadPreview}
                    alt="Signature preview"
                    className="max-h-full max-w-full object-contain pointer-events-none"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setUploadPreview(null);
                      setHasSignature(false);
                      onSave('');
                    }}
                    className="absolute top-1.5 right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1 shadow-sm transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 text-slate-400 mb-1" />
                  <p className="mb-1 text-xs text-slate-600 font-medium">อัปโหลดภาพลายเซ็นผู้ควบคุม</p>
                  <p className="text-[10px] text-slate-400">PNG, JPG, SVG (ขนาดไม่เกิน 2MB)</p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
