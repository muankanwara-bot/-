import React, { useState, useEffect } from 'react';
import { Student, InternshipLog } from '../types';
import { addLog, calculateHours, getLogs } from '../db';
import SignaturePad from './SignaturePad';
import { 
  FileText, Calendar, Clock, Sparkles, BookOpen, 
  HelpCircle, CheckCircle, PlusCircle, History, Home 
} from 'lucide-react';

interface LogFormProps {
  currentStudent: Student;
  onSuccess: (viewHistory: boolean) => void;
  onGoHome: () => void;
}

export default function LogForm({ currentStudent, onSuccess, onGoHome }: LogFormProps) {
  const [workDate, setWorkDate] = useState<string>(() => {
    // Default to today's date in local time
    return new Date().toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState<string>('08:30');
  const [endTime, setEndTime] = useState<string>('17:30');
  const [workDetail, setWorkDetail] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [signature, setSignature] = useState<string>('');

  // Automatically computed hours
  const [totalHours, setTotalHours] = useState<number>(0);

  // Error messages & Success view holding block
  const [formError, setFormError] = useState<string | null>(null);
  const [successView, setSuccessView] = useState<boolean>(false);

  // Auto calculate total hours when times change
  useEffect(() => {
    const hours = calculateHours(startTime, endTime);
    setTotalHours(hours);
  }, [startTime, endTime]);

  const insertWorkDetailTip = (tip: string) => {
    setWorkDetail(prev => {
      if (!prev) return tip;
      return prev + '\n' + tip;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // 1. Basic Required Fields Check (ขั้นตอน 4)
    if (!workDate || !startTime || !endTime || !workDetail.trim() || !signature) {
      setFormError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    // 2. Format / Constraint Checking (ขั้นตอน 5)
    
    // Check if start time is less than end time
    const computed = calculateHours(startTime, endTime);
    if (computed <= 0) {
      setFormError("เวลาเริ่มงานต้องน้อยกว่าเวลาสิ้นสุดงาน และจำนวนชั่วโมงต้องมากกว่า 0");
      return;
    }

    // Check duplicate work date for this student
    const existingLogs = getLogs();
    const isDuplicate = existingLogs.some(
      l => l.student_id === currentStudent.student_id && l.work_date === workDate
    );
    if (isDuplicate) {
      setFormError("ไม่สามารถบันทึกข้อมูลซ้ำในวันเดียวกันได้ (กรุณาเลือกวันที่บันทึกงานใหม่)");
      return;
    }

    // Attempt Database insertion (ขั้นตอน 6)
    const logData = {
      student_id: currentStudent.student_id,
      work_date: workDate,
      start_time: startTime,
      end_time: endTime,
      work_detail: workDetail.trim(),
      total_hours: computed,
      supervisor_signature: signature,
      note: note.trim()
    };

    const result = addLog(logData);
    if (result.success) {
      setSuccessView(true);
    } else {
      setFormError(result.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  const handleResetForm = () => {
    setWorkDate(new Date().toISOString().split('T')[0]);
    setStartTime('08:30');
    setEndTime('17:30');
    setWorkDetail('');
    setNote('');
    setSignature('');
    setFormError(null);
    setSuccessView(false);
  };

  // SUCCESS COMPONENT (ขั้นตอน 7)
  if (successView) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-lg mx-auto text-center shadow-lg space-y-6">
        <div className="inline-flex bg-emerald-100 rounded-full p-4 text-emerald-600 animate-bounce">
          <CheckCircle className="w-14 h-14" />
        </div>
        
        <div>
          <h2 className="text-2xl font-black text-emerald-800">✅ บันทึกข้อมูลสำเร็จ</h2>
          <p className="text-xs text-slate-500 font-medium mt-1.5">ระบบได้จัดเก็บใบงานสหกิจศึกษาเรียบร้อยแล้วและรอการตรวจสอบจากอาจารย์ประนิมิต</p>
        </div>

        <div className="flex flex-col gap-2.5 pt-4">
          <button
            onClick={handleResetForm}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-2xl text-xs transition-colors cursor-pointer shadow-sm w-full"
          >
            <PlusCircle className="w-4 h-4" />
            เพิ่มรายการใหม่ (Add New Log)
          </button>

          <button
            onClick={() => onSuccess(true)}
            className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-250 text-slate-700 font-bold py-3.5 px-6 rounded-2xl text-xs border border-slate-200 transition-colors cursor-pointer w-full"
          >
            <History className="w-4 h-4" />
            ดูประวัติการฝึกงาน (View History)
          </button>

          <button
            onClick={onGoHome}
            className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-600 font-semibold py-3 px-6 rounded-2xl text-xs border border-slate-200 transition-colors cursor-pointer w-full"
          >
            <Home className="w-4 h-4" />
            กลับหน้าหลัก (Back to Home)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden max-w-3xl mx-auto">
      <div className="bg-slate-950 p-6 text-white flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-base flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            แบบฟอร์มบันทึกการฝึกงานประจําวัน
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">กรุณาระบุรายละเอียดชั่วโมงงานและลายเซ็นรับรองอย่างถูกต้อง</p>
        </div>
        
        <div className="text-right">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">ผู้ใช้ประจุงาน</span>
          <span className="text-xs font-bold text-emerald-300">{currentStudent.full_name}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        
        {formError && (
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            {formError}
          </div>
        )}

        {/* 1. General Profile Info Block banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs md:text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">ข้อมูลนักศึกษา:</span>
            <div className="font-bold text-slate-800 mt-0.5">{currentStudent.full_name} ({currentStudent.student_id})</div>
            <div className="text-slate-500">{currentStudent.department} · {currentStudent.major}</div>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">อาจารย์นิเทศ & สถานที่:</span>
            <div className="font-bold text-emerald-700 mt-0.5">👤 {currentStudent.mentor_name || 'ไม่ได้กำหนดอาจารย์นิเทศ'}</div>
            <div className="text-slate-500 truncate">🏢 {currentStudent.establishment_id ? `รหัสสถานที่: ${currentStudent.establishment_id}` : 'ไม่ได้ลงทะเบียนสถานปฏิบัติงานสหกิจ'}</div>
          </div>
        </div>

        {/* 2. Date and Time Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              วันที่ฝึกงาน (Date)
            </label>
            <input
              type="date"
              required
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              เวลาเริ่มงาน (Start Time)
            </label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-rose-600" />
              เวลาสิ้นสุดงาน (End Time)
            </label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
            />
          </div>
        </div>

        {/* 3. Automatic Hours summary view */}
        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-600 animate-pulse" />
            ชั่วโมงการฝึกงาน (คำนวณอัตโนมัติ)
          </span>
          <span className="text-base font-black text-emerald-700">
            {totalHours} ชั่วโมง
          </span>
        </div>

        {/* 4. Details text-area with quick buttons */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-teal-600" />
              รายละเอียดงานที่ปฏิบัติ (Work Details)
            </label>
            <span className="text-[10px] text-slate-400 font-medium">อย่างน้อย 15 ตัวอักษร</span>
          </div>
          
          <textarea
            required
            rows={5}
            value={workDetail}
            onChange={(e) => setWorkDetail(e.target.value)}
            placeholder="ตัวอย่างเช่น: ติดตั้งเครื่องจักรเซิร์ฟเวอร์ ออกแบบระบบจัดการฐานข้อมูล หรือบันทึกปัญหาที่พบลายสัปดาห์..."
            className="w-full text-xs border border-slate-200 rounded-xl p-3.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-medium text-slate-700 leading-relaxed"
          />

          {/* Quick templates / hints picker */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              คลิกเพื่อเติมข้อความแนะนำ:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                "ติดตั้งระบบคอมพิวเตอร์",
                "ออกแบบสื่อประชาสัมพันธ์",
                "บันทึกข้อมูลลูกค้า",
                "ดูแลเว็บไซต์องค์กร",
                "พัฒนาระบบหลังบ้าน API",
                "สำรองฐานข้อมูล SQL"
              ].map((template) => (
                <button
                  type="button"
                  key={template}
                  onClick={() => insertWorkDetailTip(template)}
                  className="bg-slate-105 hover:bg-slate-200 text-slate-600 border border-slate-200 py-1.5 px-3 rounded-full text-[10px] font-semibold transition-all cursor-pointer"
                >
                  + {template}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 5. Supervisor signature drawing / file upload */}
        <SignaturePad 
          onSave={(sig) => setSignature(sig)} 
          initialSignature={signature}
        />

        {/* 6. Note (optional text field) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            หมายเหตุเพิ่มเติม (ระบุอาการเจ็บป่วย สอบถาม หรืออื่นๆ - ไม่บังคับ)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="เช่น ขอลาป่วยช่วงบ่าย ได้รับอนุญาตจากที่เลี้ยงงานแล้ว"
            className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
          />
        </div>

        {/* 7. Submit Action Button */}
        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onGoHome}
            className="px-5 py-3 rounded-xl border border-slate-200 font-semibold text-xs text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>
          
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-6 rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1"
          >
            บันทึกข้อมูล (Save Session Log)
          </button>
        </div>

      </form>
    </div>
  );
}
