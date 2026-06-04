import React, { useState, useMemo } from 'react';
import { Student, InternshipLog, Teacher } from '../types';
import { getStudents, getLogs, updateLog, getTeachers } from '../db';
import { CheckCircle, XCircle, AlertCircle, Eye, RefreshCw, Star, Clock, User, MessageSquare } from 'lucide-react';

interface TeacherPanelProps {
  logs: InternshipLog[];
  onLogStatusUpdated: () => void;
  currentTeacherName?: string;
}

export default function TeacherPanel({ logs, onLogStatusUpdated, currentTeacherName = "อาจารย์นิเทศ" }: TeacherPanelProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  
  // Review feedback state
  const [feedbackText, setFeedbackText] = useState<Record<number, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const students = useMemo(() => getStudents(), []);
  
  // Set first student as default if none selected
  React.useEffect(() => {
    if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].student_id);
    }
  }, [students, selectedStudentId]);

  const activeStudentObj = useMemo(() => {
    return students.find(s => s.student_id === selectedStudentId) || null;
  }, [selectedStudentId, students]);

  // Logs of only the selected student
  const studentLogs = useMemo(() => {
    return logs.filter(l => l.student_id === selectedStudentId)
               .sort((a,b) => b.work_date.localeCompare(a.work_date));
  }, [logs, selectedStudentId]);

  // Compute metrics
  const studentStats = useMemo(() => {
    const totalHours = studentLogs.reduce((sum, l) => sum + l.total_hours, 0);
    const approvedHours = studentLogs
      .filter(l => l.status === 'approved')
      .reduce((sum, l) => sum + l.total_hours, 0);
    const pendingCount = studentLogs.filter(l => l.status === 'pending').length;

    return {
      totalHours,
      approvedHours,
      pendingCount
    };
  }, [studentLogs]);

  const handleApprove = (log: InternshipLog) => {
    const feedback = feedbackText[log.log_id] || '';
    const updated: InternshipLog = {
      ...log,
      status: 'approved',
      approved_by: currentTeacherName,
      feedback: feedback.trim() || undefined
    };

    const res = updateLog(updated);
    if (res.success) {
      setMessage(`✅ อนุมัติการเข้าฝึกงานวันที่ ${new Date(log.work_date).toLocaleDateString('th-TH')} สำเร็จ`);
      setTimeout(() => setMessage(null), 4000);
      onLogStatusUpdated();
    }
  };

  const handleReject = (log: InternshipLog) => {
    const feedback = feedbackText[log.log_id] || '';
    if (!feedback.trim()) {
      alert("กรุณาระบุความคิดเห็น/สาเหตุที่ส่งกลับแก้ไขในช่อง ‘บันทึกเพิ่มเติมจากอาจารย์นิเทศ’ เสมอ");
      return;
    }

    const updated: InternshipLog = {
      ...log,
      status: 'rejected',
      approved_by: currentTeacherName,
      feedback: feedback.trim()
    };

    const res = updateLog(updated);
    if (res.success) {
      setMessage(`❌ ปฏิเสธบันทึกฝึกงานวันที่ ${new Date(log.work_date).toLocaleDateString('th-TH')} เรียบร้อย`);
      setTimeout(() => setMessage(null), 4000);
      onLogStatusUpdated();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Selector banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block">อาจารย์ผู้ตัดสินการประเมิน</span>
            <div className="text-lg font-black">{currentTeacherName}</div>
            <p className="text-xs text-slate-350 font-medium">สิทธิ์ตรวจสอบ ติเตียน และอนุมัติตารางชั่วโมงการทำงานของนักศึกษาฝึกงานสหกิจ</p>
          </div>

          <div className="w-full md:w-80 space-y-1 text-slate-950">
            <label className="block text-xs font-bold text-emerald-300">เลือกบัญชีนักศึกษาเพื่อเปิดสำนวน:</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full bg-white border border-slate-700 text-slate-800 text-sm font-semibold rounded-xl p-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {students.map(s => (
                <option key={s.student_id} value={s.student_id}>
                  {s.student_id} - {s.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {message && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-4 rounded-xl shadow-xs transition-opacity duration-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          {message}
        </div>
      )}

      {activeStudentObj ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Student Profile Overview Card */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5 h-fit">
            <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
              <div className="bg-slate-100 p-3 rounded-2xl text-slate-600">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-black text-slate-800 text-base">{activeStudentObj.full_name}</h4>
                <div className="text-xs text-slate-500">รหัสประจำตัว: {activeStudentObj.student_id}</div>
              </div>
            </div>

            <div className="space-y-3.5 text-xs font-medium">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">คณะ / แผนกวิชา:</span>
                <span className="text-slate-700">{activeStudentObj.department}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">สาขาวิชาเอก:</span>
                <span className="text-slate-700">{activeStudentObj.major}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">อาจารย์ประนิมิต/นิเทศประจำชุด:</span>
                <span className="text-slate-800 flex items-center gap-1">📍 {activeStudentObj.mentor_name || 'รอดำเนินการ'}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-500" />
                สถานะผลรวมการสะสมชั่วโมง
              </h5>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="bg-emerald-50/50 border border-emerald-100/60 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block">อนุมัติแล้ว</span>
                  <div className="text-xl font-black text-emerald-800 mt-1">{studentStats.approvedHours} <span className="text-xs font-medium text-slate-500">ชม.</span></div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">ชั่วโมงรอสรุป</span>
                  <div className="text-xl font-black text-slate-700 mt-1">{studentStats.totalHours}<span className="text-xs font-medium text-slate-500">ชม.</span></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                  <span>ความก้าวหน้าขั้นต่ำ (320 ชม.)</span>
                  <span>{Math.round((studentStats.approvedHours / 320) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full" 
                    style={{ width: `${Math.min(100, (studentStats.approvedHours / 320) * 100)}%` }}
                  />
                </div>
              </div>

              {studentStats.pendingCount > 0 && (
                <div className="bg-amber-50 border border-amber-150 rounded-xl p-3 text-xs text-amber-800 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  คุณมี {studentStats.pendingCount} บันทึกรายวัน รอนุมัติชั่วโมงฝึกงานอยู่
                </div>
              )}
            </div>
          </div>

          {/* Pending Reviews & History logs check */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              ประวัติการส่งบันทึกปฏิบัติสหกิจและการประเมินรายวัน
            </h4>

            {studentLogs.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 font-medium">
                ไม่พบข้อมูลบันทึกงานของนักศึกษาทดแทนคนนี้ในคลังระบบ
              </div>
            ) : (
              studentLogs.map(log => (
                <div 
                  key={log.log_id} 
                  className={`bg-white border rounded-2xl p-5 shadow-xs space-y-4 transition-all duration-350 hover:shadow-sm ${
                    log.status === 'pending' 
                      ? 'border-amber-200 bg-amber-50/10 hover:border-amber-300' 
                      : log.status === 'approved' 
                      ? 'border-slate-200' 
                      : 'border-rose-200 bg-rose-50/5'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">
                        {new Date(log.work_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                      <span className="text-xs text-slate-400 font-medium whitespace-nowrap">⏳ เวลาปฏิบัติงาน: {log.start_time} - {log.end_time} น.</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-full font-bold">
                        {log.total_hours} ชม.
                      </span>

                      {log.status === 'approved' ? (
                        <span className="inline-flex items-center bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-200 gap-1">
                          ✓ อนุมัติแล้ว
                        </span>
                      ) : log.status === 'rejected' ? (
                        <span className="inline-flex items-center bg-rose-50 text-rose-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-rose-200 gap-1">
                          ✖ ถูกปฏิเสธ / แก้ไข
                        </span>
                      ) : (
                        <span className="inline-flex items-center bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-200 gap-1">
                          ? รอตัดสิน
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Core detail text */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">รายละเอียดการปฏิบัติงานประจําวัน:</span>
                    <p className="text-xs text-slate-600 font-medium whitespace-pre-wrap leading-relaxed bg-slate-50 border border-slate-100 rounded-xl p-3.5">
                      {log.work_detail}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div>
                      {log.note && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">หมายเหตุเพิ่มเติมของนักศึกษา:</span>
                          <span className="text-xs text-slate-500 font-normal block pl-1">★ {log.note}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-start md:justify-end gap-3 bg-slate-50/50 p-2.5 border border-slate-100 rounded-xl">
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">ภาพลายเซ็นผู้รับรอง:</span>
                        <span className="text-[10px] text-slate-500 font-medium">มีข้อมูลการรับรองครบ</span>
                      </div>
                      {log.supervisor_signature ? (
                        <img 
                          src={log.supervisor_signature} 
                          alt="Signature preview" 
                          className="h-9 w-24 object-contain border border-slate-200 bg-white p-0.5 rounded"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-xs text-rose-500 font-semibold">ไม่มี</span>
                      )}
                    </div>
                  </div>

                  {/* Approve / Reject decision block */}
                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                        บันทึกเพิ่มเติมจากอาจารย์นิเทศ / ผู้ควบคุม (ไม่คัดค้านในการอนุมัติ):
                      </label>
                      <input
                        type="text"
                        placeholder="กรอกข้อคิดเห็นหรือข้อบกพร่องที่ต้องปรับปรุง เช่น ดีมาก ทำเสร็จล่วงหน้า"
                        value={feedbackText[log.log_id] || log.feedback || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFeedbackText(prev => ({
                            ...prev,
                            [log.log_id]: val
                          }));
                        }}
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="flex justify-end gap-2 text-xs font-semibold">
                      <button
                        onClick={() => handleReject(log)}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 py-2 px-4 rounded-xl border border-rose-200 flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        ปฏิเสธการเซ็น / ให้แก้ไข
                      </button>

                      <button
                        onClick={() => handleApprove(log)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-5 rounded-xl shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" />
                        อนุมัติและรับรองชั่วโมง
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-10 bg-white border border-slate-200 rounded-2xl">
          โปรดกําหนดหรือเพิ่มนักศึกษาเข้าระบบอย่างน้อย 1 รายการเพื่อเริ่มคัดกรอง
        </div>
      )}
    </div>
  );
}
