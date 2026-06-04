import React, { useState, useMemo } from 'react';
import { Student, Establishment } from '../types';
import { updateStudent, getEstablishments } from '../db';
import { User, Building2, MapPin, Phone, UserCheck, Edit3, Save, ShieldAlert } from 'lucide-react';

interface ProfilePanelProps {
  currentStudent: Student;
  onStudentUpdated: (updatedStudent: Student) => void;
}

export default function ProfilePanel({ currentStudent, onStudentUpdated }: ProfilePanelProps) {
  const [activeSegment, setActiveSegment] = useState<'profile' | 'establishment'>('profile');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  
  // Local edit states
  const [fullName, setFullName] = useState(currentStudent.full_name);
  const [department, setDepartment] = useState(currentStudent.department);
  const [major, setMajor] = useState(currentStudent.major);
  const [selectedEstId, setSelectedEstId] = useState(currentStudent.establishment_id || '');

  const establishments = useMemo(() => getEstablishments(), []);

  // Compute active establishment details
  const currentEst = useMemo(() => {
    return establishments.find(e => e.id === selectedEstId) || null;
  }, [establishments, selectedEstId]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !department.trim() || !major.trim()) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    const updated: Student = {
      ...currentStudent,
      full_name: fullName.trim(),
      department: department.trim(),
      major: major.trim(),
      establishment_id: selectedEstId || undefined
    };

    updateStudent(updated);
    onStudentUpdated(updated);
    setIsEditing(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden max-w-2xl mx-auto">
      {/* Secondary segment selectors */}
      <div className="flex border-b border-slate-100 bg-slate-50 p-1">
        <button
          onClick={() => setActiveSegment('profile')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold rounded-lg transition-all ${
            activeSegment === 'profile' ? 'bg-white text-emerald-805 shadow-xs font-bold' : 'text-slate-600'
          }`}
        >
          <User className="w-4 h-4 text-emerald-600" />
          ข้อมูลนักศึกษา
        </button>
        <button
          onClick={() => setActiveSegment('establishment')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold rounded-lg transition-all ${
            activeSegment === 'establishment' ? 'bg-white text-emerald-805 shadow-xs font-bold' : 'text-slate-600'
          }`}
        >
          <Building2 className="w-4 h-4 text-sky-600" />
          สถานประกอบการ
        </button>
      </div>

      <div className="p-6">
        {activeSegment === 'profile' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                  <User className="w-5 h-5 text-emerald-600" />
                  ประวัตินักศึกษาฝึกงานรายบุคคล
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">คุณสามารถแก้ไขหรือปรับเปลี่ยนข้อมูลเพื่อความถูกต้องของเอกสาร</p>
              </div>

              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 py-1.5 px-3 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  แก้ไขข้อมูลตนเอง
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">รหัสนักศึกษา (ไม่สามารถแก้ไขได้)</label>
                    <input
                      type="text"
                      disabled
                      value={currentStudent.student_id}
                      className="w-full text-xs font-bold border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">ชื่อ-นามสกุลจริง</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white text-slate-700"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">แผนก / คณะ</label>
                      <input
                        type="text"
                        required
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">สาขาวิชา</label>
                      <input
                        type="text"
                        required
                        value={major}
                        onChange={(e) => setMajor(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white text-slate-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">เลือกสถานประกอบการปัจจุบัน</label>
                    <select
                      value={selectedEstId}
                      onChange={(e) => setSelectedEstId(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white"
                    >
                      <option value="">-- ไม่ระบุ --</option>
                      {establishments.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 text-xs font-semibold pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setFullName(currentStudent.full_name);
                      setDepartment(currentStudent.department);
                      setMajor(currentStudent.major);
                      setSelectedEstId(currentStudent.establishment_id || '');
                    }}
                    className="bg-slate-100 text-slate-500 py-2 px-4 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-600 text-white font-bold py-2 px-5 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    บันทึกข้อมูล
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-55 rounded-2xl p-5 border border-slate-100 flex items-center gap-4">
                  <div className="bg-emerald-100 text-emerald-700 p-3 rounded-full">
                    <UserCheck className="w-10 h-10" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800">{currentStudent.full_name}</h4>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5">รหัสนักศึกษา: {currentStudent.student_id}</p>
                    <p className="text-[11px] text-slate-500 font-medium">สังกัดแผนก: {currentStudent.department} · {currentStudent.major}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium pt-2">
                  <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">ภาควิชาเอก</span>
                    <span className="text-slate-700 font-semibold">{currentStudent.major}</span>
                  </div>

                  <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">อาจารย์ประจํานิเทศ</span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1 font-semibold">
                      👤 {currentStudent.mentor_name || 'ไม่ได้กำหนดอาจารย์ผู้ตรวจ'}
                    </span>
                  </div>
                </div>

                {currentStudent.establishment_id && currentEst && (
                  <div className="bg-sky-50/50 border border-sky-100/60 rounded-xl p-4 flex items-start gap-3 mt-4">
                    <Building2 className="w-5 h-5 text-sky-600 mt-0.5 shrink-0" />
                    <div className="text-xs font-medium text-sky-850">
                      <span className="font-bold text-sky-900 block mb-0.5">สถานประกอบการปัจจุบัน</span>
                      {currentEst.name}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeSegment === 'establishment' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-100 pb-3">
                <Building2 className="w-5 h-5 text-sky-600" />
                ข้อมูลสถานประกอบการ / องค์กรที่ฝึกปฏิบัติงาน
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">รายละเอียดสถานที่ตั้ง บุคคลติดต่อ และสิทธิประโยชน์ของนักศึกษาฝึกงานสหกิจ</p>
            </div>

            {currentStudent.establishment_id && currentEst ? (
              <div className="space-y-4 font-medium text-xs">
                <div className="bg-sky-50 border border-sky-100 rounded-xl p-5 space-y-3.5">
                  <div className="font-black text-slate-800 text-sm">{currentEst.name}</div>
                  
                  <div className="flex gap-2 text-slate-600 items-start">
                    <MapPin className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <span>ที่อยู่: {currentEst.address}</span>
                  </div>

                  <div className="flex gap-2 text-slate-600 items-center">
                    <User className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>ผู้ควบคุม / ติดต่อ: {currentEst.contact_person || 'ไม่ระบุ'}</span>
                  </div>

                  <div className="flex gap-2 text-slate-600 items-center">
                    <Phone className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>เบอร์ติดต่อองค์กร: {currentEst.phone || 'ไม่ระบุ'}</span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-700 block">คำเสนอแนะมาตรฐานความปลอดภัย</span>
                    <p className="text-[11px] text-slate-500 font-normal leading-relaxed">
                      หากเกิดปัญหาขึ้นระหว่างการฝึกงานหรือสถานที่ทำงานมีความเสี่ยงอันตราย กรุณารายงานให้อาจารย์นิเทศรับทราบโดยทันทีเพื่อประสานงานย้ายสถานที่ปฏิบัติงาน
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 border border-slate-200 border-dashed rounded-xl">
                <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-500">คุณยังไม่ได้เลือกลิงก์กับสถานประกอบการฝึกงานใดๆ</p>
                <p className="text-[10px] text-slate-400 mt-1">กรุณากด ‘แก้ไขข้อมูลตนเอง’ ในแท็บประวัตินักศึกษาเพื่อตั้งค่าสถานที่ฝึกงาน</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
