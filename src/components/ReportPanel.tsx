import React, { useState, useMemo } from 'react';
import { InternshipLog, Student } from '../types';
import { FileSpreadsheet, Printer, Calendar, Clock, BarChart3, CheckCircle2, AlertCircle, FileText, TrendingUp } from 'lucide-react';
import { getStudents } from '../db';

interface ReportPanelProps {
  logs: InternshipLog[];
  currentStudent?: Student | null;
  isAdminOrTeacher?: boolean;
}

export default function ReportPanel({ logs, currentStudent, isAdminOrTeacher = false }: ReportPanelProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(currentStudent?.student_id || 'all');
  const [reportType, setReportType] = useState<'summary' | 'daily' | 'weekly' | 'monthly'>('summary');
  
  // Custom date range selectors
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  
  const students = useMemo(() => getStudents(), []);

  // Filter logs based on role and selected student
  const filteredLogs = useMemo(() => {
    let list = [...logs];
    
    // If student, can only see their own logs
    if (!isAdminOrTeacher && currentStudent) {
      list = list.filter(l => l.student_id === currentStudent.student_id);
    } else {
      // Teacher or Admin can filter by students
      if (selectedStudentId !== 'all') {
        list = list.filter(l => l.student_id === selectedStudentId);
      }
    }

    // Filter by dates if selected
    if (filterStartDate) {
      list = list.filter(l => l.work_date >= filterStartDate);
    }
    if (filterEndDate) {
      list = list.filter(l => l.work_date <= filterEndDate);
    }

    // Sort logs descending by date
    return list.sort((a,b) => b.work_date.localeCompare(a.work_date));
  }, [logs, currentStudent, selectedStudentId, isAdminOrTeacher, filterStartDate, filterEndDate]);

  // Aggregate student names
  const studentMap = useMemo(() => {
    const map: Record<string, Student> = {};
    students.forEach(s => {
      map[s.student_id] = s;
    });
    return map;
  }, [students]);

  // Calculations for Summary
  const stats = useMemo(() => {
    const totalCount = filteredLogs.length;
    const totalHours = filteredLogs.reduce((sum, l) => sum + l.total_hours, 0);
    const approvedHours = filteredLogs
      .filter(l => l.status === 'approved')
      .reduce((sum, l) => sum + l.total_hours, 0);
    
    const statusCounts = filteredLogs.reduce((acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    }, { pending: 0, approved: 0, rejected: 0 } as Record<string, number>);

    return {
      totalCount,
      totalHours: Math.round(totalHours * 100) / 100,
      approvedHours: Math.round(approvedHours * 100) / 100,
      pendingCount: statusCounts.pending,
      approvedCount: statusCounts.approved,
      rejectedCount: statusCounts.rejected
    };
  }, [filteredLogs]);

  // Group Logs for Weekly Report
  const weeklyReport = useMemo(() => {
    const groups: Record<string, { weekLabel: string; hours: number; count: number; logs: InternshipLog[] }> = {};
    
    filteredLogs.forEach(log => {
      // Get ISO Week Number or simple week range
      const dateObj = new Date(log.work_date);
      const firstDayOfYear = new Date(dateObj.getFullYear(), 0, 1);
      const pastDaysOfYear = (dateObj.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      
      const year = dateObj.getFullYear();
      const weekKey = `${year}-W${weekNumber}`;
      
      // Calculate start and end date for that week roughly
      const cYear = dateObj.getFullYear();
      const cMonth = dateObj.getMonth();
      const cDay = dateObj.getDate();
      const dayOfWeek = dateObj.getDay(); // 0 is Sun, 1 is Mon etc.
      
      const sunOffset = dayOfWeek;
      const sunDate = new Date(cYear, cMonth, cDay - sunOffset);
      const satDate = new Date(cYear, cMonth, cDay + (6 - dayOfWeek));
      
      const formatDateStr = (d: Date) => {
        return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
      };
      
      const weekLabel = `สัปดาห์ที่ ${weekNumber} (${formatDateStr(sunDate)} - ${formatDateStr(satDate)})`;

      if (!groups[weekKey]) {
        groups[weekKey] = { weekLabel, hours: 0, count: 0, logs: [] };
      }
      groups[weekKey].hours += log.total_hours;
      groups[weekKey].count += 1;
      groups[weekKey].logs.push(log);
    });

    return Object.values(groups).sort((a, b) => b.weekLabel.localeCompare(a.weekLabel));
  }, [filteredLogs]);

  // Group Logs for Monthly Report
  const monthlyReport = useMemo(() => {
    const groups: Record<string, { monthLabel: string; hours: number; count: number; logs: InternshipLog[] }> = {};
    
    filteredLogs.forEach(log => {
      const dateObj = new Date(log.work_date);
      const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = dateObj.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

      if (!groups[monthKey]) {
        groups[monthKey] = { monthLabel, hours: 0, count: 0, logs: [] };
      }
      groups[monthKey].hours += log.total_hours;
      groups[monthKey].count += 1;
      groups[monthKey].logs.push(log);
    });

    return Object.values(groups).sort((a, b) => b.monthLabel.localeCompare(a.monthLabel));
  }, [filteredLogs]);

  // Export to Excel / CSV trigger with proper UTF-8 BOM for Thai support
  const handleExportCSV = () => {
    let csvHeaders = 'Log ID,Student ID,Student Name,Major,Work Date,Start Time,End Time,Work Details,Total Hours,Status,Supervisor Signature,Note,Created At\n';
    
    let csvRows = filteredLogs.map(log => {
      const sName = studentMap[log.student_id]?.full_name || '';
      const sMajor = studentMap[log.student_id]?.major || '';
      const sDetailEscaped = `"${log.work_detail.replace(/"/g, '""')}"`;
      const sStatus = log.status === 'approved' ? 'อนุมัติแล้ว' : log.status === 'rejected' ? 'ปฏิเสธ' : 'รอตรวจสอบ';
      const sSignature = log.supervisor_signature ? 'มีลายเซ็นผู้ควบคุม' : 'ไม่มีลายเซ็น';
      const sNoteEscaped = `"${(log.note || '').replace(/"/g, '""')}"`;

      return [
        log.log_id,
        log.student_id,
        `"${sName}"`,
        `"${sMajor}"`,
        log.work_date,
        log.start_time,
        log.end_time,
        sDetailEscaped,
        log.total_hours,
        `"${sStatus}"`,
        `"${sSignature}"`,
        sNoteEscaped,
        log.created_at
      ].join(',');
    }).join('\n');

    const csvContent = '\uFEFF' + csvHeaders + csvRows; // Add UTF-8 BOM
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const exportName = currentStudent 
      ? `รายงานการฝึกงาน_${currentStudent.student_id}.csv` 
      : 'รายงานการฝึกงาน_ทั้งหมด.csv';
      
    link.setAttribute('download', exportName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger Print to PDF on browser
  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: 'pending' | 'approved' | 'rejected') => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">✅ อนุมัติแล้ว</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-rose-200">❌ ปฏิเสธ</span>;
      default:
        return <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-amber-200">⏳ รอตรวจสอบ</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters Pane */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm no-print">
        <div className="flex flex-col lg:flex-row gap-4 items-end justify-between">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
            {/* Student selection filter for teacher/admin */}
            {isAdminOrTeacher && (
              <div className="md:col-span-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  เลือกนักศึกษา
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">นักศึกษาทั้งหมด</option>
                  {students.map(s => (
                    <option key={s.student_id} value={s.student_id}>
                      {s.student_id} - {s.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                วันที่เริ่มต้น
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                วันที่สิ้นสุด
              </label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                ประเภทรายงาน
              </label>
              <div className="flex gap-1 p-1 bg-slate-100 rounded-lg text-xs">
                {(['summary', 'daily', 'weekly', 'monthly'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setReportType(type)}
                    className={`flex-1 py-1.5 rounded-md font-medium capitalize transition-all ${
                      reportType === type 
                        ? 'bg-white text-emerald-800 shadow-sm' 
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    {type === 'summary' ? 'ภาพรวม' : type === 'daily' ? 'รายวัน' : type === 'weekly' ? 'รายสัปดาห์' : 'รายเดือน'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 w-full lg:w-auto shrink-0 justify-end">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-2 px-4 rounded-xl border border-emerald-200 font-medium text-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              ส่งออก Excel (CSV)
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-xl border border-slate-200 font-medium text-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              ส่งออก PDF / พิมพ์
            </button>
          </div>
        </div>
      </div>

      {/* Main Print Container Sheet */}
      <div className="space-y-6">

        {/* PRINT ONLY Header Block */}
        <div className="hidden print-only text-center border-b pb-6 space-y-2">
          <h1 className="text-xl font-bold text-slate-900 ThaiSpecial">รายงานบันทึกประวัติการฝึกงานสหกิจศึกษา</h1>
          <p className="text-sm text-slate-600">
            {currentStudent ? `นักศึกษา: ${currentStudent.full_name} (${currentStudent.student_id}) สาขาวิชา: ${currentStudent.major}` : 'สรุปรายงานนักศึกษาทั้งหมด'}
          </p>
          <div className="text-xs text-slate-500">
            พิมพ์ข้อมูล ณ วันที่: {new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}
          </div>
        </div>

        {/* 1. SUMMARY TAB */}
        {reportType === 'summary' && (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                  <Clock className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">ชั่วโมงฝึกงานทั้งหมดที่บันทึก</div>
                  <div className="text-2xl font-black text-slate-800">{stats.totalHours} <span className="text-xs font-semibold text-slate-500">ชม.</span></div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                  <CheckCircle2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">ชั่วโมงที่อนุมัติแล้ว</div>
                  <div className="text-2xl font-black text-emerald-700">{stats.approvedHours} <span className="text-xs font-semibold text-slate-500">ชม.</span></div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                  <Calendar className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">จำนวนวันปฏิบัติงาน</div>
                  <div className="text-2xl font-black text-slate-800">{stats.totalCount} <span className="text-xs font-semibold text-slate-500">วัน</span></div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <TrendingUp className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">เปอร์เซ็นต์ความสำเร็จ</div>
                  <div className="text-2xl font-black text-slate-800">
                    {Math.round((stats.approvedHours / 320) * 100)}%
                    <span className="text-xs font-semibold text-slate-500"> (เป้าหมาย 320 ชม.)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress visualization */}
            {currentStudent && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    แถบแสดงความคืบหน้าของชั่วโมงการปฏิบัติงานสหกิจศึกษา
                  </div>
                  <span className="text-xs font-semibold text-slate-600">{stats.approvedHours} / 320 ชม.</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (stats.approvedHours / 320) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 mt-1.5 font-medium">
                  <span>เริ่มการฝึกงาน (0 ชั่วโมง)</span>
                  <span>ผ่านเกณฑ์สหกิจขั้นต่ำ (320 ชั่วโมง)</span>
                </div>
              </div>
            )}

            {/* Master Logs Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between no-print">
                <h3 className="font-bold text-slate-800">รายการบันทึกการฝึกงานทั้งหมด</h3>
                <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
                  พบ {filteredLogs.length} รายการ
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-600 uppercase bg-slate-50 border-b border-slate-200 font-semibold text-[11px]">
                    <tr>
                      <th className="px-5 py-3.5">วันที่</th>
                      {(!currentStudent || selectedStudentId === 'all') && (
                        <th className="px-5 py-3.5">คู่กรณี / นักศึกษา</th>
                      )}
                      <th className="px-5 py-3.5">เวลาทำงาน</th>
                      <th className="px-5 py-3.5">ชั่วโมงปฏิบัติงาน</th>
                      <th className="px-5 py-3.5">งานที่ปฏิบัติโดยย่อ</th>
                      <th className="px-5 py-3.5 text-center">ลายซิกผู้ควบคุม</th>
                      <th className="px-5 py-3.5 text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-slate-400 font-medium bg-slate-50/20">
                          ไม่มีข้อมูลบันทึกการฝึกงานในตัวกรองนี้
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map(log => {
                        const s = studentMap[log.student_id];
                        return (
                          <tr key={log.log_id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-5 py-4 font-semibold text-slate-700 whitespace-nowrap">
                              {new Date(log.work_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            {(!currentStudent || selectedStudentId === 'all') && (
                              <td className="px-5 py-4 whitespace-nowrap">
                                <div className="font-semibold text-slate-800 text-xs">{s?.full_name || log.student_id}</div>
                                <div className="text-[10px] text-slate-500">{s?.student_id || ''}</div>
                              </td>
                            )}
                            <td className="px-5 py-4 text-xs font-semibold text-slate-600 whitespace-nowrap">
                              {log.start_time} - {log.end_time} น.
                            </td>
                            <td className="px-5 py-4 font-bold text-slate-800">
                              {log.total_hours} ชม.
                            </td>
                            <td className="px-5 py-4 max-w-xs text-slate-600 text-xs font-medium">
                              <p className="line-clamp-2">{log.work_detail}</p>
                              {log.note && <span className="text-[10px] text-orange-600 block mt-1 font-normal">&#x2a; {log.note}</span>}
                            </td>
                            <td className="px-5 py-4 text-center">
                              {log.supervisor_signature ? (
                                <div className="flex items-center justify-center">
                                  <img 
                                    src={log.supervisor_signature} 
                                    alt="Signature preview" 
                                    className="h-7 w-auto object-contain border border-slate-100 rounded p-0.5 bg-slate-50"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              ) : (
                                <span className="text-xs text-rose-500 font-medium">ไม่มี</span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-center whitespace-nowrap">
                              {getStatusBadge(log.status)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2. DAILY REPORT */}
        {reportType === 'daily' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">รายงานการฝึกงานประจำวัน</h3>
              <p className="text-xs text-slate-500 mt-1">รายละเอียดงานที่ปฏิบัติรายวันอย่างเป็นระเบียบ</p>
            </div>
            
            <div className="p-6 space-y-6">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 font-medium">ไม่มีรายการฝึกงานส่งสำหรับวันนี้</div>
              ) : (
                filteredLogs.map(log => {
                  const s = studentMap[log.student_id];
                  return (
                    <div key={log.log_id} className="border border-slate-100 rounded-xl p-5 hover:border-slate-200 transition-colors bg-slate-50/30 shadow-xs space-y-3 print:border-b-2 print:pb-6 print:mb-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-dashed border-slate-200 pb-2.5">
                        <div>
                          <span className="text-xs bg-emerald-50 border border-emerald-100 text-emerald-700 font-semibold py-1 px-3 rounded-full">
                            {new Date(log.work_date).toLocaleDateString('th-TH', { dateStyle: 'full' })}
                          </span>
                        </div>
                        <div className="mt-2 md:mt-0 flex items-center gap-3">
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            {log.start_time} - {log.end_time} น. ({log.total_hours} ชม.)
                          </div>
                          {getStatusBadge(log.status)}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-3 space-y-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">รายละเอียดงานที่ปฏิบัติ:</span>
                            <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
                              {log.work_detail}
                            </p>
                          </div>
                          
                          {log.note && (
                            <div className="bg-orange-50 border border-orange-100 rounded-lg p-2.5">
                              <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest block">หมายเหตุเพิ่มเติม:</span>
                              <p className="text-xs text-orange-800">{log.note}</p>
                            </div>
                          )}

                          {log.feedback && (
                            <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-2.5">
                              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block">ความเห็นจากอาจารย์นิเทศ / ผู้ควบคุม:</span>
                              <p className="text-xs text-emerald-800 font-medium">{log.feedback}</p>
                            </div>
                          )}
                        </div>

                        <div className="border-l border-slate-100 pl-4 flex flex-col justify-between items-center md:items-end text-center md:text-right">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">ลายเซ็นผู้ควบคุมงาน:</span>
                            {log.supervisor_signature ? (
                              <div className="bg-white p-1.5 border border-slate-200 rounded-lg inline-block">
                                <img 
                                  src={log.supervisor_signature} 
                                  alt="Signature preview" 
                                  className="h-12 w-32 object-contain"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            ) : (
                              <p className="text-xs text-rose-500 font-medium">ยังไม่ได้รับการรับรอง</p>
                            )}
                          </div>

                          <div className="mt-4">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">ข้อมูลนักศึกษา:</span>
                            <span className="text-xs text-slate-700 font-semibold">{s?.full_name || 'ไม่ระบุชื่อ'}</span>
                            <span className="text-[10px] text-slate-500 block">รหัส: {log.student_id}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 3. WEEKLY REPORT */}
        {reportType === 'weekly' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">รายงานรายสัปดาห์</h3>
              <p className="text-xs text-slate-500 mt-1">สรุปจำนวนชั่วโมงการทำงานแบ่งตามสัปดาห์</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-600 bg-slate-50 border-b border-slate-200 font-semibold text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5">สัปดาห์ฝึกปฏิบัติงาน</th>
                    <th className="px-5 py-3.5 text-center">จำนวนวันที่บันทึก</th>
                    <th className="px-5 py-3.5 text-center">ชั่วโมงการฝึกงานรวม</th>
                    <th className="px-5 py-3.5">ชั่วโมงเฉลี่ยต่อวัน</th>
                    <th className="px-5 py-3.5">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {weeklyReport.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-400 font-medium bg-slate-50/20">
                        ไม่มีข้อมูลบันทึกตามสัปดาห์
                      </td>
                    </tr>
                  ) : (
                    weeklyReport.map(week => {
                      const avgHours = Math.round((week.hours / week.count) * 100) / 100;
                      return (
                        <tr key={week.weekLabel} className="hover:bg-slate-50/50">
                          <td className="px-5 py-4 font-semibold text-slate-700">
                            {week.weekLabel}
                          </td>
                          <td className="px-5 py-4 text-center font-bold text-slate-600">
                            {week.count} วัน
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="text-emerald-700 font-black text-base">{week.hours}</span> ชม.
                          </td>
                          <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                            {avgHours} ชม./วัน
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {week.logs.slice(0, 5).map((log, index) => (
                                <span 
                                  key={log.log_id} 
                                  title={log.work_date}
                                  className={`inline-block h-5 w-5 rounded-full ring-2 ring-white text-[9px] font-black text-center pt-px cursor-help ${
                                    log.status === 'approved' 
                                      ? 'bg-emerald-500 text-white' 
                                      : log.status === 'rejected' 
                                      ? 'bg-rose-500 text-white' 
                                      : 'bg-amber-500 text-white'
                                  }`}
                                >
                                  {log.work_date.substring(8)}
                                </span>
                              ))}
                              {week.logs.length > 5 && (
                                <span className="flex items-center justify-center h-5 w-5 rounded-full ring-2 ring-white bg-slate-300 text-slate-800 text-[8px] font-bold">
                                  +{week.logs.length - 5}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. MONTHLY REPORT */}
        {reportType === 'monthly' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">รายงานรายเดือน</h3>
              <p className="text-xs text-slate-500 mt-1">สรุปจำนวนชั่วโมงการทำงานแบ่งตามเดือนอย่างเป็นระบบ</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-600 bg-slate-50 border-b border-slate-200 font-semibold text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5">เดือนที่ปฏิบัติงาน</th>
                    <th className="px-5 py-3.5 text-center">จำนวนวันที่ปฏิบัติงาน</th>
                    <th className="px-5 py-3.5 text-center">ชั่วโมงฝึกรวมของเดือน</th>
                    <th className="px-5 py-3.5">เป้าหมายขั้นต่ำรายเดือน</th>
                    <th className="px-5 py-3.5">ผลการฝึกอบรมภาพรวม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyReport.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-400 font-medium bg-slate-50/20">
                        ไม่มีข้อมูลบันทึกตามรายเดือน
                      </td>
                    </tr>
                  ) : (
                    monthlyReport.map(m => {
                      const percentage = Math.min(100, Math.round((m.hours / 160) * 100)); // Sample 160 hrs monthly target
                      return (
                        <tr key={m.monthLabel} className="hover:bg-slate-50/50">
                          <td className="px-5 py-4 font-bold text-slate-700">
                            {m.monthLabel}
                          </td>
                          <td className="px-5 py-4 text-center font-bold text-slate-600">
                            {m.count} วัน
                          </td>
                          <td className="px-5 py-4 text-center whitespace-nowrap">
                            <span className="text-blue-700 font-black text-base">{m.hours}</span> ชม.
                          </td>
                          <td className="px-5 py-4 text-xs font-semibold text-slate-400">
                            160 ชม. / เดือน
                          </td>
                          <td className="px-5 py-4">
                            <div className="space-y-1 w-40">
                              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                                <span>ความคืบหน้า</span>
                                <span>{percentage}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div 
                                  className="bg-emerald-500 h-full rounded-full" 
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
