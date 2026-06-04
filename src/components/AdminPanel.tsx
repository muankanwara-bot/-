import React, { useState, useMemo } from 'react';
import { Student, Teacher, Establishment, InternshipLog } from '../types';
import { 
  getStudents, addStudent, updateStudent, deleteStudent,
  getTeachers, addTeacher, updateTeacher, deleteTeacher,
  getEstablishments, addEstablishment, updateEstablishment, deleteEstablishment,
  getLogs, saveLogs, saveStudents, saveTeachers, saveEstablishments
} from '../db';
import { 
  Users, UserCog, Building2, Download, Upload, Plus, Trash2, Edit3, 
  Check, X, Database, Save, AlertCircle, RefreshCw, FileSpreadsheet 
} from 'lucide-react';

interface AdminPanelProps {
  onRefreshAllData: () => void;
}

export default function AdminPanel({ onRefreshAllData }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'students' | 'teachers' | 'establishments' | 'backup'>('students');
  
  // States of lists
  const [students, setStudents] = useState<Student[]>(() => getStudents());
  const [teachers, setTeachers] = useState<Teacher[]>(() => getTeachers());
  const [establishments, setEstablishments] = useState<Establishment[]>(() => getEstablishments());

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);

  // Messages
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Student Form states
  const [studentForm, setStudentForm] = useState<Omit<Student, 'mentor_name' | 'establishment_id'>>({
    student_id: '',
    full_name: '',
    department: '',
    major: ''
  });
  const [studentMentor, setStudentMentor] = useState('');
  const [studentEst, setStudentEst] = useState('');

  // Bulk import states
  const [studentAddMode, setStudentAddMode] = useState<'single' | 'bulk'>('single');
  const [bulkTextInput, setBulkTextInput] = useState('');
  const [bulkSeparator, setBulkSeparator] = useState<'auto' | 'tab' | 'comma' | 'semicolon'>('auto');

  // Teacher Form states
  const [teacherForm, setTeacherForm] = useState<Teacher>({
    teacher_id: '',
    full_name: '',
    department: ''
  });

  // Teacher Bulk Import / Google Sheets Sync states
  const [teacherAddMode, setTeacherAddMode] = useState<'single' | 'sheet'>('single');
  const [teacherSheetUrl, setTeacherSheetUrl] = useState<string>('https://docs.google.com/spreadsheets/d/125RRThRChUJBB3I1prrtmbw7PuGnh4Hf4WhJWXpEeB0/edit?gid=498172011#gid=498172011');
  const [isSyncingTeachers, setIsSyncingTeachers] = useState<boolean>(false);

  // Establishment Form states
  const [establishmentForm, setEstablishmentForm] = useState<Establishment>({
    id: '',
    name: '',
    address: '',
    contact_person: '',
    phone: ''
  });

  // Establishment Bulk Import / Google Sheets Sync states
  const [establishmentAddMode, setEstablishmentAddMode] = useState<'single' | 'sheet'>('single');
  const [establishmentSheetUrl, setEstablishmentSheetUrl] = useState<string>('https://docs.google.com/spreadsheets/d/125RRThRChUJBB3I1prrtmbw7PuGnh4Hf4WhJWXpEeB0/edit?gid=6354492#gid=6354492');
  const [isSyncingEstablishments, setIsSyncingEstablishments] = useState<boolean>(false);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleRefresh = () => {
    setStudents(getStudents());
    setTeachers(getTeachers());
    setEstablishments(getEstablishments());
    onRefreshAllData();
    showMsg("รีเฟรชข้อมูลล่าสุดเรียบร้อย", "success");
  };

  // Student Actions
  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.student_id || !studentForm.full_name || !studentForm.department || !studentForm.major) {
      showMsg("กรุณากรอกข้อมูลนักศึกษาให้ครบถ้วน", "error");
      return;
    }

    const newStudent: Student = {
      ...studentForm,
      mentor_name: studentMentor || undefined,
      establishment_id: studentEst || undefined
    };

    const isAdded = addStudent(newStudent);
    if (!isAdded) {
      showMsg("รหัสนักศึกษานี้มีอยู่ในระบบแล้ว", "error");
    } else {
      showMsg(`เพิ่มรหัสนักศึกษา ${studentForm.student_id} สำเร็จแล้ว`);
      setStudentForm({ student_id: '', full_name: '', department: '', major: '' });
      setStudentMentor('');
      setStudentEst('');
      setStudents(getStudents());
      onRefreshAllData();
    }
  };

  const handleBulkImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkTextInput.trim()) {
      showMsg("กรุณาใส่ข้อมูลนักศึกษาในกล่องข้อความ", "error");
      return;
    }

    const lines = bulkTextInput.split(/\r?\n/).map(line => line.trim()).filter(line => line !== '');
    if (lines.length === 0) {
      showMsg("ไม่พบข้อมูลนักศึกษาในกล่องข้อมูล", "error");
      return;
    }

    const currentStudents = getStudents();
    let importCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    const parsedStudents: Student[] = [];

    // Detect separator
    let sep = '\t';
    if (bulkSeparator === 'auto') {
      const firstLine = lines[0] || '';
      if (firstLine.includes('\t')) {
        sep = '\t';
      } else if (firstLine.includes(',')) {
        sep = ',';
      } else if (firstLine.includes(';')) {
        sep = ';';
      } else {
        sep = '\t';
      }
    } else if (bulkSeparator === 'tab') {
      sep = '\t';
    } else if (bulkSeparator === 'comma') {
      sep = ',';
    } else if (bulkSeparator === 'semicolon') {
      sep = ';';
    }

    for (let line of lines) {
      let parts: string[] = [];
      if (sep === ',') {
        const matches = line.match(/("([^"]*)"|[^,]+)/g);
        if (matches) {
          parts = matches.map(m => m.replace(/^"|"$/g, '').trim());
        } else {
          parts = line.split(',').map(p => p.trim());
        }
      } else {
        parts = line.split(sep).map(p => p.trim());
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

        if (!student_id || !full_name) {
          errorCount++;
          continue;
        }

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
      } else {
        errorCount++;
      }
    }

    if (parsedStudents.length === 0) {
      showMsg("ไม่พบแบนเนอร์ข้อมูลนักศึกษาที่เข้าคู่ กรุณาตรวจสอบว่ามี รหัสนักศึกษา และ ชื่อ-นามสกุล คั่นด้วยปุ่ม Tab หรือ Comma", "error");
      return;
    }

    const updatedStudentsList = [...currentStudents];
    for (const parsed of parsedStudents) {
      const isDuplicate = updatedStudentsList.some(s => s.student_id === parsed.student_id);
      if (isDuplicate) {
        duplicateCount++;
      } else {
        updatedStudentsList.push(parsed);
        importCount++;
      }
    }

    saveStudents(updatedStudentsList);
    setStudents(getStudents());
    onRefreshAllData();
    setBulkTextInput('');
    
    let msgText = `นำเข้าสำเร็จทั้งหมด: ${importCount} คน`;
    if (duplicateCount > 0) msgText += ` (มีรหัสซ้ำข้ามไป ${duplicateCount} คน)`;
    if (errorCount > 0) msgText += ` (ไม่สามารถอ่านข้อมูลได้ ${errorCount} แถว)`;
    showMsg(msgText, importCount > 0 ? 'success' : 'error');
  };

  const handleBulkFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setBulkTextInput(text);
          showMsg("โหลดข้อมูลไฟล์สำเร็จแล้ว ตรวจสอบตารางพรีวิวข้อมูลด้านล่าง แล้วคลิก 'นำเข้าข้อมูลนักศึกษาล็อตนี้' เพื่อบันทึก", "success");
        }
      };
      reader.readAsText(file);
    }
  };

  const bulkPreviewRows = useMemo(() => {
    if (!bulkTextInput.trim()) return [];
    
    const lines = bulkTextInput.split(/\r?\n/).map(line => line.trim()).filter(line => line !== '').slice(0, 5);
    
    let sep = '\t';
    if (bulkSeparator === 'auto') {
      const firstLine = lines[0] || '';
      if (firstLine.includes('\t')) sep = '\t';
      else if (firstLine.includes(',')) sep = ',';
      else if (firstLine.includes(';')) sep = ';';
    } else if (bulkSeparator === 'tab') sep = '\t';
    else if (bulkSeparator === 'comma') sep = ',';
    else if (bulkSeparator === 'semicolon') sep = ';';

    return lines.map(line => {
      let parts: string[] = [];
      if (sep === ',') {
        const matches = line.match(/("([^"]*)"|[^,]+)/g);
        parts = matches ? matches.map(m => m.replace(/^"|"$/g, '').trim()) : line.split(',').map(p => p.trim());
      } else {
        parts = line.split(sep).map(p => p.trim());
      }
      return {
        id: parts[0] || '',
        name: parts[1] || '',
        dept: parts[2] || 'คณะเทคโนโลยีสารสนเทศ',
        major: parts[3] || 'วิทยาการคอมพิวเตอร์',
        mentor: parts[4] || '',
        est: parts[5] || ''
      };
    }).filter(r => r.id && r.name && !r.id.toLowerCase().includes('student_id') && !r.id.toLowerCase().includes('studentid') && !r.id.includes('รหัส'));
  }, [bulkTextInput, bulkSeparator]);

  const handleEditStudent = (s: Student) => {
    setEditingId(s.student_id);
    setStudentForm({
      student_id: s.student_id,
      full_name: s.full_name,
      department: s.department,
      major: s.major
    });
    setStudentMentor(s.mentor_name || '');
    setStudentEst(s.establishment_id || '');
  };

  const handleSaveStudentEdit = (studentId: string) => {
    const updated: Student = {
      ...studentForm,
      student_id: studentId,
      mentor_name: studentMentor || undefined,
      establishment_id: studentEst || undefined
    };
    updateStudent(updated);
    setEditingId(null);
    setStudentForm({ student_id: '', full_name: '', department: '', major: '' });
    setStudentMentor('');
    setStudentEst('');
    setStudents(getStudents());
    onRefreshAllData();
    showMsg("แก้ไขข้อมูลนักศึกษาสำเร็จ");
  };

  const handleDeleteStudent = (studentId: string) => {
    if (confirm(`คุณแน่ใจว่าต้องการลบนักศึกษา รหัส ${studentId}? ประวัติการบันทึกงานที่เกี่ยวข้องทั้งหมดจะถูกลบไปด้วย`)) {
      deleteStudent(studentId);
      setStudents(getStudents());
      onRefreshAllData();
      showMsg("ลบข้อมูลนักศึกษาเรียบร้อยแล้ว", "success");
    }
  };

  // Teacher Actions
  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherForm.teacher_id || !teacherForm.full_name || !teacherForm.department) {
      showMsg("กรุณากรอกข้อมูลอาจารย์ให้ครบถ้วน", "error");
      return;
    }

    const isAdded = addTeacher(teacherForm);
    if (!isAdded) {
      showMsg("รหัสอาจารย์นี้มีอยู่ในระบบแล้ว", "error");
    } else {
      showMsg(`เพิ่มอาจารย์ ${teacherForm.full_name} สำเร็จแล้ว`);
      setTeacherForm({ teacher_id: '', full_name: '', department: '' });
      setTeachers(getTeachers());
      onRefreshAllData();
    }
  };

  const handleEditTeacher = (t: Teacher) => {
    setEditingId(t.teacher_id);
    setTeacherForm(t);
  };

  const handleSaveTeacherEdit = (id: string) => {
    const updated: Teacher = {
      ...teacherForm,
      teacher_id: id
    };
    updateTeacher(updated);
    setEditingId(null);
    setTeacherForm({ teacher_id: '', full_name: '', department: '' });
    setTeachers(getTeachers());
    onRefreshAllData();
    showMsg("แก้ไขข้อมูลอาจารย์สำเร็จ");
  };

  const handleDeleteTeacher = (id: string) => {
    if (confirm(`คุณต้องการลบข้อมูลอาจารย์รหัส ${id}?`)) {
      deleteTeacher(id);
      setTeachers(getTeachers());
      onRefreshAllData();
      showMsg("ลบข้อมูลอาจารย์เรียบร้อยแล้ว");
    }
  };

  const handleSyncTeachersGoogleSheets = async () => {
    if (!teacherSheetUrl.trim()) return;
    setIsSyncingTeachers(true);
    
    try {
      const targetUrl = `/api/proxy-sheet?url=${encodeURIComponent(teacherSheetUrl.trim())}`;
      const response = await fetch(targetUrl);
      if (!response.ok) {
        let errMsg = `ไม่สามารถเชื่อมต่อไฟล์ได้ (Status: ${response.status})`;
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errMsg = errData.error;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const text = await response.text();
      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line !== '');
      if (lines.length === 0) {
        throw new Error('ไม่พบข้อมูลที่จะนำเข้าในชีตแผ่นที่ 2');
      }

      const currentTeachers = getTeachers();
      const updatedTeachersList = [...currentTeachers];
      let importCount = 0;
      let duplicateCount = 0;

      const parsedTeachers: Teacher[] = [];

      for (let line of lines) {
        let parts: string[] = [];
        const matches = line.match(/("([^"]*)"|[^,]+)/g);
        if (matches) {
          parts = matches.map(m => m.replace(/^"|"$/g, '').trim());
        } else {
          parts = line.split(',').map(p => p.trim());
        }

        if (parts.length >= 2) {
          const teacher_id = parts[0].replace(/['"\s]/g, '');
          const full_name = parts[1];

          // Skip headers
          if (
            teacher_id.toLowerCase().includes('teacher_id') || 
            teacher_id.toLowerCase().includes('teacherid') || 
            teacher_id.includes('รหัสอาจารย์') || 
            teacher_id.includes('รหัส') || 
            full_name.includes('ชื่อ-นามสกุล') || 
            full_name.includes('ชื่อสกุล') ||
            full_name.includes('ชื่อ')
          ) {
            continue;
          }

          if (teacher_id && full_name) {
            const department = parts[2] || "คณะเทคโนโลยีสารสนเทศ";
            parsedTeachers.push({
              teacher_id,
              full_name,
              department
            });
          }
        }
      }

      if (parsedTeachers.length === 0) {
        throw new Error('โครงสร้าง Google Sheet ไม่ถูกต้อง คอลัมน์ที่ 1 ต้องเป็นรหัสอาจารย์ และคอลัมน์ที่ 2 เป็นชื่อ-นามสกุล');
      }

      for (const parsed of parsedTeachers) {
        const idx = updatedTeachersList.findIndex(t => t.teacher_id === parsed.teacher_id);
        if (idx !== -1) {
          updatedTeachersList[idx] = parsed;
          duplicateCount++;
        } else {
          updatedTeachersList.push(parsed);
          importCount++;
        }
      }

      saveTeachers(updatedTeachersList);
      setTeachers(getTeachers());
      onRefreshAllData();
      showMsg(`✓ ซิงค์รายชื่ออาจารย์นิเทศสำเร็จจำนวน ${parsedTeachers.length} ท่าน (เพิ่มใหม่ ${importCount} ท่าน, อัปเดต ${duplicateCount} ท่าน)`);
      setTeacherAddMode('single');
    } catch (err: any) {
      showMsg(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลจาก Google Sheets', 'error');
    } finally {
      setIsSyncingTeachers(false);
    }
  };

  // Establishment Actions
  const handleAddEstablishment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!establishmentForm.id || !establishmentForm.name || !establishmentForm.address) {
      showMsg("กรุณากรอกข้อมูลสถานประกอบการที่จำเป็น", "error");
      return;
    }

    const isAdded = addEstablishment(establishmentForm);
    if (!isAdded) {
      showMsg("รหัสสถานประกอบการนี้มีอยู่แล้ว", "error");
    } else {
      showMsg(`เพิ่มสถานประกอบการ ${establishmentForm.name} สำเร็จ`);
      setEstablishmentForm({ id: '', name: '', address: '', contact_person: '', phone: '' });
      setEstablishments(getEstablishments());
      onRefreshAllData();
    }
  };

  const handleEditEstablishment = (est: Establishment) => {
    setEditingId(est.id);
    setEstablishmentForm(est);
  };

  const handleSaveEstablishmentEdit = (id: string) => {
    const updated: Establishment = {
      ...establishmentForm,
      id: id
    };
    updateEstablishment(updated);
    setEditingId(null);
    setEstablishmentForm({ id: '', name: '', address: '', contact_person: '', phone: '' });
    setEstablishments(getEstablishments());
    onRefreshAllData();
    showMsg("แก้ไขสถานประกอบการสำเร็จ");
  };

  const handleDeleteEstablishment = (id: string) => {
    if (confirm(`คุณต้องการลบสถานประกอบการ รหัส ${id}?`)) {
      deleteEstablishment(id);
      setEstablishments(getEstablishments());
      onRefreshAllData();
      showMsg("ลบสถานประกอบการเรียบร้อยแล้ว");
    }
  };

  const handleSyncEstablishmentsGoogleSheets = async () => {
    if (!establishmentSheetUrl.trim()) return;
    setIsSyncingEstablishments(true);

    try {
      const targetUrl = `/api/proxy-sheet?url=${encodeURIComponent(establishmentSheetUrl.trim())}`;
      const response = await fetch(targetUrl);
      if (!response.ok) {
        let errMsg = `ไม่สามารถเชื่อมต่อไฟล์ได้ (Status: ${response.status})`;
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errMsg = errData.error;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const text = await response.text();
      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line !== '');
      if (lines.length === 0) {
        throw new Error('ไม่พบข้อมูลที่จะนำเข้าในชีตแผ่นที่ 3');
      }

      const currentEsts = getEstablishments();
      const updatedEstList = [...currentEsts];
      let importCount = 0;
      let duplicateCount = 0;

      const parsedEstablishments: Establishment[] = [];

      for (let line of lines) {
        let parts: string[] = [];
        const matches = line.match(/("([^"]*)"|[^,]+)/g);
        if (matches) {
          parts = matches.map(m => m.replace(/^"|"$/g, '').trim());
        } else {
          parts = line.split(',').map(p => p.trim());
        }

        if (parts.length >= 2) {
          const id = parts[0].replace(/['"\s]/g, '');
          const info = parts[1] || '';

          // Skip headers
          if (
            id.toLowerCase().includes('id') || 
            id.toLowerCase().includes('รหัส') || 
            info.toLowerCase().includes('สถานที่') || 
            info.toLowerCase().includes('ชื่อ')
          ) {
            continue;
          }

          if (id && info) {
            let name = info;
            let address = '';

            // Split name and address on 2 or more spaces
            const spaceSplit = info.split(/\s\s+/);
            if (spaceSplit.length >= 2) {
              name = spaceSplit[0].trim();
              address = spaceSplit.slice(1).join(' ').trim();
            } else {
              // Try regex with common address keywords
              const addressWitnesses = ["เลขที่", "ที่อยู่", "ถ.", "ถนน", "หมู่", "ซอย", "ต.", "ตำบล", "อ.", "อำเภอ", "จ.", "จังหวัด", "อาคาร", "ชั้น", "แขวง", "เขต"];
              let foundIndex = -1;
              for (const witness of addressWitnesses) {
                const idx = info.indexOf(witness);
                if (idx !== -1 && (foundIndex === -1 || idx < foundIndex)) {
                  foundIndex = idx;
                }
              }
              if (foundIndex > 0) {
                name = info.substring(0, foundIndex).trim();
                address = info.substring(foundIndex).trim();
              } else {
                name = info.trim();
                address = "-";
              }
            }

            const contact_person = parts[2] || '';
            const phone = parts[3] || '';

            parsedEstablishments.push({
              id,
              name,
              address,
              contact_person,
              phone
            });
          }
        }
      }

      if (parsedEstablishments.length === 0) {
        throw new Error('โครงสร้าง Google Sheet ไม่ถูกต้อง คอลัมน์ที่ 1 ต้องเป็นรหัส และคอลัมน์ที่ 2 ต้องเป็นชื่อสถานประกอบการพร้อมรายละเอียด');
      }

      for (const parsed of parsedEstablishments) {
        const idx = updatedEstList.findIndex(e => e.id === parsed.id);
        if (idx !== -1) {
          updatedEstList[idx] = parsed;
          duplicateCount++;
        } else {
          updatedEstList.push(parsed);
          importCount++;
        }
      }

      saveEstablishments(updatedEstList);
      setEstablishments(getEstablishments());
      onRefreshAllData();
      showMsg(`✓ ซิงค์รายชื่อสถานประกอบการสำเร็จจำนวน ${parsedEstablishments.length} แห่ง (เพิ่มใหม่ ${importCount} แห่ง, อัปเดต ${duplicateCount} แห่ง)`);
      setEstablishmentAddMode('single');
    } catch (err: any) {
      showMsg(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลจาก Google Sheets', 'error');
    } finally {
      setIsSyncingEstablishments(false);
    }
  };

  // Systems Backup export / import JSON
  const handleBackupExport = () => {
    const backupData = {
      students: getStudents(),
      teachers: getTeachers(),
      establishments: getEstablishments(),
      logs: getLogs()
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_internship_system_${new Date().toISOString().substring(0,10)}.json`;
    link.click();
    showMsg("สำรองข้อมูลสำเร็จ ไฟล์ JSON กำลังดาวน์โหลด");
  };

  const handleBackupImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported = JSON.parse(reader.result as string);
          if (imported.students && imported.teachers && imported.establishments && imported.logs) {
            saveStudents(imported.students);
            saveTeachers(imported.teachers);
            saveEstablishments(imported.establishments);
            saveLogs(imported.logs);

            setStudents(imported.students);
            setTeachers(imported.teachers);
            setEstablishments(imported.establishments);
            
            showMsg("✅ นำเข้าข้อมูลสำรองสำเร็จ ตารางข้อมูลได้รับการอัปเกรดเรียบร้อย", "success");
            onRefreshAllData();
          } else {
            showMsg("รูปแบบเอกสารไม่ตรงกับข้อมูลระบบ กรุณาตรวจสอบไฟล์สำรอง", "error");
          }
        } catch {
          showMsg("ไม่สามารถอ่านไฟล์ JSON ดังกล่าวได้ มีข้อผิดพลาดในโครงสร้าง", "error");
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Tab Select buttons */}
      <div className="flex border-b border-slate-100 overflow-x-auto bg-slate-50 p-1">
        <button
          onClick={() => { setActiveTab('students'); setEditingId(null); }}
          className={`flex items-center gap-2 py-3 px-5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'students' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-600" />
          จัดการนักศึกษา (Students)
        </button>
        <button
          onClick={() => { setActiveTab('teachers'); setEditingId(null); }}
          className={`flex items-center gap-2 py-3 px-5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'teachers' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <UserCog className="w-4 h-4 text-sky-600" />
          จัดการอาจารย์นิเทศ
        </button>
        <button
          onClick={() => { setActiveTab('establishments'); setEditingId(null); }}
          className={`flex items-center gap-2 py-3 px-5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'establishments' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4 text-teal-600" />
          จัดการสถานประกอบการ
        </button>
        <button
          onClick={() => { setActiveTab('backup'); setEditingId(null); }}
          className={`flex items-center gap-2 py-3 px-5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'backup' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4 text-amber-600" />
          สำรองข้อมูลระบบ
        </button>
      </div>

      {/* Message alerts */}
      {message && (
        <div className={`p-4 mx-5 mt-5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
          message.type === 'success' ? 'bg-emerald-50 border border-emerald-100 text-emerald-800' : 'bg-rose-50 border border-rose-100 text-rose-800'
        }`}>
          <AlertCircle className="w-4 h-4" />
          {message.text}
        </div>
      )}

      {/* Tab Panels */}
      <div className="p-6">
        
        {/* 1. STUDENTS TAB */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            
            {/* Multi-mode add toggle */}
            <div className="flex border-b border-slate-100 gap-4">
              <button
                type="button"
                onClick={() => { setStudentAddMode('single'); setEditingId(null); }}
                className={`pb-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
                  studentAddMode === 'single' ? 'border-emerald-500 text-emerald-800' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                👤 เพิ่มนักศึกษาทีละคน
              </button>
              <button
                type="button"
                onClick={() => { setStudentAddMode('bulk'); setEditingId(null); }}
                className={`pb-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
                  studentAddMode === 'bulk' ? 'border-emerald-500 text-emerald-800' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                📋 คัดลอกวางจาก Google Sheets / Excel ล็อตใหญ่
              </button>
            </div>

            {studentAddMode === 'single' ? (
              <form onSubmit={handleAddStudent} className="bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-4">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  เพิ่มบัตรนักศึกษาใหม่เข้าระบบ
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">รหัสนักศึกษา</label>
                    <input
                      type="text"
                      required
                      maxLength={15}
                      placeholder="เช่น 65011234001"
                      value={studentForm.student_id}
                      disabled={editingId !== null}
                      onChange={(e) => setStudentForm({ ...studentForm, student_id: e.target.value })}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">ชื่อ-นามสกุล</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น นายสุขสันต์ ขันติ"
                      value={studentForm.full_name}
                      onChange={(e) => setStudentForm({ ...studentForm, full_name: e.target.value })}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">คณะ / แผนก</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น คณะวิทยาศาสตร์และเทคโนโลยี"
                      value={studentForm.department}
                      onChange={(e) => setStudentForm({ ...studentForm, department: e.target.value })}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">สาขาวิชา</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น วิทยาการคอมพิวเตอร์"
                      value={studentForm.major}
                      onChange={(e) => setStudentForm({ ...studentForm, major: e.target.value })}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">อาจารย์นิเทศที่รับผิดชอบ</label>
                    <select
                      value={studentMentor}
                      onChange={(e) => setStudentMentor(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white"
                    >
                      <option value="">-- เลือกอาจารย์ประเมิน --</option>
                      {teachers.map(t => (
                        <option key={t.teacher_id} value={t.full_name}>{t.full_name} ({t.department})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">สถานประกอบการฝึกงาน</label>
                    <select
                      value={studentEst}
                      onChange={(e) => setStudentEst(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white"
                    >
                      <option value="">-- เลือกบริษัท / สถานที่ฝึกงาน --</option>
                      {establishments.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setStudentForm({ student_id: '', full_name: '', department: '', major: '' });
                        setStudentMentor('');
                        setStudentEst('');
                      }}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 px-4 rounded-xl font-medium text-xs transition-colors cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                  )}
                  
                  <button
                    type="submit"
                    onClick={(e) => {
                      if (editingId) {
                        e.preventDefault();
                        handleSaveStudentEdit(editingId);
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-5 rounded-xl text-xs flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {editingId ? "บันทึกแก้ไข" : "เพิ่มพิกัดนักศึกษา"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleBulkImport} className="bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-600" />
                      นำเข้าคู่รายชื่อแบบคัดลอกวางด่วน (Bulk Text Import)
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">คัดลอกตารางจาก Google Sheets หรือ Excel ของคุณมาวางลงกล่องด้านล่างนี้ และคอลัมน์จะถูกคัดแยกอัตโนมัติ</p>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <label className="bg-amber-50 hover:bg-amber-100 text-amber-800 font-extrabold py-1.5 px-3 rounded-lg border border-amber-200 text-[11px] cursor-pointer inline-flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5" />
                      อัปโหลดไฟล์ (.csv / .txt)
                      <input
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleBulkFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      กล่องนำเข้าข้อความ (วางตารางที่คัดลอกตรงนี้)
                    </label>
                    <textarea
                      rows={6}
                      value={bulkTextInput}
                      onChange={(e) => setBulkTextInput(e.target.value)}
                      placeholder={`ตัวอย่างการพิมพ์คอลัมน์คั่นด้วยปุ่ม Tab หรือ Comma:
65011234001	สมศักดิ์ รักดี	เทคโนโลยีสารสนเทศ	การพัฒนาซอฟต์แวร์
65011456001	วิภาดา ใจแก้ว	วิทยาการคอมพิวเตอร์	วิทยาการข้อมูล`}
                      className="w-full text-xs font-mono border border-slate-200 rounded-lg p-3 bg-white text-slate-700"
                    />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">ตัวแยกเสาข้อมูล (Separator)</label>
                      <select
                        value={bulkSeparator}
                        onChange={(e) => setBulkSeparator(e.target.value as any)}
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white"
                      >
                        <option value="auto">🔍 ตรวจจับอัตโนมัติ (Auto)</option>
                        <option value="tab">⇥ คีย์เวิร์ด Tab (คัดลอกกูเกิลชีตมา)</option>
                        <option value="comma">, เครื่องหมายจุลภาค Comma (,)</option>
                        <option value="semicolon">; เครื่องหมายอัฒภาค Semicolor (;)</option>
                      </select>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-100/70 p-3 rounded-xl text-[10px] text-emerald-800 leading-relaxed font-medium space-y-1">
                      <div className="font-extrabold uppercase">ลำดับคอลัมน์ที่รองรับ:</div>
                      <ol className="list-decimal list-inside space-y-0.5 text-slate-500 font-normal">
                        <li><span className="font-bold text-slate-700">รหัสนักศึกษา</span> (ID)</li>
                        <li><span className="font-bold text-slate-700">ชื่อ-นามสกุล</span> (Name)</li>
                        <li><span className="font-bold text-slate-700">คณะ/แผนก</span> (คอลัมน์ 3 - เสริม)</li>
                        <li><span className="font-bold text-slate-700">สาขาวิชา</span> (คอลัมน์ 4 - เสริม)</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {bulkPreviewRows.length > 0 && (
                  <div className="bg-slate-100 border border-slate-200 rounded-xl p-3.5 space-y-2">
                    <span className="text-[10px] font-extrabold uppercase text-slate-500 block">👁️ ตัวอย่างพรีวิวข้อมูลขณะนี้ (แรกสุด 5 รายการ):</span>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px] text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-300 text-slate-600 font-bold">
                            <th className="pb-1 pr-3">รหัสนักศึกษา</th>
                            <th className="pb-1 pr-3">ชื่อ-นามสกุล</th>
                            <th className="pb-1 pr-3">แผนก / คณะ</th>
                            <th className="pb-1 offset-y">สาขาวิชา</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60 font-semibold text-slate-700">
                          {bulkPreviewRows.map((row, i) => (
                            <tr key={i}>
                              <td className="py-1.5 pr-3 font-mono">{row.id}</td>
                              <td className="py-1.5 pr-3">{row.name}</td>
                              <td className="py-1.5 pr-3 text-slate-500">{row.dept}</td>
                              <td className="py-1.5 text-slate-500">{row.major}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 px-5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    ยืนยันนำเข้ารายชื่อทั้งหมดด่วน ({bulkPreviewRows.length} รายการที่เข้าคู่)
                  </button>
                </div>
              </form>
            )}

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px]">
                  <tr>
                    <th className="px-5 py-3">รหัส</th>
                    <th className="px-5 py-3">ชื่อ-สกุล</th>
                    <th className="px-5 py-3">แผนก / คณะ</th>
                    <th className="px-5 py-3">สาขาวิชา</th>
                    <th className="px-5 py-3">อาจารย์นิเทศ</th>
                    <th className="px-5 py-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map(s => (
                    <tr key={s.student_id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-bold text-slate-700">{s.student_id}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-800">{s.full_name}</td>
                      <td className="px-5 py-3.5 text-slate-500">{s.department}</td>
                      <td className="px-5 py-3.5 text-slate-500 font-medium">{s.major}</td>
                      <td className="px-5 py-3.5 text-slate-800 font-medium">
                        {s.mentor_name ? <span className="text-emerald-700">👤 {s.mentor_name}</span> : <span className="text-slate-400">ยังไม่กำหนด</span>}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => handleEditStudent(s)}
                            className="bg-sky-50 text-sky-700 p-1.5 rounded-lg border border-sky-100 hover:bg-sky-100 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(s.student_id)}
                            className="bg-rose-50 text-rose-700 p-1.5 rounded-lg border border-rose-100 hover:bg-rose-100 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. TEACHERS TAB */}
        {activeTab === 'teachers' && (
          <div className="space-y-6">
            <div className="flex border-b border-slate-100 gap-4 mb-2">
              <button
                type="button"
                onClick={() => { setTeacherAddMode('single'); setEditingId(null); }}
                className={`pb-3 text-xs font-black border-b-2 transition-all cursor-pointer ${
                  teacherAddMode === 'single' ? 'border-sky-500 text-sky-800' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                👤 เพิ่มคณาจารย์ทีละคน
              </button>
              <button
                type="button"
                onClick={() => { setTeacherAddMode('sheet'); setEditingId(null); }}
                className={`pb-3 text-xs font-black border-b-2 transition-all cursor-pointer ${
                  teacherAddMode === 'sheet' ? 'border-sky-500 text-sky-800' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                🔗 ซิงค์คณาจารย์จาก Google Sheets (หน้าที่ 2)
              </button>
            </div>

            {teacherAddMode === 'single' ? (
              <form onSubmit={handleAddTeacher} className="bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-4">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-4 h-4 text-sky-600" />
                  เพิ่มคณาจารย์ที่นิเทศภาพรวม
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">รหัสอาจารย์</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น T003"
                      value={teacherForm.teacher_id}
                      disabled={editingId !== null}
                      onChange={(e) => setTeacherForm({ ...teacherForm, teacher_id: e.target.value })}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">ชื่อ-สกุล</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น อ. สมฤดี พลวิไล"
                      value={teacherForm.full_name}
                      onChange={(e) => setTeacherForm({ ...teacherForm, full_name: e.target.value })}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">ภาควิชา / สังกัด</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น เทคโนโลยีสารสนเทศ"
                      value={teacherForm.department}
                      onChange={(e) => setTeacherForm({ ...teacherForm, department: e.target.value })}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setTeacherForm({ teacher_id: '', full_name: '', department: '' });
                      }}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 px-4 rounded-xl font-medium text-xs transition-colors cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                  )}
                  <button
                    type="submit"
                    onClick={(e) => {
                      if (editingId) {
                        e.preventDefault();
                        handleSaveTeacherEdit(editingId);
                      }
                    }}
                    className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-5 rounded-xl text-xs flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {editingId ? "บันทึกแก้ไข" : "เพิ่มคณาจารย์"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-sky-50/50 border border-sky-100 p-5 rounded-xl space-y-3.5 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-black text-sky-850">
                  <FileSpreadsheet className="w-4 h-4 text-sky-600 animate-pulse" />
                  <span>ดึงข้อมูลรายชื่ออาจารย์จาก Google Sheets (หน้าที่ 2) 🔗</span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold leading-normal">
                  ดึงข้อมูลรายชื่ออาจารย์นิเทศโดยใช้ลิงก์จากชีตแผ่นที่ 2 (ที่มีข้อมูลรหัสอาจารย์, ชื่อ-นามสกุล, และภาควิชา) กดปุ่ม <b>"ดึงข้อมูลอาจารย์"</b> เพื่ออัปเดตข้อมูลล่าสุดทันที
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    placeholder="ป้อน URL ของ Google Sheet แผ่นที่ 2"
                    value={teacherSheetUrl}
                    onChange={(e) => setTeacherSheetUrl(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSyncTeachersGoogleSheets}
                    disabled={isSyncingTeachers}
                    className="bg-sky-600 hover:bg-sky-700 disabled:bg-sky-350 text-white font-extrabold text-[11px] px-5 py-2.5 rounded-xl transition-all cursor-pointer shrink-0 shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTeachers ? 'animate-spin' : ''}`} />
                    {isSyncingTeachers ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูลอาจารย์'}
                  </button>
                </div>
              </div>
            )}

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px]">
                  <tr>
                    <th className="px-5 py-3">รหัสอาจารย์</th>
                    <th className="px-5 py-3">ชื่อ-นามสกุล</th>
                    <th className="px-5 py-3">ภาควิชาสังกัด</th>
                    <th className="px-5 py-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teachers.map(t => (
                    <tr key={t.teacher_id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-bold text-slate-700">{t.teacher_id}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-800">{t.full_name}</td>
                      <td className="px-5 py-3.5 text-slate-500 font-medium">{t.department}</td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => handleEditTeacher(t)}
                            className="bg-sky-50 text-sky-700 p-1.5 rounded-lg border border-sky-100 hover:bg-sky-100 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTeacher(t.teacher_id)}
                            className="bg-rose-50 text-rose-700 p-1.5 rounded-lg border border-rose-100 hover:bg-rose-100 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. ESTABLISHMENTS TAB */}
        {activeTab === 'establishments' && (
          <div className="space-y-6">
            <div className="flex border-b border-slate-100 gap-4 mb-2">
              <button
                type="button"
                onClick={() => { setEstablishmentAddMode('single'); setEditingId(null); }}
                className={`pb-3 text-xs font-black border-b-2 transition-all cursor-pointer ${
                  establishmentAddMode === 'single' ? 'border-teal-500 text-teal-800' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                🏢 เพิ่มสถานประกอบการทีละแห่ง
              </button>
              <button
                type="button"
                onClick={() => { setEstablishmentAddMode('sheet'); setEditingId(null); }}
                className={`pb-3 text-xs font-black border-b-2 transition-all cursor-pointer ${
                  establishmentAddMode === 'sheet' ? 'border-teal-500 text-teal-800' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                🔗 ซิงค์จาก Google Sheets (หน้าที่ 3)
              </button>
            </div>

            {establishmentAddMode === 'single' ? (
              <form onSubmit={handleAddEstablishment} className="bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-4">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-600" />
                  เพิ่มสถานประกอบการฝึกสหกิจศึกษา
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-1">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">รหัสสถานที่ (ID)</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น EST004"
                      value={establishmentForm.id}
                      disabled={editingId !== null}
                      onChange={(e) => setEstablishmentForm({ ...establishmentForm, id: e.target.value })}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white disabled:bg-slate-100"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">ชื่อองค์กร / สถานประกอบการ</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น บริษัท อาร์ต แอนด์ เทค ซอฟต์ แวร์ จำกัด"
                      value={establishmentForm.name}
                      onChange={(e) => setEstablishmentForm({ ...establishmentForm, name: e.target.value })}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">ที่ตั้งอาคารสถานที่</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="กรอกข้อมูลที่อยู่โดยละเอียด เช่น ถนน แขวง เขต จังหวัด รหัสไปรษณีย์"
                    value={establishmentForm.address}
                    onChange={(e) => setEstablishmentForm({ ...establishmentForm, address: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white text-slate-700"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">ผู้ควบคุมงาน / ผู้ประสานงาน</label>
                    <input
                      type="text"
                      placeholder="เช่น คุณรัตนา ลพมงคล (ฝ่ายทรัพยากรบุคคล)"
                      value={establishmentForm.contact_person}
                      onChange={(e) => setEstablishmentForm({ ...establishmentForm, contact_person: e.target.value })}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">เบอร์ติดต่อประสานงาน</label>
                    <input
                      type="text"
                      placeholder="เช่น 02-333-4444"
                      value={establishmentForm.phone}
                      onChange={(e) => setEstablishmentForm({ ...establishmentForm, phone: e.target.value })}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setEstablishmentForm({ id: '', name: '', address: '', contact_person: '', phone: '' });
                      }}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 px-4 rounded-xl font-medium text-xs transition-colors cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                  )}
                  <button
                    type="submit"
                    onClick={(e) => {
                      if (editingId) {
                        e.preventDefault();
                        handleSaveEstablishmentEdit(editingId);
                      }
                    }}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-5 rounded-xl text-xs flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {editingId ? "บันทึกแก้ไข" : "เพิ่มสถานที่ฝึกงาน"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-teal-50/50 border border-teal-100 p-5 rounded-xl space-y-3.5 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-black text-teal-900">
                  <FileSpreadsheet className="w-4 h-4 text-teal-600 animate-pulse" />
                  <span>ดึงข้อมูลสถานประกอบการจาก Google Sheets (หน้าที่ 3) 🔗</span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold leading-normal">
                  ดึงข้อมูลสถานประกอบการโดยใช้ลิงก์แผ่นที่ 3 ของไฟล์ Google Sheet (ซึ่งมีรายละเอียดรหัส, ชื่อสถานประกอบการ, ที่อยู่, ผู้รับผิดชอบ และเบอร์ติดต่อ) กดปุ่ม <b>"ดึงข้อมูลสถานประกอบการ"</b> เพื่อซิงค์ทันที
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    placeholder="ป้อน URL ของ Google Sheet แผ่นที่ 3"
                    value={establishmentSheetUrl}
                    onChange={(e) => setEstablishmentSheetUrl(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSyncEstablishmentsGoogleSheets}
                    disabled={isSyncingEstablishments}
                    className="bg-teal-600 hover:bg-teal-700 disabled:bg-teal-350 text-white font-extrabold text-[11px] px-5 py-2.5 rounded-xl transition-all cursor-pointer shrink-0 shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingEstablishments ? 'animate-spin' : ''}`} />
                    {isSyncingEstablishments ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูลสถานประกอบการ'}
                  </button>
                </div>
              </div>
            )}

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px]">
                  <tr>
                    <th className="px-5 py-3">รหัสบิล</th>
                    <th className="px-5 py-3">ชื่อองค์กร / สถานที่ประสงค์</th>
                    <th className="px-5 py-3">บุคคลประสานงาน</th>
                    <th className="px-5 py-3">เบอร์ติดต่อ</th>
                    <th className="px-5 py-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {establishments.map(est => (
                    <tr key={est.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-bold text-slate-700 whitespace-nowrap">{est.id}</td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-800">{est.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 max-w-sm line-clamp-1">{est.address}</div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">{est.contact_person || '-'}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-500 whitespace-nowrap">{est.phone || '-'}</td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => handleEditEstablishment(est)}
                            className="bg-sky-50 text-sky-700 p-1.5 rounded-lg border border-sky-100 hover:bg-sky-100 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEstablishment(est.id)}
                            className="bg-rose-50 text-rose-700 p-1.5 rounded-lg border border-rose-100 hover:bg-rose-100 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. SYSTEM BACKUP AND RESTORE */}
        {activeTab === 'backup' && (
          <div className="space-y-6 max-w-xl mx-auto py-10 text-center">
            <div className="inline-flex bg-amber-50 rounded-2xl p-4 border border-amber-100 text-amber-700 mb-2">
              <Database className="w-10 h-10" />
            </div>
            
            <div>
              <h3 className="font-black text-slate-850 text-base">ระบบสำรองพิกัดข้อมูลสหกิจศึกษา</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                คุณสามารถส่งออกข้อมูลนักศึกษา บิลสะสมตารางงาน ลายเซ็นอิเล็กทรอนิกส์ทั้งหมดเป็นไฟล์เอกสาร JSON ภายนอก และนำมาอัปโหลดเพื่อกู้คืนเมื่อใดก็ได้
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
              <button
                onClick={handleBackupExport}
                className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-6 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                สำรองข้อมูลออกเป็นไฟล์ระบบ (.json)
              </button>

              <label className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-xl border border-slate-300 text-xs transition-all cursor-pointer">
                <Upload className="w-4 h-4" />
                กู้คืนข้อมูลสำรองจากเครื่องคอมพิวเตอร์
                <input
                  type="file"
                  accept=".json"
                  onChange={handleBackupImport}
                  className="hidden"
                />
              </label>
            </div>

            <div className="border border-slate-100 bg-slate-50 p-4 rounded-xl text-[11px] text-slate-400 font-medium max-w-md mx-auto text-left mt-8">
              ⚠️ การนำเข้าไฟล์สำรอง (.json) จะเขียนข้อมูลทับฐานข้อมูลเดิมทั้งหมดในเบราว์เซอร์นี้ทันที โปรดใช้เอกสารที่ได้รับจากระบบเท่านั้น
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
