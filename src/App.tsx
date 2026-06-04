import React, { useState, useEffect, useMemo } from 'react';
import { 
  initDB, getStudents, getLogs, getTeachers, getEstablishments, 
  calculateHours, saveStudents 
} from './db';
import { Student, InternshipLog, Teacher, Establishment, UserRole } from './types';
import LogForm from './components/LogForm';
import { fetchGoogleSheet } from './utils/sheetFetcher';
import ReportPanel from './components/ReportPanel';
import AdminPanel from './components/AdminPanel';
import TeacherPanel from './components/TeacherPanel';
import ProfilePanel from './components/ProfilePanel';
import { 
  Home, User, Building2, BookOpen, FileText, LogOut, 
  Settings, Lock, Star, GraduationCap, CheckCircle2, 
  AlertCircle, ShieldCheck, ChevronRight, HelpCircle,
  FileSpreadsheet, Sparkles, Trophy, Menu, X, Users
} from 'lucide-react';

export default function App() {
  // Application Authentication & Role State
  const [currentRole, setCurrentRole] = useState<UserRole>('student');
  const [currentUserStudent, setCurrentUserStudent] = useState<Student | null>(null);
  const [currentUserTeacherName, setCurrentUserTeacherName] = useState<string>('อาจารย์นิเทศ');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  // Signin form state
  const [loginStudentId, setLoginStudentId] = useState<string>('');
  const [loginErrorMessage, setLoginErrorMessage] = useState<string | null>(null);

  // Google Sheets integration state
  const [sheetUrl, setSheetUrl] = useState<string>('https://docs.google.com/spreadsheets/d/125RRThRChUJBB3I1prrtmbw7PuGnh4Hf4WhJWXpEeB0/edit?gid=0#gid=0');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Active Menu Tab of student dashboard
  const [activeTab, setActiveTab] = useState<'home' | 'profile' | 'establishment' | 'log' | 'report'>('home');

  // Database lists (reloaded from database triggers)
  const [allLogs, setAllLogs] = useState<InternshipLog[]>(() => getLogs());
  const [allStudents, setAllStudents] = useState<Student[]>(() => getStudents());
  const [allTeachers, setAllTeachers] = useState<Teacher[]>(() => getTeachers());

  // Initialize Database on load
  useEffect(() => {
    initDB();
    const loadedTeachers = getTeachers();
    setAllTeachers(loadedTeachers);
    setAllStudents(getStudents());
    setAllLogs(getLogs());
    if (loadedTeachers.length > 0) {
      setCurrentUserTeacherName(loadedTeachers[0].full_name);
    } else {
      setCurrentUserTeacherName('อาจารย์นิเทศ');
    }
  }, []);

  // Mobile menu visibility
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const refreshDbState = () => {
    setAllLogs(getLogs());
    setAllStudents(getStudents());
    setAllTeachers(getTeachers());
  };

  // Sync function to pull dataset from Google Sheets
  const handleSyncGoogleSheets = async () => {
    if (!sheetUrl.trim()) return;
    setIsSyncing(true);
    setSyncStatus(null);
    setLoginErrorMessage(null);

    try {
      const text = await fetchGoogleSheet(sheetUrl);

      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line !== '');
      if (lines.length === 0) {
        throw new Error('ไม่พบข้อมูลนักศึกษาในกล่องข้อมูล');
      }

      const currentStudents = getStudents();
      const updatedStudentsList = [...currentStudents];
      let importCount = 0;
      let duplicateCount = 0;

      const parsedStudents: Student[] = [];

      for (let line of lines) {
        let parts: string[] = [];
        const matches = line.match(/("([^"]*)"|[^,]+)/g);
        if (matches) {
          parts = matches.map(m => m.replace(/^"|"$/g, '').trim());
        } else {
          parts = line.split(',').map(p => p.trim());
        }

        if (parts.length >= 2) {
          const student_id = parts[0].replace(/['"\s]/g, '');
          const full_name = parts[1];

          // Skip headers
          if (
            student_id.toLowerCase().includes('student_id') || 
            student_id.toLowerCase().includes('studentid') || 
            student_id.includes('รหัสนักศึกษา') || 
            student_id.includes('รหัส') || 
            full_name.includes('ชื่อ-นามสกุล') || 
            full_name.includes('ชื่อสกุล') ||
            full_name.includes('ชื่อ')
          ) {
            continue;
          }

          if (student_id && full_name) {
            const department = parts[2] || "คณะเทคโนโลยีสารสนเทศ";
            const major = parts[3] || "วิทยาการคอมพิวเตอร์";
            const mentor_name = parts[4] || undefined;
            const establishment_id = parts[5] || undefined;

            parsedStudents.push({
              student_id,
              full_name,
              department,
              major,
              mentor_name,
              establishment_id
            });
          }
        }
      }

      if (parsedStudents.length === 0) {
        throw new Error('โครงสร้าง Google Sheet ไม่ถูกต้อง คอลัมน์ที่ 1 ต้องเป็นรหัสนักศึกษา และคอลัมน์ที่ 2 เป็นชื่อ-นามสกุล');
      }

      for (const parsed of parsedStudents) {
        const idx = updatedStudentsList.findIndex(s => s.student_id === parsed.student_id);
        if (idx !== -1) {
          // Update existing
          updatedStudentsList[idx] = parsed;
          duplicateCount++;
        } else {
          // Add new
          updatedStudentsList.push(parsed);
          importCount++;
        }
      }

      saveStudents(updatedStudentsList);
      setAllStudents(getStudents());

      if (parsedStudents.length > 0) {
        setLoginStudentId(parsedStudents[0].student_id);
      }

      setSyncStatus({
        type: 'success',
        message: `✓ นำเข้าข้อมูลสำเร็จ! ซิงค์รายชื่อผู้ใช้จากชีตของคุณจำนวน ${parsedStudents.length} รายการ (เพิ่มใหม่ ${importCount} คน, อัปเดตข้อมูลเดิม ${duplicateCount} คน) สมาชิกสามารถเลือกนำรหัสผ่านเข้าสู่ระบบได้ทันทีด้านล่าง`
      });

    } catch (err: any) {
      setSyncStatus({
        type: 'error',
        message: `⚠️ ผิดพลาด: ${err.message || 'ไม่สามารถโหลดข้อมูลได้โปรดเชื่อมต่ออินเทอร์เน็ตหรือดึงสาธารณะ'}`
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Student specific statistics
  const studentStats = useMemo(() => {
    if (!currentUserStudent) return { total: 0, approved: 0, pending: 0, percentage: 0 };
    const myLogs = allLogs.filter(l => l.student_id === currentUserStudent.student_id);
    const total = myLogs.reduce((acc, l) => acc + l.total_hours, 0);
    const approved = myLogs.filter(l => l.status === 'approved').reduce((acc, l) => acc + l.total_hours, 0);
    const pending = myLogs.filter(l => l.status === 'pending').reduce((acc, l) => acc + l.total_hours, 0);
    const percentage = Math.min(100, Math.round((approved / 320) * 100));

    return {
      total: Math.round(total * 10) / 10,
      approved: Math.round(approved * 10) / 10,
      pending: Math.round(pending * 10) / 10,
      percentage
    };
  }, [allLogs, currentUserStudent]);

  // Handle student login with ID checks
  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrorMessage(null);

    if (!loginStudentId.trim()) {
      setLoginErrorMessage("กรุณากรอกรหัสนักศึกษา");
      return;
    }

    const studentsList = getStudents();
    const found = studentsList.find(s => s.student_id.trim() === loginStudentId.trim());

    if (!found) {
      // ขั้นตอน 1: ไม่พบข้อมูลให้แสดงข้อความ
      setLoginErrorMessage("ไม่พบข้อมูลนักศึกษา กรุณาตรวจสอบรหัสนักศึกษา");
    } else {
      // Login success
      setCurrentUserStudent(found);
      setCurrentRole('student');
      setIsLoggedIn(true);
      setActiveTab('home');
      refreshDbState();
    }
  };

  // Direct login links simulation for easy grading
  const handleQuickLogin = (studentId: string) => {
    const studentsList = getStudents();
    const found = studentsList.find(s => s.student_id === studentId);
    if (found) {
      setCurrentUserStudent(found);
      setCurrentRole('student');
      setIsLoggedIn(true);
      setActiveTab('home');
      refreshDbState();
    }
  };

  const handleTeacherLogin = (teacherName: string) => {
    setCurrentRole('teacher');
    setCurrentUserTeacherName(teacherName);
    setIsLoggedIn(true);
    refreshDbState();
  };

  const handleAdminLogin = () => {
    setCurrentRole('admin');
    setIsLoggedIn(true);
    refreshDbState();
  };

  const handleSignOut = () => {
    setIsLoggedIn(false);
    setCurrentUserStudent(null);
    setLoginStudentId('');
    setLoginErrorMessage(null);
    setIsMobileMenuOpen(false);
  };

  const handleLogSuccess = (viewHistory: boolean) => {
    refreshDbState();
    if (viewHistory) {
      setActiveTab('report');
    } else {
      setActiveTab('home');
    }
  };

  // Setup sample logins automatically if Students list gets empty
  useEffect(() => {
    setAllStudents(getStudents());
  }, [isLoggedIn]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased">
      
      {/* 1. PORTAL PAGE IF NOT LOGGED IN */}
      {!isLoggedIn ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden">
          
          {/* Ambient grid bg decorator */}
          <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-40 z-0" />
          
          <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-205/60 z-10 relative">
            
            {/* Left Column Brand Presentation Panel */}
            <div className="lg:col-span-5 bg-gradient-to-br from-emerald-800 to-slate-900 text-white p-8 sm:p-12 flex flex-col justify-between relative">
              <div className="space-y-4">
                <div className="bg-emerald-600 w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg border border-emerald-500/30">
                  <GraduationCap className="w-5.5 h-5.5 text-white" />
                </div>
                
                <div className="space-y-1.5">
                  <h2 className="text-2xl font-black tracking-tight leading-none">INTERNSHIP LOG SYSTEM</h2>
                  <p className="text-xs text-emerald-300 font-semibold uppercase tracking-wider">ระบบบันทึกการฝึกงานของนักศึกษา</p>
                </div>
              </div>

              <div className="space-y-6 py-12 lg:py-0">
                <div className="space-y-4 text-slate-300 text-xs font-semibold">
                  <div className="flex items-start gap-3">
                    <div className="bg-white/10 rounded-lg p-1.5 mt-0.5"><BookOpen className="w-3.5 h-3.5 text-emerald-400" /></div>
                    <div>
                      <p className="text-white">บันทึกชั่วโมงทดแทนฝึกสหกิจ</p>
                      <p className="text-[10px] text-slate-400 font-normal">บันทึกงานประจำวัน คำนวณชั่วโมง และลงรูปวาดลายเซ็น</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-white/10 rounded-lg p-1.5 mt-0.5"><Users className="w-3.5 h-3.5 text-sky-400" /></div>
                    <div>
                      <p className="text-white">เชื่อมประเมินโดยอาจารย์นิเทศ</p>
                      <p className="text-[10px] text-slate-400 font-normal">อนุมัติคำรับรองชั่วโมงฝึกงาน และจดบันทึกให้ข้อแนะนำ</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-white/10 rounded-lg p-1.5 mt-0.5"><FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" /></div>
                    <div>
                      <p className="text-white">ส่งออกรายงาน PDF และ Excel</p>
                      <p className="text-[10px] text-slate-400 font-normal">สร้างเอกสาร CSV เข้าโปรแกรมสำนักงาน สรุปรายเดือน</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 font-medium">
                © {new Date().getFullYear()} สรรค์สร้างโดยคณาจารย์ผู้ดูแลระบบสหกิจศึกษา
              </div>
            </div>

            {/* Right Column Login Forms Tab */}
            <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center space-y-6">
              
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800">เข้าสู่ระบบสหกิจศึกษา</h3>
                <p className="text-xs text-slate-500 font-medium">กรุณาป้อนรหัสนักศึกษา หรือเลือกดึงข้อมูลจาก Google Sheets ด้านล่างเพื่อเริ่มระบบงาน</p>
              </div>

              {/* Google Sheets Sync Integration Section */}
              <div className="bg-emerald-50/50 border border-emerald-100/80 p-4.5 rounded-2xl space-y-3 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-black text-emerald-800">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 animate-pulse" />
                  <span>ดึงข้อมูลรายชื่อนักศึกษาจาก Google Sheets 🔗</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-normal">
                  ป้อนหรือยืนยันลิงก์ Google Sheets ของคุณที่แบ่งปันเป็นสาธารณะ แล้วกด <b>"ดึงข้อมูล"</b> เพื่อโหลดรหัสนักศึกษาและชื่อเข้าฐานข้อมูลทันที
                </p>
                
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="ป้อน URL ของ Google Sheet"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSyncGoogleSheets}
                    disabled={isSyncing}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-extrabold text-[11px] px-3.5 py-2 rounded-xl transition-all cursor-pointer shrink-0 shadow-xs"
                  >
                    {isSyncing ? 'กำลังซิงค์...' : 'ดึงข้อมูล'}
                  </button>
                </div>

                {syncStatus && (
                  <div className={`p-3 rounded-xl text-[11px] font-bold leading-normal border ${
                    syncStatus.type === 'success' 
                      ? 'bg-emerald-100/50 border-emerald-200 text-emerald-800' 
                      : 'bg-rose-50 border-rose-100 text-rose-800'
                  }`}>
                    {syncStatus.message}
                  </div>
                )}
              </div>

              {loginErrorMessage && (
                <div className="bg-rose-50 border border-rose-150 p-4 rounded-2xl text-rose-800 text-xs font-bold leading-relaxed flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  {loginErrorMessage}
                </div>
              )}

              {/* Student Login Form */}
              <form onSubmit={handleStudentLogin} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    รหัสนักศึกษา (Student ID)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ป้อนรหัส 11 หลัก เช่น 65011234001"
                    value={loginStudentId}
                    onChange={(e) => setLoginStudentId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white text-slate-800 font-bold placeholder-slate-400 text-sm rounded-2xl p-3.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 tracking-wider transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-4 px-6 rounded-2xl tracking-wide shadow-sm hover:shadow transition-all cursor-pointer"
                >
                  เข้าสู่ระบบนักศึกษา (Student Sign In)
                </button>
              </form>

              {/* Quick Login Simulation for Graders */}
              <div className="border-t border-slate-100 pt-6 space-y-4.5">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  บัญชีตัวอย่างเพื่อการประเมิน (Quick Evaluation Accounts)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  {/* Students options */}
                  <div className="space-y-2 bg-slate-50 p-3.5 border border-slate-100 rounded-2xl">
                    <span className="text-[9px] font-extrabold text-emerald-700 block uppercase tracking-wider">บัญชีนักศึกษา (Students {allStudents.length} คน)</span>
                    <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto scrollbar-thin">
                      {allStudents.slice(0, 5).map((student, idx) => (
                        <button
                          key={student.student_id}
                          type="button"
                          onClick={() => handleQuickLogin(student.student_id)}
                          className={`text-left py-1 text-slate-700 hover:text-emerald-700 font-bold transition-colors block w-full truncate ${
                            idx < Math.min(allStudents.length, 5) - 1 ? 'border-b border-dashed border-slate-200 pb-1.5' : ''
                          }`}
                        >
                          🎓 {student.student_id} ({student.full_name})
                        </button>
                      ))}
                      {allStudents.length > 5 && (
                        <span className="text-[10px] text-slate-450 font-bold text-center pt-1 block cursor-default">
                          + อีก {allStudents.length - 5} รายชื่อในฐานข้อมูล
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Teacher & Admin options */}
                  <div className="space-y-2 bg-slate-50 p-3.5 border border-slate-100 rounded-2xl">
                    <span className="text-[9px] font-extrabold text-sky-700 block uppercase tracking-wider">บัญชีอื่น (Teacher & Admin)</span>
                    <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto scrollbar-thin">
                      {allTeachers.length > 0 ? (
                        allTeachers.slice(0, 3).map((teacher) => (
                          <button
                            key={teacher.teacher_id}
                            type="button"
                            onClick={() => handleTeacherLogin(teacher.full_name)}
                            className="text-left py-1 text-slate-700 hover:text-sky-700 font-bold transition-colors block w-full truncate border-b border-dashed border-slate-200 pb-1"
                          >
                            👤 {teacher.full_name} ({teacher.department})
                          </button>
                        ))
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleTeacherLogin('อาจารย์นิเทศ')}
                          className="text-left py-1 text-slate-700 hover:text-sky-700 font-bold transition-colors block w-full truncate border-b border-dashed border-slate-200 pb-1 italic text-slate-400"
                        >
                          👤 อาจารย์นิเทศ (ไม่ได้นำเข้าข้อมูล)
                        </button>
                      )}
                      
                      <button
                        type="button"
                        onClick={handleAdminLogin}
                        className="text-left py-1 text-slate-700 hover:text-rose-700 font-bold transition-colors block w-full truncate pt-1"
                      >
                        ⚙️ ผู้ดูแลระบบ (System Admin)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      ) : (
        
        // 2. MAIN LOGGED IN APP LAYOUT (ขั้นตอน 2)
        <div className="flex-1 flex flex-col">
          
          {/* Global Header */}
          <header className="bg-slate-900 text-white border-b border-slate-800 no-print sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
              
              <div className="flex items-center gap-2.5">
                <div className="bg-emerald-600 p-2 rounded-xl text-white">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="font-black text-sm tracking-tight leading-snug">Internship Portal</h1>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Cooperative Education Database</span>
                </div>
              </div>

              {/* Header roles badge for visual reassurance */}
              <div className="hidden md:flex items-center gap-3">
                <div className="bg-slate-800 border border-slate-700/60 rounded-xl px-3.5 py-1.5 flex items-center gap-2 text-xs font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  {currentRole === 'student' && currentUserStudent && (
                    <span>รหัสนักศึกษา: <span className="text-emerald-400 font-extrabold">{currentUserStudent.student_id}</span> • {currentUserStudent.full_name}</span>
                  )}
                  {currentRole === 'teacher' && (
                    <span>สิทธิ์เข้าถึง: <span className="text-sky-400 font-extrabold">อาจารย์นิเทศ</span> • {currentUserTeacherName}</span>
                  )}
                  {currentRole === 'admin' && (
                    <span>สิทธิ์เข้าถึง: <span className="text-amber-400 font-extrabold">ผู้ดูแลระบบ (Admin)</span></span>
                  )}
                </div>

                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-semibold py-1.5 px-3 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  ออกจากระบบ
                </button>
              </div>

              {/* Mobile menu trigger */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden bg-slate-800 p-2 border border-slate-700 rounded-lg"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5 text-slate-350" /> : <Menu className="w-5 h-5 text-slate-350" />}
              </button>

            </div>
          </header>

          {/* Mobile Dropdown Menu Drawer */}
          {isMobileMenuOpen && (
            <div className="md:hidden bg-slate-900 border-b border-slate-800 text-white p-4 space-y-4 no-print z-50">
              <div className="bg-slate-800 p-3 rounded-xl text-xs font-semibold space-y-1 border border-slate-700">
                {currentRole === 'student' && currentUserStudent && (
                  <div>
                    <span className="text-slate-400 block text-[10px]">นักศึกษาล็อกอิน:</span>
                    <p className="font-extrabold text-emerald-400">{currentUserStudent.full_name}</p>
                    <p className="text-[11px] text-slate-300">รหัส: {currentUserStudent.student_id}</p>
                  </div>
                )}
                {currentRole === 'teacher' && (
                  <div>
                    <span className="text-slate-400 block text-[10px]">อาจารย์นิเทศล็อกอิน:</span>
                    <p className="font-extrabold text-sky-400">{currentUserTeacherName}</p>
                  </div>
                )}
                {currentRole === 'admin' && (
                  <div>
                    <p className="font-extrabold text-amber-400">ผู้ดูแลระบบหลัก</p>
                  </div>
                )}
              </div>

              {currentRole === 'student' && (
                <div className="flex flex-col gap-1.5 text-xs font-semibold text-slate-300">
                  <button
                    onClick={() => { setActiveTab('home'); setIsMobileMenuOpen(false); }}
                    className={`text-left py-2 px-3 rounded-lg flex items-center gap-2 ${activeTab === 'home' ? 'bg-slate-800 text-white' : ''}`}
                  >
                    <Home className="w-4 h-4 text-emerald-600" />
                    หน้าหลัก
                  </button>
                  <button
                    onClick={() => { setActiveTab('profile'); setIsMobileMenuOpen(false); }}
                    className={`text-left py-2 px-3 rounded-lg flex items-center gap-2 ${activeTab === 'profile' ? 'bg-slate-800 text-white' : ''}`}
                  >
                    <User className="w-4 h-4 text-emerald-600" />
                    ข้อมูลนักศึกษา
                  </button>
                  <button
                    onClick={() => { setActiveTab('establishment'); setIsMobileMenuOpen(false); }}
                    className={`text-left py-2 px-3 rounded-lg flex items-center gap-2 ${activeTab === 'establishment' ? 'bg-slate-800 text-white' : ''}`}
                  >
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    สถานประกอบการ
                  </button>
                  <button
                    onClick={() => { setActiveTab('log'); setIsMobileMenuOpen(false); }}
                    className={`text-left py-2 px-3 rounded-lg flex items-center gap-2 ${activeTab === 'log' ? 'bg-slate-800 text-white' : ''}`}
                  >
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    บันทึกการฝึกงาน
                  </button>
                  <button
                    onClick={() => { setActiveTab('report'); setIsMobileMenuOpen(false); }}
                    className={`text-left py-2 px-3 rounded-lg flex items-center gap-2 ${activeTab === 'report' ? 'bg-slate-800 text-white' : ''}`}
                  >
                    <FileText className="w-4 h-4 text-emerald-600" />
                    รายงานการฝึกงาน
                  </button>
                </div>
              )}

              <button
                onClick={handleSignOut}
                className="w-full text-center py-2.5 bg-rose-900/60 hover:bg-rose-900 text-rose-300 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                ออกจากระบบ (Logout)
              </button>
            </div>
          )}

          {/* Sidebar / Main Content grid */}
          <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
            
            {/* Sidebar Columns (No-Print) - Only for Students tabs navigation */}
            {currentRole === 'student' && (
              <aside className="lg:col-span-3 space-y-4 no-print hidden md:block">
                
                {/* User avatar welcome card */}
                {currentUserStudent && (
                  <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-3.5 border border-slate-850 shadow-sm relative overflow-hidden">
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="bg-emerald-600/35 h-9 w-9 rounded-xl flex items-center justify-center font-bold text-white shadow-inner uppercase">
                        {currentUserStudent.full_name[0]}
                      </div>
                      <div>
                        <h4 className="text-xs font-black truncate max-w-[150px]">{currentUserStudent.full_name}</h4>
                        <span className="text-[9px] text-slate-400 block mt-0.5">สถานภาพนักศึกษา</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-3.5 border-t border-slate-800 text-[11px] text-slate-400 font-medium">
                      <div className="flex justify-between">
                        <span>รหัสนักศึกษา:</span>
                        <span className="text-slate-300 font-semibold">{currentUserStudent.student_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>สาขาวิชา:</span>
                        <span className="text-slate-300 truncate max-w-[130px] font-semibold">{currentUserStudent.major}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Main Navigation Sidebar Tabs (ขั้นตอน 2) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-sm space-y-1 text-slate-650">
                  <button
                    onClick={() => setActiveTab('home')}
                    className={`w-full py-2.5 px-4 text-xs font-bold rounded-xl transition-all text-left flex items-center justify-between group ${
                      activeTab === 'home' 
                        ? 'bg-emerald-500 text-white font-extrabold shadow-xs shadow-emerald-500/10' 
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Home className="w-4 h-4 text-emerald-600 group-hover:text-amber-500 transition-colors" />
                      หน้าหลัก
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 opacity-60 ${activeTab === 'home' ? 'text-white' : 'text-slate-400'}`} />
                  </button>

                  <button
                    onClick={() => { setActiveTab('profile'); }}
                    className={`w-full py-2.5 px-4 text-xs font-bold rounded-xl transition-all text-left flex items-center justify-between group ${
                      activeTab === 'profile' 
                        ? 'bg-emerald-500 text-white font-extrabold shadow-xs shadow-emerald-500/10' 
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <User className="w-4 h-4 text-emerald-600" />
                      ข้อมูลนักศึกษา
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 opacity-60 ${activeTab === 'profile' ? 'text-white' : 'text-slate-400'}`} />
                  </button>

                  <button
                    onClick={() => { setActiveTab('establishment'); }}
                    className={`w-full py-2.5 px-4 text-xs font-bold rounded-xl transition-all text-left flex items-center justify-between group ${
                      activeTab === 'establishment' 
                        ? 'bg-emerald-500 text-white font-extrabold shadow-xs shadow-emerald-500/10' 
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      สถานประกอบการ
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 opacity-60 ${activeTab === 'establishment' ? 'text-white' : 'text-slate-400'}`} />
                  </button>

                  <button
                    onClick={() => { setActiveTab('log'); }}
                    className={`w-full py-2.5 px-4 text-xs font-bold rounded-xl transition-all text-left flex items-center justify-between group ${
                      activeTab === 'log' 
                        ? 'bg-emerald-500 text-white font-extrabold shadow-xs shadow-emerald-500/10' 
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <BookOpen className="w-4 h-4 text-emerald-600" />
                      บันทึกการฝึกงาน
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 opacity-60 ${activeTab === 'log' ? 'text-white' : 'text-slate-400'}`} />
                  </button>

                  <button
                    onClick={() => { setActiveTab('report'); }}
                    className={`w-full py-2.5 px-4 text-xs font-bold rounded-xl transition-all text-left flex items-center justify-between group ${
                      activeTab === 'report' 
                        ? 'bg-emerald-500 text-white font-extrabold shadow-xs shadow-emerald-500/10' 
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      รายงานการฝึกงาน
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 opacity-60 ${activeTab === 'report' ? 'text-white' : 'text-slate-400'}`} />
                  </button>

                  <div className="pt-2 border-t border-slate-100 mt-2">
                    <button
                      onClick={handleSignOut}
                      className="w-full py-2 px-4 rounded-xl text-rose-600 hover:bg-rose-50 font-bold transition-all text-left flex items-center gap-2 text-xs cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      ออกจากระบบ
                    </button>
                  </div>
                </div>

                {/* Info Tip block */}
                <div className="bg-slate-100 hover:bg-slate-200/50 p-4 rounded-2xl border border-slate-205 text-[11px] text-slate-500 font-medium space-y-2 leading-relaxed transition-colors">
                  <div className="font-extrabold text-slate-750 flex items-center gap-1 text-xs">
                    <HelpCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    ต้องการทดลองในมุมมองอื่น?
                  </div>
                  <p>คุณสามารถกดปุ่มออกจากระบบด่วนเพื่อจำลองสิทธิ์เป็น อาจารย์นิเทศ (อนุมัติผลงาน) หรือ แอดมินจัดการตาราง ได้ตลอดเวลา</p>
                </div>

              </aside>
            )}

            {/* Main Content Area columns */}
            <main className={`${currentRole === 'student' ? 'lg:col-span-9' : 'lg:col-span-12'} space-y-6`}>
              
              {/* CURRENT ROLE: STUDENT APP VIEWPORTS */}
              {currentRole === 'student' && currentUserStudent && (
                <>
                  {/* TAB 1: SCREEN HOME */}
                  {activeTab === 'home' && (
                    <div className="space-y-6">
                      
                      {/* Brand Banner with custom illustration summary */}
                      <div className="bg-gradient-to-r from-emerald-800 to-slate-900 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-sm">
                        
                        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-700/10 rounded-full blur-2xl pointer-events-none" />
                        <div className="relative z-10 space-y-3.5 max-w-xl">
                          <span className="text-[10px] bg-emerald-500 text-white font-extrabold px-3 py-1 rounded-full uppercase tracking-wider inline-block shadow-sm">
                            สวัสดีสหกิจศึกษา
                          </span>
                          <h2 className="text-xl md:text-2xl font-black tracking-tight leading-none">
                            ยินดีต้อนรับคุณ {currentUserStudent.full_name} พัฒนางานวันนื้!
                          </h2>
                          <p className="text-xs text-slate-300 font-medium leading-relaxed">
                            จดจำบันทึกงานประจำวันด้วยลายเซ็นอนุมัติผู้ดูแลและชั่วโมงการทำงานให้ครบตามเป้าหมายของคณะวิชาเพื่อสำเร็จหลักสูตร
                          </p>
                        </div>
                      </div>

                      {/* Summary statistics layout */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-xs transition-shadow">
                          <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-100">
                            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block tracking-widest uppercase mb-0.5">ชั่วโมงที่อนุมัติแล้ว</span>
                            <span className="text-xl font-black text-emerald-700">{studentStats.approved} <span className="text-xs font-semibold text-slate-500">ชม.</span></span>
                          </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-xs transition-shadow">
                          <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-100">
                            <AlertCircle className="w-6 h-6 text-amber-500" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block tracking-widest uppercase mb-0.5">ชั่วโมงที่รอการตรวจ</span>
                            <span className="text-xl font-black text-amber-700">{studentStats.pending} <span className="text-xs font-semibold text-slate-500">ชม.</span></span>
                          </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-xs transition-shadow">
                          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                            <Trophy className="w-6 h-6 text-amber-500" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block tracking-widest uppercase mb-0.5">ชั่วโมงเป้าหมายรวม</span>
                            <span className="text-xl font-black text-slate-800">320 <span className="text-xs font-semibold text-slate-500">ชม.</span></span>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Guidesteps visual for students */}
                      <div className="bg-white border border-slate-205 rounded-2xl p-6 shadow-sm space-y-4">
                        <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                          <Star className="w-4 h-4 text-emerald-500" />
                          ขั้นตอนการบันทึกชั่วโมงประจำวันอย่างถูกต้อง
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-medium text-slate-600">
                          <div className="space-y-1.5 border-l-2 border-emerald-500 pl-4.5">
                            <span className="text-emerald-700 font-extrabold text-sm">01 / ระบุวันเวลาทํางาน</span>
                            <p className="text-[11px] text-slate-400 font-normal leading-relaxed">เข้าเมนู บันทึกการฝึกงาน ระบุวันที่ เริ่มงาน สิ้นสุดงาน ระบบคำนวณชั่วโมงให้ทันที</p>
                          </div>
                          <div className="space-y-1.5 border-l-2 border-emerald-500 pl-4.5">
                            <span className="text-emerald-700 font-extrabold text-sm">02 / ลงซิกตรวจรับรอง</span>
                            <p className="text-[11px] text-slate-400 font-normal leading-relaxed">วาดลายเซ็นผู้ควบคุมงานบนสัมผัสไอแพด หรืออัปโหลดไฟล์รูปภาพเซ็นที่ได้รับการอนุมัติ</p>
                          </div>
                          <div className="space-y-1.5 border-l-2 border-slate-200 pl-4.5">
                            <span className="text-slate-400 font-extrabold text-sm">03 / รอรายงานอาจารย์</span>
                            <p className="text-[11px] text-slate-400 font-normal leading-relaxed">อาจารย์นิเทศออนไลน์ตรวจสอบ อนุมัติชั่วโมงเข้าระบบสรุปผลเป็นรายสัปดาห์</p>
                          </div>
                        </div>
                      </div>

                      {/* Recent Logs Table Quick Preview */}
                      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                          <h4 className="font-bold text-slate-850">ประวัติบันทึกการฝึกงานล่าสุด 3 รายการ</h4>
                          <button 
                            onClick={() => setActiveTab('report')}
                            className="text-xs text-emerald-600 font-bold hover:text-emerald-700 hover:underline cursor-pointer"
                          >
                            ดูรายงานประวัติทั้งหมด &rarr;
                          </button>
                        </div>
                        <div className="divide-y divide-slate-100 text-xs font-medium text-slate-600">
                          {allLogs.filter(l => l.student_id === currentUserStudent.student_id).slice(0, 3).map(log => (
                            <div key={log.log_id} className="p-4.5 flex items-center justify-between hover:bg-slate-50/50">
                              <div className="space-y-1">
                                <span className="font-bold text-slate-800">
                                  {new Date(log.work_date).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                                </span>
                                <p className="text-[11px] text-slate-400 font-normal truncate max-w-lg">{log.work_detail}</p>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="font-extrabold text-slate-800 bg-slate-100 py-1 px-3 rounded-xl border border-slate-200">{log.total_hours} ชม.</span>
                                
                                {log.status === 'approved' ? (
                                  <span className="text-[11px] bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 rounded-full font-semibold">✓ อนุมัติยศ</span>
                                ) : log.status === 'rejected' ? (
                                  <span className="text-[11px] bg-rose-50 border border-rose-100 text-rose-700 px-2 rounded-full font-semibold">✖ ให้แก้ไข</span>
                                ) : (
                                  <span className="text-[11px] bg-amber-50 border border-amber-100 text-amber-700 px-2 rounded-full font-semibold">⏰ รอสรุป</span>
                                )}
                              </div>
                            </div>
                          ))}
                          
                          {allLogs.filter(l => l.student_id === currentUserStudent.student_id).length === 0 && (
                            <div className="p-6 text-center text-slate-400 font-medium">คุณยังไม่มีประวัติการส่งบันทึกตารางฝึกงานวันนี้</div>
                          )}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB 2: PROFILE STUDENTS */}
                  {activeTab === 'profile' && (
                    <ProfilePanel 
                      currentStudent={currentUserStudent} 
                      onStudentUpdated={(updated) => {
                        setCurrentUserStudent(updated);
                        refreshDbState();
                      }}
                    />
                  )}

                  {/* TAB 3: ASSIGNED ESTABLISHMENTS */}
                  {activeTab === 'establishment' && (
                    <ProfilePanel 
                      currentStudent={currentUserStudent} 
                      onStudentUpdated={(updated) => {
                        setCurrentUserStudent(updated);
                        refreshDbState();
                      }}
                    />
                  )}

                  {/* TAB 4: ADD INTERNSHIP LOGS FORM (ขั้นตอน 3) */}
                  {activeTab === 'log' && (
                    <LogForm 
                      currentStudent={currentUserStudent} 
                      onSuccess={handleLogSuccess}
                      onGoHome={() => setActiveTab('home')}
                    />
                  )}

                  {/* TAB 5: COMPREHENSIVE REPORTS VIEWIING */}
                  {activeTab === 'report' && (
                    <ReportPanel 
                      logs={allLogs} 
                      currentStudent={currentUserStudent}
                    />
                  )}
                </>
              )}

              {/* CURRENT ROLE: SUPERVISING TEACHER PANEL */}
              {currentRole === 'teacher' && (
                <TeacherPanel 
                  logs={allLogs} 
                  onLogStatusUpdated={refreshDbState}
                  currentTeacherName={currentUserTeacherName}
                />
              )}

              {/* CURRENT ROLE: ADMINISTRATOR MANAGEMENT VIEWPORT */}
              {currentRole === 'admin' && (
                <AdminPanel 
                  onRefreshAllData={refreshDbState}
                />
              )}

            </main>

          </div>

          {/* Quick Role switcher widget at extreme footer (No Print) for smooth, premium evaluation */}
          <footer className="bg-slate-900 border-t border-slate-800 py-4.5 no-print">
            <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 select-none">
                💡 แทบเปลี่ยนสิทธิ์ด่วนเพื่อการทดลองตรวจสอบ (Quick Evaluator Sandbox Switcher)
              </span>

              <div className="flex flex-wrap gap-2 text-xs font-bold text-white justify-center">
                <button
                  type="button"
                  onClick={() => {
                    const sample = getStudents()[0];
                    if (sample) {
                      setCurrentRole('student');
                      setCurrentUserStudent(sample);
                      setIsLoggedIn(true);
                      setActiveTab('home');
                    }
                  }}
                  className={`py-1.5 px-3 rounded-lg border transition-all cursor-pointer ${
                    currentRole === 'student' 
                      ? 'bg-emerald-600 border-emerald-500 shadow-sm shadow-emerald-500/20' 
                      : 'bg-slate-800 border-slate-700 text-slate-350 hover:bg-slate-750'
                  }`}
                >
                  🎓 นักศึกษา (Student)
                </button>

                <button
                  type="button"
                  onClick={() => handleTeacherLogin(allTeachers[0]?.full_name || 'อาจารย์นิเทศ')}
                  className={`py-1.5 px-3 rounded-lg border transition-all cursor-pointer ${
                    currentRole === 'teacher' 
                      ? 'bg-sky-600 border-sky-500 shadow-sm shadow-sky-500/20' 
                      : 'bg-slate-800 border-slate-700 text-slate-350 hover:bg-slate-750'
                  }`}
                >
                  👤 อาจารย์นิเทศ (Teacher)
                </button>

                <button
                  type="button"
                  onClick={handleAdminLogin}
                  className={`py-1.5 px-3 rounded-lg border transition-all cursor-pointer ${
                    currentRole === 'admin' 
                      ? 'bg-amber-600 border-amber-500 shadow-sm shadow-amber-500/20' 
                      : 'bg-slate-800 border-slate-700 text-slate-350 hover:bg-slate-750'
                  }`}
                >
                  ⚙️ ผู้ดูแลระบบ (Admin)
                </button>
              </div>
            </div>
          </footer>

        </div>
      )}

    </div>
  );
}
